import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status as http_status

from app.models.complaint import (
    ComplaintResponse,
    ComplaintStatusUpdate,
    ComplaintMergeRequest,
    ComplaintMergeResponse,
)
from app.database import get_complaints_collection
from app.services.auth import require_admin
from app.services.sla import enrich_complaint_dict

logger = logging.getLogger("smartcivic.routes.admin")

router = APIRouter(prefix="/admin", tags=["Government Official"])


def normalize_doc(doc: dict, master_complaint: Optional[dict] = None) -> dict:
    """
    Format MongoDB document into ComplaintResponse compatible structure,
    safely handling legacy documents and dynamically computing prototype SLA.
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

    # Stretch Goal 2: SLA Computation & Enrichment
    enrich_complaint_dict(doc, master_complaint=master_complaint)

    return doc


@router.get("/complaints", response_model=List[ComplaintResponse])
async def get_all_complaints_admin(
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    department: Optional[str] = None,
    urgency: Optional[str] = None,
    sla_status: Optional[str] = None,
    sort_by: Optional[str] = "priority",
    limit: int = 200,
    admin_user: dict = Depends(require_admin),
):
    """
    Government Official endpoint: Retrieve ALL citizen complaints across the municipality
    with advanced filters and sorting, including prototype SLA status filtering.
    """
    collection = get_complaints_collection()
    if collection is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    query = {}

    # Status filter (handles both new and legacy statuses)
    if status and status != "ALL":
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

    # Category filter
    if category and category != "ALL":
        query["ai_analysis.category"] = category

    # Department filter
    if department and department != "ALL":
        query["ai_analysis.department"] = department

    # Urgency filter
    if urgency and urgency != "ALL":
        query["ai_analysis.urgency"] = urgency

    # Free text search
    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"complaint_id": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}},
            {"citizen_name": {"$regex": term, "$options": "i"}},
            {"location_address": {"$regex": term, "$options": "i"}},
            {"ai_analysis.problem_summary": {"$regex": term, "$options": "i"}},
            {"ai_analysis.department": {"$regex": term, "$options": "i"}},
        ]

    # Sorting
    sort_spec = [("created_at", -1)]
    if sort_by == "priority":
        sort_spec = [("ai_analysis.priority_score", -1), ("created_at", -1)]
    elif sort_by == "newest":
        sort_spec = [("created_at", -1)]
    elif sort_by == "oldest":
        sort_spec = [("created_at", 1)]

    cursor = collection.find(query).sort(sort_spec).limit(limit)
    raw_docs = []
    master_ids = []
    async for doc in cursor:
        raw_docs.append(doc)
        if doc.get("master_complaint_id"):
            master_ids.append(doc["master_complaint_id"])

    # Load master complaints to follow SLA for merged items
    master_docs = {}
    if master_ids:
        async for m in collection.find({"complaint_id": {"$in": list(set(master_ids))}}):
            master_docs[m.get("complaint_id")] = m

    normalized_sla_filter = (
        sla_status.strip().upper().replace(" ", "_")
        if (sla_status and sla_status.upper() != "ALL")
        else None
    )

    complaints = []
    for doc in raw_docs:
        was_breached_in_db = bool(doc.get("sla_breached_at"))
        m_doc = master_docs.get(doc.get("master_complaint_id"))
        clean = normalize_doc(doc, master_complaint=m_doc)

        # Check and persist breach timestamp if first detected
        if clean.get("sla_status") == "BREACHED" and not was_breached_in_db:
            await collection.update_one(
                {"complaint_id": clean["complaint_id"]},
                {"$set": {"sla_breached_at": clean["sla_breached_at"]}},
            )

        # Apply SLA filter dynamically if requested
        if normalized_sla_filter and clean.get("sla_status") != normalized_sla_filter:
            continue

        complaints.append(ComplaintResponse(**clean))

    logger.info("Admin %s retrieved %d complaints (filtered by SLA: %s)", admin_user.get("email"), len(complaints), sla_status)
    return complaints


@router.get("/sla-alerts", response_model=List[ComplaintResponse])
async def get_sla_alerts_admin(
    limit: int = 10,
    admin_user: dict = Depends(require_admin),
):
    """
    Government Official endpoint: Retrieve highest-priority SLA alerts (BREACHED and DUE_SOON).
    Sorted by priority_score DESC, then sla_due_at ASC.
    Strictly forbidden to citizens (returns 403 Forbidden).
    """
    collection = get_complaints_collection()
    if collection is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    # Fetch active complaints that are not closed (COMPLETED/REJECTED)
    cursor = collection.find({
        "status": {"$nin": ["COMPLETED", "Resolved", "REJECTED", "Rejected"]}
    })

    raw_docs = []
    master_ids = []
    async for d in cursor:
        raw_docs.append(d)
        if d.get("master_complaint_id"):
            master_ids.append(d["master_complaint_id"])

    master_docs = {}
    if master_ids:
        async for m in collection.find({"complaint_id": {"$in": list(set(master_ids))}}):
            master_docs[m.get("complaint_id")] = m

    alerts = []
    for doc in raw_docs:
        was_breached_in_db = bool(doc.get("sla_breached_at"))
        m_doc = master_docs.get(doc.get("master_complaint_id"))
        clean = normalize_doc(doc, master_complaint=m_doc)
        if clean.get("sla_status") in ["BREACHED", "DUE_SOON"]:
            if clean.get("sla_status") == "BREACHED" and not was_breached_in_db:
                await collection.update_one(
                    {"complaint_id": clean["complaint_id"]},
                    {"$set": {"sla_breached_at": clean["sla_breached_at"]}},
                )
            alerts.append(clean)

    def alert_sort_key(c):
        score = (c.get("ai_analysis") or {}).get("priority_score", 0)
        due = c.get("sla_due_at")
        due_ts = due.timestamp() if (due and hasattr(due, "timestamp")) else 9999999999.0
        # Priority score descending (-score), then earliest due date ascending (+due_ts)
        return (-score, due_ts)

    alerts.sort(key=alert_sort_key)
    logger.info("Admin %s fetched %d SLA alerts", admin_user.get("email"), len(alerts))
    return [ComplaintResponse(**c) for c in alerts[:limit]]


@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
async def get_admin_complaint_details(
    complaint_id: str,
    admin_user: dict = Depends(require_admin),
):
    """
    Government Official endpoint: Retrieve full details of any complaint by complaint_id or ObjectId.
    Includes full prototype SLA state.
    """
    collection = get_complaints_collection()
    if collection is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    # Search by complaint_id first, then fallback to ObjectId
    doc = await collection.find_one({"complaint_id": complaint_id})
    if not doc and ObjectId.is_valid(complaint_id):
        try:
            doc = await collection.find_one({"_id": ObjectId(complaint_id)})
        except Exception:
            pass

    if not doc:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' was not found.",
        )

    # Load master complaint if merged to follow master SLA
    m_doc = None
    if doc.get("master_complaint_id"):
        m_doc = await collection.find_one({"complaint_id": doc["master_complaint_id"]})

    was_breached_in_db = bool(doc.get("sla_breached_at"))
    clean = normalize_doc(doc, master_complaint=m_doc)

    # Record first detected breach timestamp if needed
    if clean.get("sla_status") == "BREACHED" and not was_breached_in_db:
        await collection.update_one(
            {"complaint_id": clean["complaint_id"]},
            {"$set": {"sla_breached_at": clean["sla_breached_at"]}},
        )

    # Populate master status if this is a merged complaint
    if m_doc:
        clean["master_status"] = m_doc.get("status", "REQUESTED")

    # Populate merged complaints details if this is a master complaint
    if clean.get("is_master_complaint") and clean.get("merged_complaint_ids"):
        merged_cursor = collection.find({"complaint_id": {"$in": clean.get("merged_complaint_ids", [])}})
        merged_items = []
        async for item_doc in merged_cursor:
            item_clean = normalize_doc(item_doc, master_complaint=clean)
            merged_items.append({
                "complaint_id": item_clean.get("complaint_id"),
                "description": item_clean.get("description"),
                "problem_summary": (
                    item_clean.get("ai_analysis", {}).get("problem_summary")
                    or item_clean.get("description", "")[:120]
                ),
                "citizen_name": item_clean.get("citizen_name", "Anonymous"),
                "category": item_clean.get("ai_analysis", {}).get("category", "Other"),
                "status": item_clean.get("status", "MERGED"),
                "sla_status": item_clean.get("sla_status", "WITHIN_SLA"),
                "created_at": item_clean.get("created_at").isoformat() if item_clean.get("created_at") else None,
            })
        clean["merged_complaints_details"] = merged_items

    return ComplaintResponse(**clean)


@router.patch("/complaints/{complaint_id}/status")
async def update_complaint_status_admin(
    complaint_id: str,
    update: ComplaintStatusUpdate,
    admin_user: dict = Depends(require_admin),
):
    """
    Government Official endpoint: Update resolution status of a complaint.
    Strictly forbidden to citizens.
    Merged complaints cannot be independently updated.
    """
    collection = get_complaints_collection()
    if collection is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    # Find existing complaint first
    existing = await collection.find_one({"complaint_id": complaint_id})
    if not existing and ObjectId.is_valid(complaint_id):
        existing = await collection.find_one({"_id": ObjectId(complaint_id)})

    if not existing:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Complaint '{complaint_id}' not found.",
        )

    # Prevent independent status update if complaint is MERGED
    if existing.get("status") == "MERGED":
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status of a merged complaint directly. Update master complaint '{existing.get('master_complaint_id')}' instead.",
        )

    # Normalize status to standard values
    new_status = update.status
    status_map = {
        "Pending": "REQUESTED",
        "In Progress": "IN_PROGRESS",
        "Resolved": "COMPLETED",
        "Rejected": "REJECTED",
    }
    normalized_status = status_map.get(new_status, new_status)

    now = datetime.now(timezone.utc)
    update_fields = {
        "status": normalized_status,
        "updated_at": now,
    }
    if update.admin_notes:
        update_fields["admin_notes"] = update.admin_notes

    # Update by complaint_id
    query = {"complaint_id": existing.get("complaint_id", complaint_id)}
    await collection.update_one(query, {"$set": update_fields})

    logger.info(
        "Admin %s updated complaint %s status to %s",
        admin_user.get("email"),
        complaint_id,
        normalized_status,
    )

    return {
        "message": "Status updated successfully",
        "complaint_id": existing.get("complaint_id", complaint_id),
        "status": normalized_status,
        "updated_at": now.isoformat(),
    }


@router.post("/complaints/{master_complaint_id}/merge", response_model=ComplaintMergeResponse)
async def merge_complaints_admin(
    master_complaint_id: str,
    merge_req: ComplaintMergeRequest,
    admin_user: dict = Depends(require_admin),
):
    """
    Government Official endpoint: Merge duplicate citizen complaints into one MASTER complaint.
    Strictly forbidden to citizens (returns 403 Forbidden).
    """
    collection = get_complaints_collection()
    if collection is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    # 1. Verify master complaint exists
    master_doc = await collection.find_one({"complaint_id": master_complaint_id})
    if not master_doc and ObjectId.is_valid(master_complaint_id):
        master_doc = await collection.find_one({"_id": ObjectId(master_complaint_id)})

    if not master_doc:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"Master complaint '{master_complaint_id}' was not found.",
        )

    resolved_master_id = master_doc.get("complaint_id")

    # 2. Check that master complaint is not already merged
    if master_doc.get("status") == "MERGED" or master_doc.get("master_complaint_id"):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Complaint '{resolved_master_id}' is already merged into '{master_doc.get('master_complaint_id')}' and cannot act as a master complaint.",
        )

    # 3. Clean and validate duplicate complaint IDs
    raw_duplicates = merge_req.duplicate_complaint_ids
    if not raw_duplicates:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least one duplicate complaint ID to merge.",
        )

    # Prevent duplicate IDs from being repeated
    unique_duplicates = list(dict.fromkeys(raw_duplicates))

    # 4. Do not allow master complaint itself to be included in duplicate IDs
    if resolved_master_id in unique_duplicates or str(master_doc.get("_id")) in unique_duplicates:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Master complaint itself cannot be included in duplicate IDs to merge.",
        )

    # 5. Validate each duplicate complaint
    master_category = master_doc.get("ai_analysis", {}).get("category")
    master_reported_duplicates = set(master_doc.get("duplicate_complaint_ids", []))
    verified_duplicate_ids = []

    for dup_id in unique_duplicates:
        dup_doc = await collection.find_one({"complaint_id": dup_id})
        if not dup_doc and ObjectId.is_valid(dup_id):
            dup_doc = await collection.find_one({"_id": ObjectId(dup_id)})

        if not dup_doc:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Duplicate complaint '{dup_id}' does not exist.",
            )

        resolved_dup_id = dup_doc.get("complaint_id")

        # 5a. Do not merge a complaint that is already merged into another master
        if dup_doc.get("status") == "MERGED" or dup_doc.get("master_complaint_id"):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Complaint '{resolved_dup_id}' is already merged into master complaint '{dup_doc.get('master_complaint_id')}'.",
            )

        # 5b. Do not merge COMPLETED complaints
        if dup_doc.get("status") in ["COMPLETED", "Resolved"]:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Completed complaint '{resolved_dup_id}' cannot be merged.",
            )

        # 5c. Do not merge if it is already a master complaint with merged children
        if dup_doc.get("is_master_complaint") and dup_doc.get("merged_complaint_ids"):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Complaint '{resolved_dup_id}' is already a master complaint and cannot be merged into another master.",
            )

        # 5d. Validate relationship: potential duplicate or matching category
        cand_reported_duplicates = set(dup_doc.get("duplicate_complaint_ids", []))
        is_detected_duplicate = (
            resolved_dup_id in master_reported_duplicates
            or resolved_master_id in cand_reported_duplicates
        )
        dup_category = dup_doc.get("ai_analysis", {}).get("category")
        is_same_category = bool(master_category and dup_category and master_category == dup_category)

        if not (is_detected_duplicate or is_same_category):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Complaint '{resolved_dup_id}' is neither an algorithmic duplicate nor does it share category '{master_category}' with master complaint.",
            )

        verified_duplicate_ids.append(resolved_dup_id)

    # 6. Perform Safe sequential updates
    now = datetime.now(timezone.utc)
    admin_id = str(admin_user.get("id"))

    # Update master complaint
    await collection.update_one(
        {"complaint_id": resolved_master_id},
        {
            "$set": {
                "is_master_complaint": True,
                "updated_at": now,
            },
            "$addToSet": {
                "merged_complaint_ids": {"$each": verified_duplicate_ids}
            },
        },
    )

    # Update all duplicates
    for dup_id in verified_duplicate_ids:
        await collection.update_one(
            {"complaint_id": dup_id},
            {
                "$set": {
                    "status": "MERGED",
                    "is_master_complaint": False,
                    "master_complaint_id": resolved_master_id,
                    "merged_at": now,
                    "merged_by": admin_id,
                    "updated_at": now,
                }
            },
        )

    logger.info(
        "Admin %s merged duplicates %s into master complaint %s",
        admin_user.get("email"),
        verified_duplicate_ids,
        resolved_master_id,
    )

    return ComplaintMergeResponse(
        success=True,
        master_complaint_id=resolved_master_id,
        merged_complaint_ids=verified_duplicate_ids,
        message="Complaints merged successfully",
    )
