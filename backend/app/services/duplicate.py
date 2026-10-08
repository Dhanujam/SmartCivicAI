import re
import math
import logging
from difflib import SequenceMatcher
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("smartcivic.duplicate")

STOP_WORDS = {
    "a", "an", "the", "and", "or", "is", "are", "was", "were", "in", "on", "at",
    "by", "for", "with", "about", "against", "between", "into", "through", "during",
    "before", "after", "above", "below", "to", "from", "up", "down", "in", "out",
    "off", "over", "under", "again", "further", "then", "once", "here", "there",
    "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should",
    "now", "there", "is", "are", "near", "please", "urgent", "issue", "problem",
}


def tokenize(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {w for w in words if w not in STOP_WORDS and len(w) > 2}


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def compute_similarity(
    new_desc: str,
    new_cat: Optional[str],
    new_loc: Optional[str],
    new_lat: Optional[float],
    new_lng: Optional[float],
    cand_desc: str,
    cand_cat: Optional[str],
    cand_loc: Optional[str],
    cand_lat: Optional[float],
    cand_lng: Optional[float],
) -> float:
    # 1. Text token overlap (Jaccard)
    tokens1 = tokenize(new_desc)
    tokens2 = tokenize(cand_desc)

    if not tokens1 or not tokens2:
        text_jaccard = 0.0
    else:
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        text_jaccard = intersection / union if union > 0 else 0.0

    # 2. SequenceMatcher ratio for phrasing similarity
    seq_ratio = SequenceMatcher(None, new_desc.lower(), cand_desc.lower()).ratio()
    text_score = max(text_jaccard, seq_ratio * 0.85)

    # 3. Category similarity
    cat_match = 0.0
    if new_cat and cand_cat and new_cat.strip().lower() == cand_cat.strip().lower():
        cat_match = 1.0

    # 4. Location similarity
    loc_score = 0.0
    if (
        new_lat is not None
        and new_lng is not None
        and cand_lat is not None
        and cand_lng is not None
    ):
        try:
            dist = haversine_distance_meters(new_lat, new_lng, cand_lat, cand_lng)
            if dist <= 200:
                loc_score = 1.0
            elif dist <= 600:
                loc_score = 0.75
            elif dist <= 1500:
                loc_score = 0.4
            else:
                loc_score = 0.0
        except Exception:
            loc_score = 0.0
    elif new_loc and cand_loc:
        loc_tok1 = tokenize(new_loc)
        loc_tok2 = tokenize(cand_loc)
        if loc_tok1 and loc_tok2:
            overlap = len(loc_tok1 & loc_tok2)
            if overlap >= 2:
                loc_score = 0.85
            elif overlap >= 1:
                loc_score = 0.5

    # Weighted final score calculation
    # If text is very similar and category matches, it's strong.
    # If location also matches, it's a definite duplicate candidate.
    total = (text_score * 0.50) + (cat_match * 0.25) + (loc_score * 0.25)

    # Bonus: If both category matches AND text similarity is high (>0.5), boost
    if cat_match == 1.0 and text_score >= 0.4:
        total = min(1.0, total + 0.15)

    return total * 100.0


async def detect_duplicates(
    complaints_collection,
    new_description: str,
    new_category: Optional[str] = None,
    new_location_address: Optional[str] = None,
    new_latitude: Optional[float] = None,
    new_longitude: Optional[float] = None,
    limit_recent: int = 100,
    threshold: float = 60.0,
) -> Tuple[bool, List[str], List[Dict[str, Any]]]:
    """
    Scans recent complaints in MongoDB to identify potential duplicate civic issues.
    Never raises an unhandled exception to prevent disrupting complaint creation.
    """
    if complaints_collection is None:
        return False, [], []

    try:
        # Retrieve recent non-rejected complaints
        cursor = complaints_collection.find(
            {"status": {"$nin": ["REJECTED", "Rejected"]}}
        ).sort("created_at", -1).limit(limit_recent)

        duplicate_ids = []
        duplicate_details = []

        async for cand in cursor:
            cand_id = cand.get("complaint_id") or str(cand.get("_id"))
            cand_desc = cand.get("description", "")
            cand_cat = cand.get("ai_analysis", {}).get("category")
            cand_loc = cand.get("location_address") or cand.get("ai_analysis", {}).get("location")
            cand_lat = cand.get("latitude")
            cand_lng = cand.get("longitude")

            score = compute_similarity(
                new_desc=new_description,
                new_cat=new_category,
                new_loc=new_location_address,
                new_lat=new_latitude,
                new_lng=new_longitude,
                cand_desc=cand_desc,
                cand_cat=cand_cat,
                cand_loc=cand_loc,
                cand_lat=cand_lat,
                cand_lng=cand_lng,
            )

            if score >= threshold:
                round_score = int(round(score))
                duplicate_ids.append(cand_id)
                summary = (
                    cand.get("ai_analysis", {}).get("problem_summary")
                    or cand_desc[:120]
                )
                duplicate_details.append({
                    "complaint_id": cand_id,
                    "similarity_score": round_score,
                    "problem_summary": summary,
                    "category": cand_cat or "Other",
                    "location": cand_loc or "Not specified",
                    "status": cand.get("status", "REQUESTED"),
                    "created_at": cand.get("created_at").isoformat() if cand.get("created_at") else None,
                })

        # Sort duplicates by similarity descending
        duplicate_details.sort(key=lambda x: x["similarity_score"], reverse=True)
        is_found = len(duplicate_ids) > 0

        return is_found, duplicate_ids[:5], duplicate_details[:5]
    except Exception as e:
        logger.warning("Duplicate detection encountered non-fatal error: %s", e)
        return False, [], []
