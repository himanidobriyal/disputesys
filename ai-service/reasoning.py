"""
Decision & Explainability Layer
--------------------------------
Converts the scored signals into:
  1. A recommended outcome + confidence
  2. A decision tier (auto_resolve / needs_more_evidence / escalate_to_human)
  3. A plain-English reasoning list, generated FROM the same signals used
     in scoring (never a separate free-text explanation) so the numbers
     and the narrative can never contradict each other.
"""

from models import ScoringSignal, Decision

AUTO_RESOLVE_THRESHOLD = 0.75
NEEDS_EVIDENCE_THRESHOLD = 0.60


def build_decision(signals: list[ScoringSignal], normalized_confidence: dict) -> Decision:
    cm_conf = normalized_confidence["cardMember"]
    m_conf = normalized_confidence["merchant"]

    winner = "cardMember" if cm_conf >= m_conf else "merchant"
    winning_confidence = max(cm_conf, m_conf)

    if winning_confidence >= AUTO_RESOLVE_THRESHOLD:
        tier = "auto_resolve"
        requires_review = False
    elif winning_confidence >= NEEDS_EVIDENCE_THRESHOLD:
        tier = "needs_more_evidence"
        requires_review = True
    else:
        tier = "escalate_to_human"
        requires_review = True

    # Reasoning: pull explanations for the winning party's signals first
    # (sorted by contribution, strongest factor first), then note any
    # opposing signals so the losing party's evidence isn't hidden.
    winning_signals = sorted(
        [s for s in signals if s.party == winner],
        key=lambda s: s.contribution,
        reverse=True,
    )
    opposing_signals = sorted(
        [s for s in signals if s.party != winner],
        key=lambda s: s.contribution,
        reverse=True,
    )

    reasoning = [s.explanation for s in winning_signals]
    if opposing_signals:
        top_opposing = opposing_signals[0]
        reasoning.append(
            f"Note: {top_opposing.explanation} (weighed but outweighed by the factors above)."
        )

    if not signals:
        reasoning = [
            "No conclusive signals could be extracted from the submitted evidence.",
            "This case requires human review to gather additional documentation.",
        ]

    return Decision(
        recommendedOutcome=winner,
        confidence=round(winning_confidence, 2),
        decisionTier=tier,
        reasoning=reasoning,
        requiresHumanReview=requires_review,
    )
