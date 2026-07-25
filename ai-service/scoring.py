"""
Fair-Weighing Scoring Engine
----------------------------
Takes parsed evidence from both parties + dispute metadata and produces
a weighted, fully-traceable score for each side. Every point awarded is
tied to a named factor with a fixed weight and a per-evidence confidence
-> this IS the "transparent reasoning layer" the challenge asks for.

Signal weight table (tunable — expose in admin panel as a stretch goal):
"""

from datetime import datetime
from models import EvidenceParsed, ScoringSignal

# --- Weight table (sum of max possible per side need not be 1.0; we
# normalize at the end) ---------------------------------------------------

WEIGHTS = {
    "delivery_proof_present": 0.30,          # merchant
    "signed_confirmation_missing": 0.20,     # cardMember
    "non_delivery_claim": 0.20,              # cardMember
    "tracking_inconsistent": 0.25,           # cardMember
    "documented_contact_attempts": 0.15,     # cardMember
    "filed_within_policy_window": 0.10,      # cardMember
    "filed_outside_policy_window": 0.15,     # merchant
    "duplicate_charge_claim": 0.40,          # cardMember
    "merchant_resolution_evidence": 0.20,    # merchant
}

POLICY_WINDOW_DAYS = 120


def _days_between(d1: str, d2: str) -> int:
    try:
        a = datetime.fromisoformat(d1)
        b = datetime.fromisoformat(d2)
        return abs((b - a).days)
    except Exception:
        return 0


def evaluate_signals(
    card_member_evidence: list[EvidenceParsed],
    merchant_evidence: list[EvidenceParsed],
    transaction_date: str,
    date_filed: str,
) -> list[ScoringSignal]:
    signals: list[ScoringSignal] = []

    # --- Card member side ---
    cm_all_phrases = set()
    cm_confidences = []
    contact_attempts_found = False

    for ev in card_member_evidence:
        cm_all_phrases.update(ev.parsedSignals.keyPhrases)
        cm_confidences.append(ev.parsedSignals.confidence)

    if any(p in cm_all_phrases for p in ["not received", "never arrived", "not delivered"]):
        conf = max(cm_confidences) if cm_confidences else 0.6
        signals.append(ScoringSignal(
            factor="non_delivery_claim",
            party="cardMember",
            weight=WEIGHTS["non_delivery_claim"],
            confidence=conf,
            contribution=round(WEIGHTS["non_delivery_claim"] * conf * 100, 2),
            explanation="Card member's evidence explicitly states the item was not received.",
        ))

    if "duplicate charge" in cm_all_phrases or "double charged" in cm_all_phrases:
        conf = max(cm_confidences) if cm_confidences else 0.7
        signals.append(ScoringSignal(
            factor="duplicate_charge_claim",
            party="cardMember",
            weight=WEIGHTS["duplicate_charge_claim"],
            confidence=conf,
            contribution=round(WEIGHTS["duplicate_charge_claim"] * conf * 100, 2),
            explanation="Card member's evidence indicates a duplicate/double charge for the same transaction.",
        ))

    if "no update" in cm_all_phrases or "unresolved" in cm_all_phrases:
        signals.append(ScoringSignal(
            factor="tracking_inconsistent",
            party="cardMember",
            weight=WEIGHTS["tracking_inconsistent"],
            confidence=0.75,
            contribution=round(WEIGHTS["tracking_inconsistent"] * 0.75 * 100, 2),
            explanation="Tracking/status information referenced in the evidence shows no update, inconsistent with a completed delivery.",
        ))

    # contact attempts - look for evidence with contact language
    for ev in card_member_evidence:
        if ev.type in ("communication_log", "chat_log"):
            contact_attempts_found = True
            signals.append(ScoringSignal(
                factor="documented_contact_attempts",
                party="cardMember",
                weight=WEIGHTS["documented_contact_attempts"],
                confidence=ev.parsedSignals.confidence,
                contribution=round(WEIGHTS["documented_contact_attempts"] * ev.parsedSignals.confidence * 100, 2),
                explanation="Card member documented prior attempts to resolve the issue directly with the merchant before filing.",
            ))
            break

    # policy window
    days = _days_between(transaction_date, date_filed)
    if days <= POLICY_WINDOW_DAYS:
        signals.append(ScoringSignal(
            factor="filed_within_policy_window",
            party="cardMember",
            weight=WEIGHTS["filed_within_policy_window"],
            confidence=1.0,
            contribution=round(WEIGHTS["filed_within_policy_window"] * 1.0 * 100, 2),
            explanation=f"Dispute was filed {days} days after the transaction, within the {POLICY_WINDOW_DAYS}-day policy window.",
        ))
    else:
        signals.append(ScoringSignal(
            factor="filed_outside_policy_window",
            party="merchant",
            weight=WEIGHTS["filed_outside_policy_window"],
            confidence=1.0,
            contribution=round(WEIGHTS["filed_outside_policy_window"] * 1.0 * 100, 2),
            explanation=f"Dispute was filed {days} days after the transaction, outside the {POLICY_WINDOW_DAYS}-day policy window.",
        ))

    # --- Merchant side ---
    m_all_phrases = set()
    m_confidences = []
    has_signed_confirmation = False

    for ev in merchant_evidence:
        m_all_phrases.update(ev.parsedSignals.keyPhrases)
        m_confidences.append(ev.parsedSignals.confidence)
        if "signed by" in ev.parsedSignals.keyPhrases:
            has_signed_confirmation = True

    if "delivered" in m_all_phrases or "shipped" in m_all_phrases:
        conf = max(m_confidences) if m_confidences else 0.6
        signals.append(ScoringSignal(
            factor="delivery_proof_present",
            party="merchant",
            weight=WEIGHTS["delivery_proof_present"],
            confidence=conf,
            contribution=round(WEIGHTS["delivery_proof_present"] * conf * 100, 2),
            explanation="Merchant provided tracking/delivery evidence indicating the shipment was completed.",
        ))

    if not has_signed_confirmation:
        signals.append(ScoringSignal(
            factor="signed_confirmation_missing",
            party="cardMember",
            weight=WEIGHTS["signed_confirmation_missing"],
            confidence=0.9,
            contribution=round(WEIGHTS["signed_confirmation_missing"] * 0.9 * 100, 2),
            explanation="Merchant did not provide a signed delivery confirmation, which Amex requires for this reason code.",
        ))

    if "confirmed" in m_all_phrases or "resolved" in m_all_phrases:
        conf = max(m_confidences) if m_confidences else 0.6
        signals.append(ScoringSignal(
            factor="merchant_resolution_evidence",
            party="merchant",
            weight=WEIGHTS["merchant_resolution_evidence"],
            confidence=conf,
            contribution=round(WEIGHTS["merchant_resolution_evidence"] * conf * 100, 2),
            explanation="Merchant provided evidence suggesting the issue was already addressed or resolved.",
        ))

    return signals


def compute_final_score(signals: list[ScoringSignal]) -> dict:
    cm_total = sum(s.contribution for s in signals if s.party == "cardMember")
    m_total = sum(s.contribution for s in signals if s.party == "merchant")
    total = cm_total + m_total

    if total == 0:
        # No signals detected at all -> force human review, never guess
        return {
            "cardMemberScore": 0.0,
            "merchantScore": 0.0,
            "normalizedConfidence": {"cardMember": 0.5, "merchant": 0.5},
        }

    return {
        "cardMemberScore": round(cm_total, 2),
        "merchantScore": round(m_total, 2),
        "normalizedConfidence": {
            "cardMember": round(cm_total / total, 2),
            "merchant": round(m_total / total, 2),
        },
    }
