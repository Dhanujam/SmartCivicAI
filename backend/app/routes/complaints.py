import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request, status as http_status

from app.models.complaint import ComplaintResponse, ComplaintStatusUpdate
from app.database import get_complaints_collection, get_next_complaint_id
from app.config import settings
from app.services.gemini import analyze_complaint, GeminiConfigurationError, GeminiAnalysisError
from app.services.auth import get_current_user, get_optional_current_user
from app.services.duplicate import detect_duplicates
from app.services.sla import get_sla_hours, calculate_sla_due_at, enrich_complaint_dict
from app.services.security import (
    scan_prompt_injection,
    sanitize_prompt_text,
    scan_and_sanitize_xss,
    scan_and_mask_pii,
    verify_image_magic_bytes,
    complaint_rate_limiter,
    log_security_event,
)

logger = logging.getLogger("smartcivic.routes.complaints")

router = APIRouter(prefix="/complaints", tags=["Complaints"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


def _check_db_collection():
    collection = get_complaints_collection()
    if collection is None:
        if not settings.MONGODB_URI:
            raise HTTPException(
                status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database not configured. MONGODB_URI is missing in backend/.env.",
            )
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Could not connect to MongoDB Atlas.",
        )
    return collection


def normalize_doc(doc: dict, master_complaint: Optional[dict] = None) -> dict:
    """
    Format MongoDB document into ComplaintResponse compatible structure,
    safely handling legacy documents.
    """
    doc_id = str(doc.pop("_id", ""))
    doc["id"] = doc_id

    # Ensure complaint_id exists
    if not doc.get("complaint_id"):
        doc["complaint_id"] = f"CIV-2026-{doc_id[-6:].upper()}"

    # Normalize legacy status values
    status = doc.get("status", "REQUESTED")
    status_map = {
        "Pending": "REQUESTED",
        "In Progress": "IN_PROGRESS",
        "Resolved": "COMPLETED",
        "Rejected": "REJECTED",
    }
    doc["status"] = status_map.get(status, status)

    # Ensure duplicate fields
    doc["duplicate_found"] = doc.get("duplicate_found", False)
    doc["duplicate_complaint_ids"] = doc.get("duplicate_complaint_ids", [])
    doc["duplicate_details"] = doc.get("duplicate_details", [])

    # Stretch Goal 1: Master / Merged Complaint fields
    doc["is_master_complaint"] = doc.get("is_master_complaint", False)
    doc["master_complaint_id"] = doc.get("master_complaint_id", None)
    doc["master_status"] = doc.get("master_status", None)
    doc["merged_complaint_ids"] = doc.get("merged_complaint_ids", [])
    doc["merged_complaints_details"] = doc.get("merged_complaints_details", [])
    doc["merged_at"] = doc.get("merged_at", None)
    doc["merged_by"] = doc.get("merged_by", None)

    # Ensure updated_at
    if "updated_at" not in doc:
        doc["updated_at"] = doc.get("created_at") or datetime.now(timezone.utc)

    # Stretch Goal 2: Prototype SLA computation and field enrichment
    enrich_complaint_dict(doc, master_complaint=master_complaint)

    # Cybersecurity Module: Security Telemetry Flags
    doc["security_checked"] = doc.get("security_checked", True)
    doc["prompt_injection_detected"] = doc.get("prompt_injection_detected", False)
    doc["xss_neutralized"] = doc.get("xss_neutralized", False)
    doc["pii_redacted"] = doc.get("pii_redacted", False)

    return doc


@router.get("/my", response_model=List[ComplaintResponse])
async def list_my_complaints(
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve all complaints submitted by the logged-in citizen.
    Derives citizen ID strictly from the verified JWT.
    """
    collection = _check_db_collection()
    user_id = current_user["id"]

    cursor = collection.find({"citizen_id": user_id}).sort("created_at", -1)
    complaints = []
    async for doc in cursor:
        m_doc = None
        if doc.get("master_complaint_id"):
            m_doc = await collection.find_one({"complaint_id": doc["master_complaint_id"]})
        clean = normalize_doc(doc, master_complaint=m_doc)
        if m_doc:
            clean["master_status"] = m_doc.get("status", "REQUESTED")
        complaints.append(ComplaintResponse(**clean))

    logger.info("Retrieved %d personal complaints for citizen %s", len(complaints), current_user.get("email"))
    return complaints


@router.get("", response_model=List[ComplaintResponse])
async def list_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    limit: int = 50,
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    """
    List complaints endpoint.
    If ADMIN: returns all complaints.
    If CITIZEN: returns only their personal complaints.
    If unauthenticated: returns public complaints list.
    """
    collection = _check_db_collection()

    query = {}
    if current_user and current_user.get("role") == "CITIZEN":
        query["citizen_id"] = current_user["id"]

    if status:
        if status in ["REQUESTED", "Pending"]:
            query["status"] = {"$in": ["REQUESTED", "Pending"]}
        elif status in ["IN_PROGRESS", "In Progress"]:
            query["status"] = {"$in": ["IN_PROGRESS", "In Progress"]}
        elif status in ["COMPLETED", "Resolved"]:
            query["status"] = {"$in": ["COMPLETED", "Resolved"]}
        elif status in ["REJECTED", "Rejected"]:
            query["status"] = {"$in": ["REJECTED", "Rejected"]}
        else:
            query["status"] = status

    if category:
        query["ai_analysis.category"] = category
    if urgency:
        query["ai_analysis.urgency"] = urgency

    cursor = collection.find(query).sort("created_at", -1).limit(limit)
    complaints = []
    async for doc in cursor:
        clean = normalize_doc(doc)
        complaints.append(ComplaintResponse(**clean))
    return complaints


@router.post("", response_model=ComplaintResponse, status_code=http_status.HTTP_201_CREATED)
async def submit_complaint(
    request: Request,
    description: str = Form(..., description="Detailed description of civic issue"),
    citizen_name: Optional[str] = Form("Anonymous"),
    citizen_contact: Optional[str] = Form(None),
    location_address: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    """
    Citizen complaint submission endpoint.
    Protected by Cybersecurity Shield:
    - Sliding-window rate limiting & abuse mitigation
    - Anti-XSS and dangerous script sanitization
    - AI Prompt Injection & LLM jailbreak firewall
    - Deep binary magic-bytes image upload inspection
    - Automated citizen PII masking (DPDP/GDPR compliance)
    - Multimodal Gemini AI triage, duplicate detection, and SLA calculation
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_id = current_user.get("id") if current_user else None
    rate_key = user_id or client_ip

    # 1. Rate Limiting Check
    allowed, remaining, reset_sec = complaint_rate_limiter.is_allowed(rate_key, max_requests=25, window_seconds=60)
    if not allowed:
        await log_security_event(
            event_type="RATE_LIMIT_EXCEEDED",
            severity="MEDIUM",
            details=f"Complaint submission rate limit triggered for {rate_key}",
            client_ip=client_ip,
            user_id=user_id,
            endpoint="/api/complaints",
            mitigation="HTTP_429_TOO_MANY_REQUESTS",
        )
        raise HTTPException(
            status_code=http_status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please wait {reset_sec} seconds before submitting again.",
        )

    description_clean = description.strip() if description else ""
    if not description_clean:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Complaint description cannot be empty.",
        )

    # 2. XSS & Dangerous HTML Sanitization
    clean_desc, has_xss, xss_patterns = scan_and_sanitize_xss(description_clean)
    if has_xss:
        await log_security_event(
            event_type="XSS_PAYLOAD_NEUTRALIZED",
            severity="HIGH",
            details=f"XSS payload intercepted in complaint description: {xss_patterns}",
            client_ip=client_ip,
            user_id=user_id,
            endpoint="/api/complaints",
            mitigation="HTML_STRIPPED_AND_ENTITIES_ENCODED",
        )
    description_clean = clean_desc

    # 3. AI Prompt Injection Defense
    is_injection, injection_score, injection_patterns = scan_prompt_injection(description_clean)
    if is_injection:
        await log_security_event(
            event_type="PROMPT_INJECTION_ATTEMPT",
            severity="HIGH",
            details=f"Prompt injection pattern detected (Risk score {injection_score}): {injection_patterns}",
            client_ip=client_ip,
            user_id=user_id,
            endpoint="/api/complaints",
            mitigation="PROMPT_DIRECTIVES_NEUTRALIZED_AND_ISOLATED",
        )
        description_clean = sanitize_prompt_text(description_clean)

    # 4. PII Detection and Privacy Protection
    masked_desc, pii_found, pii_items = scan_and_mask_pii(description_clean)
    if pii_found:
        await log_security_event(
            event_type="PII_DETECTED_REDACTED",
            severity="MEDIUM",
            details=f"Sensitive citizen PII automatically masked: {[i['type'] for i in pii_items]}",
            client_ip=client_ip,
            user_id=user_id,
            endpoint="/api/complaints",
            mitigation="PII_DIGITS_MASKED_FOR_PRIVACY",
        )
        description_clean = masked_desc

    image_bytes: Optional[bytes] = None
    image_mime_type: Optional[str] = None
    image_url: Optional[str] = None

    # Validate and persist uploaded image if present
    if image is not None and image.filename:
        content_type = (image.content_type or "").lower().strip()
        file_ext = os.path.splitext(image.filename)[1].lower()

        if content_type not in ALLOWED_MIME_TYPES and file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image type '{content_type or file_ext}'. Supported formats: JPEG, PNG, WEBP, GIF, HEIC.",
            )

        image_bytes = await image.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty (0 bytes).",
            )
        if len(image_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Image size exceeds the maximum allowed limit of {MAX_IMAGE_SIZE // (1024 * 1024)}MB.",
            )

        image_mime_type = content_type if content_type in ALLOWED_MIME_TYPES else "image/jpeg"

        # 5. Deep Binary Magic Bytes Inspection
        is_valid_magic, magic_msg = verify_image_magic_bytes(image_bytes, image_mime_type)
        if not is_valid_magic:
            await log_security_event(
                event_type="MALICIOUS_FILE_BLOCKED",
                severity="CRITICAL",
                details=f"Blocked uploaded file binary mismatch: {magic_msg} (file: {image.filename})",
                client_ip=client_ip,
                user_id=user_id,
                endpoint="/api/complaints",
                mitigation="REJECTED_WITH_HTTP_400",
            )
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Security check failed: {magic_msg}",
            )

        raw_name = os.path.basename(image.filename)
        clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", raw_name)
        unique_filename = f"{uuid.uuid4().hex}_{clean_name}"
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, unique_filename)

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        image_url = f"/uploads/{unique_filename}"
        logger.info("Persisted uploaded image to %s", file_path)

    # 6. Run Gemini multimodal AI analysis
    try:
        ai_analysis = await analyze_complaint(
            description=description_clean,
            location=location_address,
            image_bytes=image_bytes,
            image_mime_type=image_mime_type,
        )
    except GeminiConfigurationError as e:
        logger.error("Gemini configuration error: %s", str(e))
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except GeminiAnalysisError as e:
        logger.error("Gemini analysis error: %s", str(e))
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Unexpected error during Gemini analysis: %s", str(e))
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during AI triage: {str(e)}",
        )

    # 2. Verify MongoDB collection availability
    collection = _check_db_collection()

    # 3. Generate unique human-readable Complaint ID (e.g. CIV-2026-000001)
    complaint_id = await get_next_complaint_id()

    # 4. Link citizen_id from authenticated user
    citizen_id = current_user["id"] if current_user else None
    resolved_citizen_name = citizen_name.strip() if citizen_name else "Anonymous"
    if resolved_citizen_name == "Anonymous" and current_user and current_user.get("name"):
        resolved_citizen_name = current_user["name"]

    # 5. Execute Duplicate Complaint Detection
    duplicate_found, duplicate_ids, duplicate_details = await detect_duplicates(
        complaints_collection=collection,
        new_description=description_clean,
        new_category=ai_analysis.category,
        new_location_address=location_address,
        new_latitude=latitude,
        new_longitude=longitude,
    )

    # 6. Calculate prototype SLA based on Gemini urgency
    now = datetime.now(timezone.utc)
    sla_hours = get_sla_hours(ai_analysis.urgency)
    sla_due_at = calculate_sla_due_at(now, ai_analysis.urgency)

    # 7. Assemble MongoDB complaint document
    complaint_doc = {
        "complaint_id": complaint_id,
        "citizen_id": citizen_id,
        "description": description_clean,
        "citizen_name": resolved_citizen_name,
        "citizen_contact": citizen_contact.strip() if citizen_contact else None,
        "location_address": location_address.strip() if location_address else None,
        "latitude": latitude,
        "longitude": longitude,
        "image_url": image_url,
        "status": "REQUESTED",
        "duplicate_found": duplicate_found,
        "duplicate_complaint_ids": duplicate_ids,
        "duplicate_details": duplicate_details,
        "ai_analysis": ai_analysis.model_dump(),
        "created_at": now,
        "updated_at": now,
        "sla_hours": sla_hours,
        "sla_due_at": sla_due_at,
        "sla_status": "WITHIN_SLA",
        "sla_breached_at": None,
        # Cybersecurity Module: Security Telemetry & Privacy Flags
        "security_checked": True,
        "prompt_injection_detected": is_injection,
        "xss_neutralized": has_xss,
        "pii_redacted": pii_found,
    }

    try:
        insert_result = await collection.insert_one(complaint_doc)
        complaint_doc["id"] = str(insert_result.inserted_id)
        if "_id" in complaint_doc:
            del complaint_doc["_id"]
        logger.info(
            "Complaint successfully created with ID %s (complaint_id: %s, citizen_id: %s, sla_hours: %d)",
            complaint_doc["id"],
            complaint_id,
            citizen_id,
            sla_hours,
        )
    except Exception as e:
        logger.error("Failed to insert complaint into MongoDB Atlas: %s", str(e))
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save complaint to MongoDB Atlas: {str(e)}",
        )

    # Enrich with live SLA display metrics before returning
    enrich_complaint_dict(complaint_doc, now=now)
    return ComplaintResponse(**complaint_doc)


@router.get("/{complaint_id}", response_model=ComplaintResponse)
async def get_complaint(
    complaint_id: str,
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    """
    Retrieve single complaint details by human-readable complaint_id or ObjectId.
    Citizens can view their own complaints or master complaints that their complaint was merged into.
    Government Officials can view any complaint.
    """
    collection = _check_db_collection()

    doc = await collection.find_one({"complaint_id": complaint_id})
    if not doc and ObjectId.is_valid(complaint_id):
        try:
            doc = await collection.find_one({"_id": ObjectId(complaint_id)})
        except Exception:
            pass

    if not doc:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with identifier '{complaint_id}' was not found.",
        )

    # Authorization check:
    # If caller is logged-in citizen and the complaint has a citizen_id:
    # only the owner, an owner of a linked merged complaint, or an ADMIN can view it!
    doc_citizen_id = doc.get("citizen_id")
    is_merged_owner = False

    if doc_citizen_id:
        if not current_user:
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view this complaint.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if current_user.get("role") != "ADMIN" and current_user.get("id") != doc_citizen_id:
            # Check if current user owns a complaint that was merged into this master complaint
            if doc.get("is_master_complaint") or doc.get("merged_complaint_ids"):
                merged_owned = await collection.find_one({
                    "citizen_id": current_user.get("id"),
                    "master_complaint_id": doc.get("complaint_id"),
                })
                if merged_owned:
                    is_merged_owner = True

            if not is_merged_owner:
                logger.warning(
                    "Citizen %s attempted unauthorized access to complaint %s owned by %s",
                    current_user.get("email"),
                    complaint_id,
                    doc_citizen_id,
                )
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: You can only view your own complaints or linked master civic issues.",
                )

    # Privacy Protection: If citizen is viewing master complaint submitted by another citizen,
    # sanitize submitter identity to preserve privacy
    if is_merged_owner and current_user and current_user.get("id") != doc_citizen_id:
        doc["citizen_name"] = "Registered Citizen"
        doc["citizen_contact"] = None

    # If this complaint is merged, populate master's real-time status and SLA
    m_doc = None
    if doc.get("master_complaint_id"):
        m_doc = await collection.find_one({"complaint_id": doc["master_complaint_id"]})

    was_breached_in_db = bool(doc.get("sla_breached_at"))
    clean = normalize_doc(doc, master_complaint=m_doc)
    if clean.get("sla_status") == "BREACHED" and not was_breached_in_db:
        await collection.update_one(
            {"complaint_id": clean["complaint_id"]},
            {"$set": {"sla_breached_at": clean["sla_breached_at"]}},
        )

    if m_doc:
        clean["master_status"] = m_doc.get("status", "REQUESTED")

    return ComplaintResponse(**clean)


@router.patch("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    update: ComplaintStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Update complaint resolution status.
    Protected: Only Government Officials (ADMIN) can update status.
    Merged complaints cannot be updated directly.
    """
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only Government Officials can update complaint status.",
        )

    collection = _check_db_collection()

    existing = await collection.find_one({"complaint_id": complaint_id})
    if not existing and ObjectId.is_valid(complaint_id):
        existing = await collection.find_one({"_id": ObjectId(complaint_id)})

    if not existing:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint '{complaint_id}' not found.",
        )

    if existing.get("status") == "MERGED":
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status of a merged complaint directly. Update master complaint '{existing.get('master_complaint_id')}' instead.",
        )

    new_status = update.status
    status_map = {
        "Pending": "REQUESTED",
        "In Progress": "IN_PROGRESS",
        "Resolved": "COMPLETED",
        "Rejected": "REJECTED",
    }
    normalized_status = status_map.get(new_status, new_status)

    now = datetime.now(timezone.utc)
    update_data = {
        "status": normalized_status,
        "updated_at": now,
    }
    if update.admin_notes:
        update_data["admin_notes"] = update.admin_notes

    query = {"complaint_id": existing.get("complaint_id", complaint_id)}
    await collection.update_one(query, {"$set": update_data})

    return {
        "message": "Status updated successfully",
        "complaint_id": existing.get("complaint_id", complaint_id),
        "status": normalized_status,
    }
