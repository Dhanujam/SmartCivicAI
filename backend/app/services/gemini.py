import logging
from typing import Optional
from google import genai
from google.genai import types

from app.config import settings
from app.models.complaint import AIAnalysisResult

logger = logging.getLogger("smartcivic.gemini")


class GeminiConfigurationError(Exception):
    """Raised when Gemini configuration (e.g., API key) is missing."""
    pass


class GeminiAnalysisError(Exception):
    """Raised when the Gemini API call fails or produces an unparseable response."""
    pass


SYSTEM_INSTRUCTION = """You are SmartCivic AI, an expert municipal triage and civic resolution engineering intelligence for municipal and civic authorities.

Your role is to analyze civic complaints submitted by citizens (including text descriptions and photographic evidence), evaluate their real-world impact, assign priority scores, route them to the appropriate civic department, and formulate practical, step-by-step resolution plans for civic field officers.

CRITICAL TRIAGE REQUIREMENTS:
1. CATEGORY: You must select exactly one of the following official categories:
   - Roads & Infrastructure
   - Waste Management
   - Water Supply
   - Electricity & Streetlights
   - Drainage & Sewage
   - Public Safety
   - Traffic & Transportation
   - Parks & Public Spaces
   - Other

2. URGENCY: You must evaluate severity as exactly one of:
   - LOW: Minor inconvenience, aesthetic, or non-disruptive issue.
   - MEDIUM: Moderate disturbance, localized impact without immediate danger.
   - HIGH: Significant disruption, damage potential, or traffic/sanitation hazard.
   - CRITICAL: Immediate threat to life, severe public health crisis, open manhole/electrical hazard, or major infrastructure collapse.

3. PRIORITY SCORE:
   - Provide an integer from 0 to 100 reflecting urgency, public danger, severity, and disruption.

4. LOCATION RULE:
   - If a user-provided location is supplied, use that location.
   - Otherwise, extract a specific location only if explicitly mentioned in the complaint description.
   - If no location is provided or mentioned, you MUST set location to "Not specified".
   - NEVER invent, extrapolate, or hallucinate a location.

5. PRODUCT DIFFERENTIATOR (MANDATORY RESOLUTION ACTION PLAN):
   - Do NOT merely categorize the complaint.
   - Recommend what the responsible municipal department must actually do.
   - "recommended_solution": Concrete, practical technical or operational solution to resolve the problem.
   - "resolution_steps": Exactly 3 to 5 clear, sequential, and actionable steps for field officers/contractors to implement the solution.
   - "priority_reason": Explain why this priority score and urgency were assigned based on real-world impact and safety.
   - "estimated_resolution_time": Realistic operational timeframe (e.g. "24-48 hours", "3-5 days").

6. MULTIMODAL VISION:
   - When an image is provided, thoroughly inspect the photograph to observe the physical damage, environmental conditions, and safety risks. Incorporate visual observations into problem_summary, recommended_solution, and resolution_steps.

7. OUTPUT FORMAT:
   - Return valid JSON matching the schema strictly. Do not wrap in markdown fences.
"""


def _get_genai_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
    if not api_key:
        raise GeminiConfigurationError(
            "GEMINI_API_KEY is not configured in backend/.env. Please configure your Google Gemini API key."
        )
    return genai.Client(api_key=api_key)


async def analyze_complaint(
    description: str,
    location: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    image_mime_type: Optional[str] = None,
) -> AIAnalysisResult:
    """
    Analyze a civic complaint using Google Gemini AI.
    Supports text-only and multimodal (text + image) complaints.
    Returns a strictly validated AIAnalysisResult Pydantic model.
    """
    client = _get_genai_client()
    model_name = settings.GEMINI_MODEL.strip() if settings.GEMINI_MODEL else "gemini-2.5-flash"

    # Construct prompt contents
    contents = []

    # If image is supplied, append Part before prompt text
    if image_bytes and image_mime_type:
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=image_mime_type)
        contents.append(image_part)

    # Formulate contextual prompt
    user_location_info = (
        f"User-provided location: {location.strip()}"
        if location and location.strip()
        else "User-provided location: None provided (follow location extraction rule)"
    )

    prompt_text = (
        f"Analyze the following citizen complaint:\n\n"
        f"Complaint Description:\n{description.strip()}\n\n"
        f"{user_location_info}\n"
    )
    contents.append(prompt_text)

    models_to_try = [model_name]
    for fallback in [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-1.5-flash",
    ]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    response = None
    last_err = None

    for current_model in models_to_try:
        try:
            logger.info("Sending complaint to Gemini model '%s' for AI triage...", current_model)
            response = await client.aio.models.generate_content(
                model=current_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AIAnalysisResult,
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,
                ),
            )
            if response and response.text:
                break
        except Exception as e:
            last_err = e
            logger.warning("Gemini model '%s' failed (%s), trying next fallback...", current_model, str(e)[:100])
            continue

    if not response or not response.text:
        if last_err:
            raise GeminiAnalysisError(f"Gemini API request failed: {str(last_err)}")
        logger.error("Gemini returned an empty response")
        raise GeminiAnalysisError("Gemini returned an empty response.")

    raw_json = response.text.strip()
    # Strip markdown fences if present
    if raw_json.startswith("```"):
        lines = raw_json.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw_json = "\n".join(lines).strip()

    try:
        result = AIAnalysisResult.model_validate_json(raw_json)
        logger.info(
            "Gemini triage successful: Category=%s, Urgency=%s, Priority=%d",
            result.category,
            result.urgency,
            result.priority_score,
        )
        return result
    except Exception as e:
        logger.error("Failed to parse Gemini response into AIAnalysisResult: %s\nRaw output: %s", str(e), raw_json)
        raise GeminiAnalysisError(f"Gemini response validation failed: {str(e)}") from e
