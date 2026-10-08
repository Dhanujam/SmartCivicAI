from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from app.config import settings


def get_sla_hours(urgency: Optional[str]) -> int:
    """
    Returns the prototype SLA duration in hours based on the triage urgency level.
    Configurable via environment variables (SLA_CRITICAL_HOURS, SLA_HIGH_HOURS, etc.).
    """
    if not urgency:
        return settings.SLA_MEDIUM_HOURS

    u = urgency.strip().upper()
    if u == "CRITICAL":
        return settings.SLA_CRITICAL_HOURS
    elif u == "HIGH":
        return settings.SLA_HIGH_HOURS
    elif u == "MEDIUM":
        return settings.SLA_MEDIUM_HOURS
    elif u == "LOW":
        return settings.SLA_LOW_HOURS
    return settings.SLA_MEDIUM_HOURS


def calculate_sla_due_at(created_at: datetime, urgency: Optional[str]) -> datetime:
    """
    Computes expected resolution deadline: created_at + sla_hours.
    Ensures datetime is timezone-aware UTC.
    """
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    hours = get_sla_hours(urgency)
    return created_at + timedelta(hours=hours)


def format_remaining_time(remaining_seconds: int) -> str:
    """
    Returns human-friendly textual representation of remaining or overdue time.
    Examples: '18h 42m remaining', '2 hours remaining', 'Overdue by 5h 42m'
    """
    if remaining_seconds > 0:
        hours = remaining_seconds // 3600
        minutes = (remaining_seconds % 3600) // 60
        if hours > 0 and minutes > 0:
            return f"{hours}h {minutes}m remaining"
        elif hours > 0:
            return f"{hours} hours remaining"
        elif minutes > 0:
            return f"{minutes}m remaining"
        else:
            return "Less than a minute remaining"
    else:
        overdue_sec = abs(remaining_seconds)
        hours = overdue_sec // 3600
        minutes = (overdue_sec % 3600) // 60
        if hours > 0 and minutes > 0:
            return f"Overdue by {hours}h {minutes}m"
        elif hours > 0:
            return f"Overdue by {hours} hours"
        elif minutes > 0:
            return f"Overdue by {minutes}m"
        else:
            return "Overdue by less than a minute"


def compute_complaint_sla(
    complaint: Dict[str, Any],
    now: Optional[datetime] = None,
    master_complaint: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Source of truth for prototype SLA state calculation.
    Computes dynamic SLA metrics from current time, sla_due_at, and lifecycle status.
    Handles legacy documents, completed cases, and merged complaints.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    status = complaint.get("status", "REQUESTED")

    # 1. MERGED Complaints follow the master complaint's SLA
    if status == "MERGED":
        if master_complaint:
            master_sla = compute_complaint_sla(master_complaint, now=now)
            return {
                "sla_hours": master_sla["sla_hours"],
                "sla_due_at": master_sla["sla_due_at"],
                "sla_status": master_sla["sla_status"],
                "sla_breached_at": master_sla["sla_breached_at"],
                "sla_remaining_seconds": master_sla["sla_remaining_seconds"],
                "sla_remaining_text": f"Master SLA: {master_sla['sla_status']}",
                "sla_completed_late": master_sla.get("sla_completed_late", False),
            }
        else:
            # Fallback when master complaint is not loaded
            return {
                "sla_hours": complaint.get("sla_hours") or 48,
                "sla_due_at": complaint.get("sla_due_at"),
                "sla_status": complaint.get("sla_status", "WITHIN_SLA"),
                "sla_breached_at": complaint.get("sla_breached_at"),
                "sla_remaining_seconds": 0,
                "sla_remaining_text": "Follows Master SLA",
                "sla_completed_late": False,
            }

    # Extract urgency and calculate sla_hours
    urgency = complaint.get("ai_analysis", {}).get("urgency") or complaint.get("urgency") or "MEDIUM"
    sla_hours = complaint.get("sla_hours") or get_sla_hours(urgency)

    # 2. COMPLETED Complaints
    if status in ["COMPLETED", "Resolved"]:
        sla_due_at = complaint.get("sla_due_at")
        if sla_due_at and sla_due_at.tzinfo is None:
            sla_due_at = sla_due_at.replace(tzinfo=timezone.utc)

        sla_breached_at = complaint.get("sla_breached_at")
        if sla_breached_at and sla_breached_at.tzinfo is None:
            sla_breached_at = sla_breached_at.replace(tzinfo=timezone.utc)

        updated_at = complaint.get("updated_at")
        if updated_at and updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        completed_late = bool(
            sla_breached_at
            or (updated_at and sla_due_at and updated_at > sla_due_at)
        )
        return {
            "sla_hours": sla_hours,
            "sla_due_at": sla_due_at,
            "sla_status": "COMPLETED",
            "sla_breached_at": sla_breached_at,
            "sla_remaining_seconds": 0,
            "sla_remaining_text": "Completed after SLA" if completed_late else "Resolved before SLA",
            "sla_completed_late": completed_late,
        }

    # 3. REJECTED Complaints
    if status in ["REJECTED", "Rejected"]:
        sla_due_at = complaint.get("sla_due_at")
        if sla_due_at and sla_due_at.tzinfo is None:
            sla_due_at = sla_due_at.replace(tzinfo=timezone.utc)
        return {
            "sla_hours": sla_hours,
            "sla_due_at": sla_due_at,
            "sla_status": "COMPLETED",
            "sla_breached_at": None,
            "sla_remaining_seconds": 0,
            "sla_remaining_text": "Closed (Rejected)",
            "sla_completed_late": False,
        }

    # 4. ACTIVE Complaints (REQUESTED, IN_PROGRESS)
    created_at = complaint.get("created_at") or now
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    sla_due_at = complaint.get("sla_due_at")
    if not sla_due_at:
        sla_due_at = created_at + timedelta(hours=sla_hours)
    elif sla_due_at.tzinfo is None:
        sla_due_at = sla_due_at.replace(tzinfo=timezone.utc)

    diff_seconds = int((sla_due_at - now).total_seconds())
    total_sla_seconds = sla_hours * 3600
    due_soon_threshold_seconds = int(total_sla_seconds * (settings.SLA_DUE_SOON_PERCENT / 100.0))

    sla_breached_at = complaint.get("sla_breached_at")
    if sla_breached_at and sla_breached_at.tzinfo is None:
        sla_breached_at = sla_breached_at.replace(tzinfo=timezone.utc)

    if diff_seconds <= 0:
        sla_status = "BREACHED"
        if not sla_breached_at:
            sla_breached_at = now
        remaining_text = format_remaining_time(diff_seconds)
    elif diff_seconds <= due_soon_threshold_seconds:
        sla_status = "DUE_SOON"
        remaining_text = format_remaining_time(diff_seconds)
    else:
        sla_status = "WITHIN_SLA"
        remaining_text = format_remaining_time(diff_seconds)

    return {
        "sla_hours": sla_hours,
        "sla_due_at": sla_due_at,
        "sla_status": sla_status,
        "sla_breached_at": sla_breached_at,
        "sla_remaining_seconds": diff_seconds,
        "sla_remaining_text": remaining_text,
        "sla_completed_late": False,
    }


def enrich_complaint_dict(
    complaint: Dict[str, Any],
    now: Optional[datetime] = None,
    master_complaint: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Enriches a complaint dictionary in-place with computed SLA attributes.
    """
    sla_info = compute_complaint_sla(complaint, now=now, master_complaint=master_complaint)
    complaint.update(sla_info)
    return complaint
