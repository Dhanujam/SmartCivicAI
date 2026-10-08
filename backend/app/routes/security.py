import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Request, status as http_status
from pydantic import BaseModel, Field

from app.database import get_database
from app.services.auth import require_admin
from app.services.security import (
    scan_prompt_injection,
    sanitize_prompt_text,
    scan_and_sanitize_xss,
    scan_and_mask_pii,
    verify_image_magic_bytes,
    log_security_event,
)

logger = logging.getLogger("smartcivic.routes.security")

router = APIRouter(tags=["Cybersecurity"])


class SecurityPayloadTestRequest(BaseModel):
    payload_type: str = Field(..., description="PROMPT_INJECTION, XSS, PII, or MAGIC_BYTES")
    test_content: str = Field(..., description="Content string or description to inspect")


class SecurityPayloadTestResponse(BaseModel):
    threat_detected: bool
    threat_score: int
    threat_type: str
    detected_patterns: List[str]
    original_preview: str
    neutralized_content: str
    mitigation_action: str
    audit_logged: bool


@router.get("/security/status")
async def get_security_status():
    """
    Public telemetry endpoint exposing operational status of the SmartCivic AI
    Cybersecurity Defense Matrix.
    """
    db = get_database()
    recent_critical_count = 0
    threat_level = "NORMAL"

    if db is not None:
        try:
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            recent_critical_count = await db["security_audit_logs"].count_documents({
                "severity": {"$in": ["CRITICAL", "HIGH"]},
                "timestamp": {"$gte": one_hour_ago},
            })
            if recent_critical_count >= 10:
                threat_level = "SEVERE"
            elif recent_critical_count >= 5:
                threat_level = "ELEVATED"
            elif recent_critical_count >= 1:
                threat_level = "GUARDED"
        except Exception:
            pass

    return {
        "status": "active",
        "shield_version": "1.0.0",
        "threat_level": threat_level,
        "recent_critical_threats": recent_critical_count,
        "active_defenses": {
            "ai_prompt_firewall": "ACTIVE",
            "xss_input_sanitizer": "ACTIVE",
            "magic_bytes_inspector": "ACTIVE",
            "adaptive_rate_limiter": "ACTIVE",
            "pii_redaction_engine": "ACTIVE",
            "rbac_token_isolation": "ACTIVE",
            "security_headers": "ACTIVE",
        },
        "last_health_check": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/admin/security/metrics")
async def get_security_metrics(admin_user: dict = Depends(require_admin)):
    """
    Government Official endpoint: Aggregated cybersecurity KPIs, incident breakdown,
    and active threat posture.
    """
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable for security metrics.",
        )

    logs_col = db["security_audit_logs"]

    total_incidents = await logs_col.count_documents({})
    prompt_injections = await logs_col.count_documents({"event_type": "PROMPT_INJECTION_ATTEMPT"})
    xss_neutralized = await logs_col.count_documents({"event_type": "XSS_PAYLOAD_NEUTRALIZED"})
    malicious_files = await logs_col.count_documents({"event_type": "MALICIOUS_FILE_BLOCKED"})
    rate_limits = await logs_col.count_documents({"event_type": "RATE_LIMIT_EXCEEDED"})
    pii_redacted = await logs_col.count_documents({"event_type": "PII_DETECTED_REDACTED"})
    failed_auth = await logs_col.count_documents({"event_type": "FAILED_LOGIN_ATTEMPT"})

    # Severity counts
    critical_count = await logs_col.count_documents({"severity": "CRITICAL"})
    high_count = await logs_col.count_documents({"severity": "HIGH"})
    medium_count = await logs_col.count_documents({"severity": "MEDIUM"})
    low_count = await logs_col.count_documents({"severity": "LOW"})
    info_count = await logs_col.count_documents({"severity": "INFO"})

    # Determine dynamic threat level
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_critical = await logs_col.count_documents({
        "severity": {"$in": ["CRITICAL", "HIGH"]},
        "timestamp": {"$gte": one_hour_ago},
    })
    if recent_critical >= 10:
        threat_level = "SEVERE"
    elif recent_critical >= 5:
        threat_level = "ELEVATED"
    elif recent_critical >= 1:
        threat_level = "GUARDED"
    else:
        threat_level = "NORMAL"

    # Recent 10 incidents
    cursor = logs_col.find({}).sort("timestamp", -1).limit(10)
    recent_incidents = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id", ""))
        if "timestamp" in doc and hasattr(doc["timestamp"], "isoformat"):
            doc["timestamp"] = doc["timestamp"].isoformat()
        recent_incidents.append(doc)

    return {
        "threat_level": threat_level,
        "total_incidents": total_incidents,
        "kpis": {
            "prompt_injections_blocked": prompt_injections,
            "xss_attacks_neutralized": xss_neutralized,
            "malicious_files_blocked": malicious_files,
            "rate_limits_enforced": rate_limits,
            "pii_records_redacted": pii_redacted,
            "failed_auth_attempts": failed_auth,
        },
        "severity_breakdown": {
            "CRITICAL": critical_count,
            "HIGH": high_count,
            "MEDIUM": medium_count,
            "LOW": low_count,
            "INFO": info_count,
        },
        "recent_incidents": recent_incidents,
    }


@router.get("/admin/security/logs")
async def get_security_logs(
    severity: Optional[str] = Query(None, description="Filter by CRITICAL, HIGH, MEDIUM, LOW, INFO"),
    event_type: Optional[str] = Query(None, description="Filter by specific event type"),
    search: Optional[str] = Query(None, description="Search keyword in details or client IP"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin_user: dict = Depends(require_admin),
):
    """
    Government Official endpoint: Filterable, paginated audit log feed of security events.
    """
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable.",
        )

    logs_col = db["security_audit_logs"]
    query: Dict[str, Any] = {}

    if severity and severity.upper() != "ALL":
        query["severity"] = severity.upper()

    if event_type and event_type.upper() != "ALL":
        query["event_type"] = event_type.strip()

    if search:
        query["$or"] = [
            {"details": {"$regex": search, "$options": "i"}},
            {"client_ip": {"$regex": search, "$options": "i"}},
            {"endpoint": {"$regex": search, "$options": "i"}},
        ]

    total_matching = await logs_col.count_documents(query)
    cursor = logs_col.find(query).sort("timestamp", -1).skip(skip).limit(limit)

    logs = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id", ""))
        if "timestamp" in doc and hasattr(doc["timestamp"], "isoformat"):
            doc["timestamp"] = doc["timestamp"].isoformat()
        logs.append(doc)

    return {
        "total": total_matching,
        "limit": limit,
        "skip": skip,
        "logs": logs,
    }


@router.post("/admin/security/test-payload", response_model=SecurityPayloadTestResponse)
async def test_security_payload(
    body: SecurityPayloadTestRequest,
    request: Request,
    admin_user: dict = Depends(require_admin),
):
    """
    Interactive Penetration Test / Attack Vector Simulator:
    Allows government officials and hackathon judges to verify defenses live.
    """
    p_type = body.payload_type.upper().strip()
    raw = body.test_content
    client_ip = request.client.host if request.client else "127.0.0.1"

    threat_detected = False
    threat_score = 0
    detected_patterns = []
    neutralized = raw
    mitigation_action = "NO_ACTION_REQUIRED"

    if p_type == "PROMPT_INJECTION":
        is_threat, score, patterns = scan_prompt_injection(raw)
        threat_detected = is_threat
        threat_score = score
        detected_patterns = patterns
        if is_threat:
            neutralized = sanitize_prompt_text(raw)
            mitigation_action = "PROMPT_DIRECTIVES_NEUTRALIZED_AND_ISOLATED"
            await log_security_event(
                event_type="PROMPT_INJECTION_ATTEMPT",
                severity="HIGH",
                details=f"Interactive test: Detected prompt injection patterns {patterns}",
                client_ip=client_ip,
                user_email=admin_user.get("email"),
                endpoint="/admin/security/test-payload",
                mitigation=mitigation_action,
            )

    elif p_type == "XSS":
        cleaned, has_xss, patterns = scan_and_sanitize_xss(raw)
        threat_detected = has_xss
        threat_score = 80 if has_xss else 0
        detected_patterns = patterns
        neutralized = cleaned
        if has_xss:
            mitigation_action = "HTML_STRIPPED_AND_ENTITIES_ENCODED"
            await log_security_event(
                event_type="XSS_PAYLOAD_NEUTRALIZED",
                severity="HIGH",
                details=f"Interactive test: XSS payload stripped: {patterns}",
                client_ip=client_ip,
                user_email=admin_user.get("email"),
                endpoint="/admin/security/test-payload",
                mitigation=mitigation_action,
            )

    elif p_type == "PII":
        masked, found, items = scan_and_mask_pii(raw)
        threat_detected = found
        threat_score = 50 if found else 0
        detected_patterns = [f"{i['type']}: {i['preview']}" for i in items]
        neutralized = masked
        if found:
            mitigation_action = "PII_DIGITS_MASKED_FOR_PRIVACY"
            await log_security_event(
                event_type="PII_DETECTED_REDACTED",
                severity="MEDIUM",
                details=f"Interactive test: Redacted {len(items)} sensitive citizen identifiers",
                client_ip=client_ip,
                user_email=admin_user.get("email"),
                endpoint="/admin/security/test-payload",
                mitigation=mitigation_action,
            )

    elif p_type == "MAGIC_BYTES":
        # Simulate binary check on string
        byte_data = raw.encode("utf-8")
        is_valid, msg = verify_image_magic_bytes(byte_data, "image/jpeg")
        threat_detected = not is_valid
        threat_score = 90 if not is_valid else 0
        detected_patterns = [msg]
        neutralized = "[BINARY_PAYLOAD_BLOCKED]" if not is_valid else "[VALID_IMAGE_BYTES]"
        mitigation_action = "REJECTED_WITH_HTTP_400" if not is_valid else "PASSED_VERIFICATION"
        if not is_valid:
            await log_security_event(
                event_type="MALICIOUS_FILE_BLOCKED",
                severity="CRITICAL",
                details=f"Interactive test: File magic bytes validation failed: {msg}",
                client_ip=client_ip,
                user_email=admin_user.get("email"),
                endpoint="/admin/security/test-payload",
                mitigation=mitigation_action,
            )

    else:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown payload type '{p_type}'. Supported: PROMPT_INJECTION, XSS, PII, MAGIC_BYTES",
        )

    return SecurityPayloadTestResponse(
        threat_detected=threat_detected,
        threat_score=threat_score,
        threat_type=p_type,
        detected_patterns=detected_patterns,
        original_preview=raw[:120],
        neutralized_content=neutralized,
        mitigation_action=mitigation_action,
        audit_logged=threat_detected,
    )


@router.delete("/admin/security/logs")
async def clear_security_logs(admin_user: dict = Depends(require_admin)):
    """
    Administrative maintenance utility to purge security logs for clean demonstration.
    """
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    del_res = await db["security_audit_logs"].delete_many({})
    return {"message": "Security logs purged successfully", "deleted_count": del_res.deleted_count}
