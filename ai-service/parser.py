"""
Evidence Parser
---------------
Deterministic, rule-based extraction of structured signals from free-text
evidence (invoices, chat logs, tracking records, statements).

Deliberately NOT using a transformer/NER model for the hackathon prototype:
- Fully deterministic -> reproducible, explainable, safe for live demos
- No model download / GPU dependency
- Every extraction can be traced back to an exact rule, which directly
  supports the "transparent reasoning layer" requirement.

Upgrade path (mentioned in pitch, not required for MVP):
  Replace `extract_dates`, `extract_amounts`, `extract_key_phrases` with
  spaCy NER + a fine-tuned classifier once real data volume justifies it.
"""

import re
from models import ParsedSignal

# --- Keyword libraries -------------------------------------------------

NEGATIVE_PHRASES = [
    "not received", "never arrived", "no response", "refused",
    "not delivered", "wrong item", "damaged", "refund requested",
    "no update", "unresolved", "cancelled", "duplicate charge",
    "double charged", "unauthorized", "not as described",
]

POSITIVE_PHRASES = [
    "delivered", "signed by", "confirmed", "resolved",
    "tracking updated", "in transit", "shipped", "received confirmation",
]

CONTACT_ATTEMPT_PATTERNS = [
    r"contacted (the )?merchant (\w+ )?times?",
    r"reached out (\w+ )?times?",
    r"(called|emailed|messaged) (\w+ )?times?",
    r"twice", r"three times", r"multiple times",
]

# --- Extraction primitives ----------------------------------------------

DATE_REGEX = re.compile(
    r"\b(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}|"
    r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b"
)

AMOUNT_REGEX = re.compile(r"[\$₹]\s?([\d,]+(?:\.\d{1,2})?)")


def extract_dates(text: str) -> list:
    return DATE_REGEX.findall(text)


def extract_amounts(text: str) -> list:
    matches = AMOUNT_REGEX.findall(text)
    return [float(m.replace(",", "")) for m in matches]


def extract_key_phrases(text: str) -> list:
    text_lower = text.lower()
    found = []
    for phrase in NEGATIVE_PHRASES + POSITIVE_PHRASES:
        if phrase in text_lower:
            found.append(phrase)
    return found


def count_contact_attempts(text: str) -> int:
    text_lower = text.lower()
    if "three times" in text_lower or re.search(r"\b3\b.*times", text_lower):
        return 3
    if "twice" in text_lower or "two times" in text_lower:
        return 2
    for pattern in CONTACT_ATTEMPT_PATTERNS:
        if re.search(pattern, text_lower):
            return 2  # conservative default when count is implied but not exact
    return 0


def estimate_sentiment(text: str) -> str:
    text_lower = text.lower()
    neg_hits = sum(1 for p in NEGATIVE_PHRASES if p in text_lower)
    pos_hits = sum(1 for p in POSITIVE_PHRASES if p in text_lower)
    if neg_hits > pos_hits:
        return "negative"
    if pos_hits > neg_hits:
        return "positive"
    return "neutral"


def estimate_confidence(text: str, extracted_count: int) -> float:
    """
    Simple, explainable confidence heuristic:
    - Longer, more detailed text with more matched signals -> higher confidence
    - Very short text with no matches -> low confidence
    Deliberately transparent (no black-box model score).
    """
    base = 0.5
    length_bonus = min(len(text.split()) / 100, 0.25)
    signal_bonus = min(extracted_count * 0.08, 0.25)
    return round(min(base + length_bonus + signal_bonus, 0.99), 2)


def parse_evidence_text(text: str) -> ParsedSignal:
    dates = extract_dates(text)
    amounts = extract_amounts(text)
    phrases = extract_key_phrases(text)
    sentiment = estimate_sentiment(text)
    confidence = estimate_confidence(text, len(phrases) + len(dates) + len(amounts))

    return ParsedSignal(
        extractedDates=dates,
        extractedAmounts=amounts,
        keyPhrases=phrases,
        sentiment=sentiment,
        confidence=confidence,
    )
