from datetime import datetime, timezone
import logging
from fastapi import APIRouter, HTTPException, status as http_status
from app.database import get_complaints_collection
from app.config import settings
from app.services.sla import compute_complaint_sla

logger = logging.getLogger("smartcivic.routes.analytics")

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
async def get_analytics_summary():
    """
    Summary metrics for the civic authority dashboard using real MongoDB aggregations.
    Computes real counts for Requested, In Progress, Completed, High Priority, Critical issues,
    and real-time SLA metrics (Breached, Due Soon, Within SLA, Completed).
    """
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

    try:
        total = await collection.count_documents({})

        # Real status counts supporting new and legacy values
        requested = await collection.count_documents({"status": {"$in": ["REQUESTED", "Pending"]}})
        in_progress = await collection.count_documents({"status": {"$in": ["IN_PROGRESS", "In Progress"]}})
        completed = await collection.count_documents({"status": {"$in": ["COMPLETED", "Resolved"]}})
        rejected = await collection.count_documents({"status": {"$in": ["REJECTED", "Rejected"]}})
        merged = await collection.count_documents({"status": "MERGED"})

        # Stretch Goal 1: Count master complaint groups (each master complaint represents 1 duplicate group)
        duplicate_groups = await collection.count_documents({"is_master_complaint": True})

        # Priority and Critical counts
        high_priority = await collection.count_documents({
            "$or": [
                {"ai_analysis.priority_score": {"$gte": 70}},
                {"ai_analysis.urgency": "HIGH"},
            ]
        })
        critical = await collection.count_documents({
            "$or": [
                {"ai_analysis.priority_score": {"$gte": 85}},
                {"ai_analysis.urgency": "CRITICAL"},
            ]
        })

        async def aggregate_by_field(field_path: str) -> dict:
            pipeline = [
                {"$match": {field_path: {"$exists": True, "$ne": None}}},
                {"$group": {"_id": f"${field_path}", "count": {"$sum": 1}}},
            ]
            breakdown = {}
            cursor = collection.aggregate(pipeline)
            async for doc in cursor:
                key = str(doc.get("_id", "Unknown"))
                breakdown[key] = doc.get("count", 0)
            return breakdown

        urgency_breakdown = await aggregate_by_field("ai_analysis.urgency")
        category_breakdown = await aggregate_by_field("ai_analysis.category")
        department_breakdown = await aggregate_by_field("ai_analysis.department")

        # Stretch Goal 2: Real-time SLA Performance metrics across real MongoDB documents
        now = datetime.now(timezone.utc)
        all_docs = []
        master_ids = []
        cursor_all = collection.find({})
        async for doc in cursor_all:
            all_docs.append(doc)
            if doc.get("master_complaint_id"):
                master_ids.append(doc["master_complaint_id"])

        master_docs = {}
        if master_ids:
            async for m in collection.find({"complaint_id": {"$in": list(set(master_ids))}}):
                master_docs[m.get("complaint_id")] = m

        sla_breached = 0
        sla_due_soon = 0
        sla_within = 0
        sla_completed = 0

        for doc in all_docs:
            m_doc = master_docs.get(doc.get("master_complaint_id"))
            sla_info = compute_complaint_sla(doc, now=now, master_complaint=m_doc)
            st = sla_info.get("sla_status")
            if st == "BREACHED":
                sla_breached += 1
            elif st == "DUE_SOON":
                sla_due_soon += 1
            elif st == "WITHIN_SLA":
                sla_within += 1
            elif st == "COMPLETED":
                sla_completed += 1

        active_sla_total = sla_breached + sla_due_soon + sla_within
        if active_sla_total > 0:
            within_pct = round((sla_within / active_sla_total) * 100, 1)
            due_soon_pct = round((sla_due_soon / active_sla_total) * 100, 1)
            breached_pct = round((sla_breached / active_sla_total) * 100, 1)
        else:
            within_pct = 0.0
            due_soon_pct = 0.0
            breached_pct = 0.0

        sla_performance = {
            "total_active": active_sla_total,
            "within_percent": within_pct,
            "due_soon_percent": due_soon_pct,
            "breached_percent": breached_pct,
        }

        # Normalize status breakdown for charts
        status_chart = {
            "REQUESTED": requested,
            "IN_PROGRESS": in_progress,
            "COMPLETED": completed,
        }
        if rejected > 0:
            status_chart["REJECTED"] = rejected
        if merged > 0:
            status_chart["MERGED"] = merged

        return {
            "total_complaints": total,
            "requested": requested,
            "in_progress": in_progress,
            "completed": completed,
            "rejected": rejected,
            "merged": merged,
            "duplicate_groups": duplicate_groups,
            "high_priority": high_priority,
            "critical": critical,
            "sla_breached": sla_breached,
            "sla_due_soon": sla_due_soon,
            "sla_within": sla_within,
            "sla_completed": sla_completed,
            "sla_performance": sla_performance,
            "status_breakdown": {
                "pending": requested,
                "in_progress": in_progress,
                "resolved": completed,
                "requested": requested,
                "completed": completed,
                "rejected": rejected,
                "merged": merged,
            },
            "status_chart": status_chart,
            "urgency_breakdown": urgency_breakdown,
            "category_breakdown": category_breakdown,
            "department_breakdown": department_breakdown,
        }
    except Exception as e:
        logger.error("Failed to calculate analytics summary: %s", str(e))
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate analytics summary: {str(e)}",
        )
