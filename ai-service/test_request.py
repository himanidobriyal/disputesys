"""
Quick local test of the scoring pipeline (no server needed) using the
laptop/Amazon scenario from the project discussion.
"""
import json
from models import ScoreRequest
from parser import parse_evidence_text
from scoring import evaluate_signals, compute_final_score
from reasoning import build_decision
from models import EvidenceParsed

sample_request = {
    "disputeId": "AMEX-D-20260718-0042",
    "transaction": {"merchant": "Amazon.com", "amount": 1200.00, "date": "2026-07-14"},
    "disputeDetails": {
        "reasonCode": "C08",
        "reasonDescription": "Goods/Services Not Received",
        "dateFiled": "2026-07-18",
        "cardMemberStatement": "I ordered a laptop on July 14. Tracking has not updated since July 14 and the item never arrived. I contacted the merchant twice with no resolution.",
    },
    "cardMemberEvidence": [
        {"evidenceId": "EV-001", "submittedBy": "cardMember", "type": "invoice",
         "text": "Invoice for laptop purchase, $1200.00, dated 2026-07-14."},
        {"evidenceId": "EV-002", "submittedBy": "cardMember", "type": "communication_log",
         "text": "Chat log: Card member contacted merchant twice regarding order not received. No response given. Refund requested."},
    ],
    "merchantEvidence": [
        {"evidenceId": "EV-003", "submittedBy": "merchant", "type": "proof_of_delivery",
         "text": "Tracking record shows package delivered on 2026-07-16. No signed confirmation on file."},
    ],
}

req = ScoreRequest(**sample_request)

cm_parsed = [
    EvidenceParsed(evidenceId=e.evidenceId, submittedBy=e.submittedBy, type=e.type,
                   parsedSignals=parse_evidence_text(e.text))
    for e in req.cardMemberEvidence
]
cm_parsed.append(EvidenceParsed(
    evidenceId="statement", submittedBy="cardMember", type="statement",
    parsedSignals=parse_evidence_text(req.disputeDetails.cardMemberStatement)
))
m_parsed = [
    EvidenceParsed(evidenceId=e.evidenceId, submittedBy=e.submittedBy, type=e.type,
                   parsedSignals=parse_evidence_text(e.text))
    for e in req.merchantEvidence
]

signals = evaluate_signals(cm_parsed, m_parsed, req.transaction.date, req.disputeDetails.dateFiled)
score = compute_final_score(signals)
decision = build_decision(signals, score["normalizedConfidence"])

print("=== SIGNALS ===")
for s in signals:
    print(f"  [{s.party:11}] {s.factor:35} weight={s.weight}  conf={s.confidence}  contribution={s.contribution}")

print("\n=== SCORE ===")
print(json.dumps(score, indent=2))

print("\n=== DECISION ===")
print(json.dumps(decision.model_dump(), indent=2))
