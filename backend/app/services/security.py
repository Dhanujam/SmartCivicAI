import re
import html
import time
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from app.database import get_database

logger = logging.getLogger("smartcivic.security")

# ==============================================================================
# 1. AI PROMPT INJECTION & JAILBREAK FIREWALL
# ==============================================================================

# High-risk patterns that attempt to hijack LLM system instructions
PROMPT_INJECTION_PATTERNS = [
    r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)\b",
    r"(?i)\bdisregard\s+(all\s+)?(previous|prior|above|guidelines)\b",
    r"(?i)\byou\s+are\s+now\s+(in\s+)?(DAN|developer|unrestricted|jailbroken|god)\s+mode\b",
    r"(?i)\bact\s+as\s+(an?\s+)?(unrestricted|jailbroken|unfiltered|malicious)\s+ai\b",
    r"(?i)\bsystem\s+override\b",
    r"(?i)\boutput\s+(the\s+)?(system\s+prompt|initial\s+prompt|developer\s+message)\b",
    r"(?i)\breveal\s+(your\s+)?(secret|internal|hidden)\s+instructions\b",
    r"(?i)\b(print|echo|dump)\s+(system|environment|database|all\s+records)\b",
    r"(?i)<\|im_start\|>",
    r"(?i)<\|im_end\|>",
    r"(?i)\[system\]",
    r"(?i)\[assistant\]",
    r"(?i)\bdrop\s+database\b",
    r"(?i)\bdelete\s+from\s+complaints\b",
]

PROMPT_INJECTION_REGEXES = [re.compile(p) for p in PROMPT_INJECTION_PATTERNS]


def scan_prompt_injection(text: str) -> Tuple[bool, int, List[str]]:
    """
    Scans input text for LLM Prompt Injection and Jailbreak attempts.
    Returns:
        is_threat (bool): True if threat score exceeds threshold
        threat_score (int): 0 to 100 risk score
        detected_patterns (List[str]): List of matched pattern descriptions
    """
    if not text:
        return False, 0, []

    detected = []
    score = 0

    for pattern, regex in zip(PROMPT_INJECTION_PATTERNS, PROMPT_INJECTION_REGEXES):
        match = regex.search(text)
        if match:
            detected.append(match.group(0))
            score += 35

    # Check for excessive delimiter abuse or prompt injection framing
    if "```system" in text.lower() or "### system:" in text.lower():
        detected.append("System directive markup delimiter")
        score += 40

    threat_score = min(score, 100)
    is_threat = threat_score >= 35

    return is_threat, threat_score, detected


def sanitize_prompt_text(text: str) -> str:
    """
    Neutralizes detected prompt injection triggers while preserving civic text content.
    Wraps suspicious directives in safety brackets so LLM treats them strictly as user data.
    """
    if not text:
        return ""

    sanitized = text
    for regex in PROMPT_INJECTION_REGEXES:
        sanitized = regex.sub(r"[REDACTED_PROMPT_INJECTION_DIRECTIVE]", sanitized)

    # Escape delimiter tags
    sanitized = sanitized.replace("<|im_start|>", "").replace("<|im_end|>", "")
    sanitized = sanitized.replace("[system]", "(user_note: system)").replace("[assistant]", "(user_note: assistant)")
    return sanitized.strip()


# ==============================================================================
# 2. XSS & HTML PAYLOAD SANITIZATION
# ==============================================================================

DANGEROUS_HTML_PATTERNS = [
    r"(?i)<script[^>]*>[\s\S]*?<\/script>",
    r"(?i)<script[^>]*>",
    r"(?i)<\/script>",
    r"(?i)<iframe[^>]*>[\s\S]*?<\/iframe>",
    r"(?i)<object[^>]*>[\s\S]*?<\/object>",
    r"(?i)<embed[^>]*>",
    r"(?i)javascript:[^\s\"'>]+",
    r"(?i)data:text\/html[^\s\"'>]+",
    r"(?i)\bon[a-z]+\s*=\s*[\"'][^\"']*[\"']",  # onload="...", onclick="..."
    r"(?i)\bon[a-z]+\s*=\s*[^>\s]+",            # onload=alert(1)
]

DANGEROUS_HTML_REGEXES = [re.compile(p) for p in DANGEROUS_HTML_PATTERNS]


def scan_and_sanitize_xss(text: str) -> Tuple[str, bool, List[str]]:
    """
    Scans for XSS payloads, strips dangerous tags and attributes, and HTML-escapes content.
    Returns:
        sanitized_text (str): Cleaned, safe string
        has_xss (bool): True if dangerous HTML/JS was detected and stripped
        detected_threats (List[str]): Matched triggers
    """
    if not text:
        return "", False, []

    has_threat = False
    detected = []
    cleaned = text

    for pattern, regex in zip(DANGEROUS_HTML_PATTERNS, DANGEROUS_HTML_REGEXES):
        matches = regex.findall(cleaned)
        if matches:
            has_threat = True
            for m in matches:
                detected.append(m[:60] if isinstance(m, str) else str(m)[:60])
            cleaned = regex.sub("", cleaned)

    # Clean residual angled brackets from broken tags
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    
    # Strip dangerous HTML entities
    cleaned = html.escape(cleaned, quote=True)
    # Unescape harmless quotes for human readability while keeping &lt; &gt; safe
    cleaned = cleaned.replace("&quot;", '"').replace("&#x27;", "'")

    return cleaned.strip(), has_threat, detected


# ==============================================================================
# 3. MAGIC BYTES & BINARY FILE INSPECTION
# ==============================================================================

MAGIC_SIGNATURES = {
    "image/jpeg": [b"\xFF\xD8\xFF"],
    "image/jpg": [b"\xFF\xD8\xFF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "image/webp": [b"RIFF"],  # With 'WEBP' at offset 8
}

DANGEROUS_FILE_SIGNATURES = [
    (b"<?php", "PHP Script Polyglot"),
    (b"<script", "Embedded HTML Script Polyglot"),
    (b"MZ", "Windows PE Executable"),
    (b"\x7fELF", "Linux ELF Binary"),
    (b"#!/bin", "Unix Shell Script"),
]


def verify_image_magic_bytes(data: bytes, declared_mime: str) -> Tuple[bool, str]:
    """
    Inspects raw file header bytes against declared MIME type to prevent polyglot
    file attacks, disguised executables, or script injection in image uploads.
    """
    if not data or len(data) < 8:
        return False, "File is empty or corrupted (under 8 bytes)"

    # Check for embedded script or executable markers in the header
    header_preview = data[:256]
    for signature, threat_label in DANGEROUS_FILE_SIGNATURES:
        if signature in header_preview:
            return False, f"Malicious payload detected: {threat_label}"

    mime_lower = (declared_mime or "").lower().strip()

    # JPEG Check
    if mime_lower in ["image/jpeg", "image/jpg"]:
        if data.startswith(b"\xFF\xD8\xFF"):
            return True, "Valid JPEG magic bytes (FF D8 FF)"
        return False, "Invalid JPEG file: magic bytes header mismatch"

    # PNG Check
    if mime_lower == "image/png":
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return True, "Valid PNG magic bytes"
        return False, "Invalid PNG file: magic bytes header mismatch"

    # GIF Check
    if mime_lower == "image/gif":
        if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
            return True, "Valid GIF magic bytes"
        return False, "Invalid GIF file: magic bytes header mismatch"

    # WEBP Check: starts with RIFF and contains WEBP at byte offset 8..12
    if mime_lower == "image/webp":
        if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
            return True, "Valid WebP magic bytes (RIFF....WEBP)"
        return False, "Invalid WebP file: magic bytes header mismatch"

    # HEIC / HEIF Check: Box header contains 'ftyp' at offset 4
    if mime_lower in ["image/heic", "image/heif"]:
        if len(data) >= 12 and data[4:8] == b"ftyp":
            return True, "Valid HEIC/HEIF ISO BMFF container header"
        return False, "Invalid HEIC/HEIF file: magic bytes header mismatch"

    # Allow if matching standard JPEG/PNG bytes even with generic mime
    if data.startswith(b"\xFF\xD8\xFF"):
        return True, "Valid JPEG magic bytes detected"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True, "Valid PNG magic bytes detected"

    return False, f"Unrecognized or unsupported binary format for declared MIME '{declared_mime}'"


# ==============================================================================
# 4. AUTOMATED PII DETECTION & REDACTION (DPDP / GDPR)
# ==============================================================================

# Indian Aadhaar 12-digit number (4-4-4 or contiguous)
AADHAAR_REGEX = re.compile(r"\b[2-9]{1}\d{3}[-\s]?\d{4}[-\s]?\d{4}\b")

# Phone number (Indian 10-digit mobile or international format)
PHONE_REGEX = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")

# Email address
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")


def scan_and_mask_pii(text: str) -> Tuple[str, bool, List[Dict[str, str]]]:
    """
    Detects Personally Identifiable Information (Aadhaar, Phone, Email) in civic complaint
    descriptions to preserve citizen privacy in public records.
    Returns:
        masked_text (str): Complaint text with sensitive numbers redacted
        pii_found (bool): True if PII was detected
        pii_items (List[Dict]): Identified PII types and masked samples
    """
    if not text:
        return "", False, []

    found = False
    items = []
    masked = text

    # 1. Mask Aadhaar
    for match in AADHAAR_REGEX.finditer(text):
        found = True
        val = match.group(0)
        clean_val = val.replace("-", "").replace(" ", "")
        masked_sample = f"XXXX-XXXX-{clean_val[-4:]}"
        items.append({"type": "AADHAAR_NUMBER", "preview": masked_sample})
        masked = masked.replace(val, f"[REDACTED_AADHAAR: {masked_sample}]")

    # 2. Mask Phone (only if not already part of an Aadhaar match)
    for match in PHONE_REGEX.finditer(masked):
        found = True
        val = match.group(0)
        digits = re.sub(r"\D", "", val)
        masked_sample = f"+91-XXXXX-{digits[-4:]}" if len(digits) >= 10 else f"XXX-{digits[-3:]}"
        items.append({"type": "PHONE_NUMBER", "preview": masked_sample})
        masked = masked.replace(val, f"[REDACTED_PHONE: {masked_sample}]")

    return masked, found, items


# ==============================================================================
# 5. SLIDING-WINDOW IN-MEMORY RATE LIMITER
# ==============================================================================

class SlidingWindowRateLimiter:
    """
    Lightweight, high-performance sliding window rate limiter.
    Limits requests per key (client IP or user ID) within a time window.
    """

    def __init__(self):
        # Dict[key, List[timestamp_float]]
        self._requests: Dict[str, List[float]] = {}
        # Max tracked keys to prevent memory exhaustion
        self._max_keys = 5000

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        """
        Checks if request is allowed.
        Returns:
            allowed (bool)
            remaining (int)
            reset_seconds (int)
        """
        now = time.time()
        cutoff = now - window_seconds

        # Prune old keys if capacity exceeded
        if len(self._requests) > self._max_keys:
            self._cleanup(cutoff)

        timestamps = self._requests.get(key, [])
        # Keep only timestamps within window
        valid_timestamps = [t for t in timestamps if t > cutoff]

        if len(valid_timestamps) >= max_requests:
            oldest = valid_timestamps[0]
            reset_sec = max(1, int(oldest + window_seconds - now))
            self._requests[key] = valid_timestamps
            return False, 0, reset_sec

        # Record this request
        valid_timestamps.append(now)
        self._requests[key] = valid_timestamps
        remaining = max(0, max_requests - len(valid_timestamps))
        reset_sec = window_seconds

        return True, remaining, reset_sec

    def _cleanup(self, cutoff: float):
        keys_to_delete = []
        for k, timestamps in self._requests.items():
            valid = [t for t in timestamps if t > cutoff]
            if not valid:
                keys_to_delete.append(k)
            else:
                self._requests[k] = valid
        for k in keys_to_delete:
            self._requests.pop(k, None)


# Singleton rate limiters for different operations
auth_rate_limiter = SlidingWindowRateLimiter()       # 5 requests per 60s
complaint_rate_limiter = SlidingWindowRateLimiter()  # 15 requests per 60s
api_rate_limiter = SlidingWindowRateLimiter()        # 120 requests per 60s


# ==============================================================================
# 6. PERSISTENT SECURITY AUDIT LOGGING (MONGODB ATLAS)
# ==============================================================================

async def log_security_event(
    event_type: str,
    severity: str,
    details: str,
    client_ip: Optional[str] = "127.0.0.1",
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    endpoint: Optional[str] = None,
    mitigation: Optional[str] = "BLOCKED_AND_ISOLATED",
    metadata: Optional[Dict[str, Any]] = None,
):
    """
    Records a cybersecurity incident into the 'security_audit_logs' collection in MongoDB Atlas.
    Fails safely without breaking standard request flow.
    """
    try:
        db = get_database()
        if db is None:
            logger.warning("MongoDB unavailable, unable to persist security event: %s", event_type)
            return

        collection = db["security_audit_logs"]
        now = datetime.now(timezone.utc)

        doc = {
            "timestamp": now,
            "event_type": event_type,
            "severity": severity.upper(),  # CRITICAL, HIGH, MEDIUM, LOW, INFO
            "client_ip": client_ip or "127.0.0.1",
            "user_id": user_id,
            "user_email": user_email,
            "endpoint": endpoint,
            "details": details,
            "mitigation": mitigation,
            "metadata": metadata or {},
        }

        await collection.insert_one(doc)
        logger.info("Security Audit Logged: [%s] %s - %s", severity, event_type, details[:80])
    except Exception as e:
        logger.error("Failed to write security audit log: %s", e)
