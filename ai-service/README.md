# Dispute Resolution AI Service

FastAPI microservice implementing the evidence parsing → fair-weighing
scoring → explainable decision pipeline for the Frictionless Dispute &
Chargeback Resolution project.

## Run it

```bash
pip install -r requirements.txt
python3 main.py
# or: uvicorn main:app --reload --port 8000
```

Docs auto-generated at: `http://localhost:8000/docs`

## Files

| File | Responsibility |
|---|---|
| `models.py` | Pydantic schemas matching the shared Dispute/Evidence/Decision JSON contract |
| `parser.py` | Rule-based extraction of dates, amounts, key phrases, sentiment, confidence from raw evidence text |
| `scoring.py` | Weighted signal engine — every point scored is a named, traceable factor |
| `reasoning.py` | Converts scoring signals into plain-English reasoning + decision tier |
| `main.py` | FastAPI routes (`/health`, `/parse-evidence`, `/score`) |
| `test_request.py` | Standalone test of the full pipeline using the Amazon laptop scenario, no server needed |

## API Contract (for the Node backend teammate)

### `POST /score`

**Request body:**
```json
{
  "disputeId": "AMEX-D-20260718-0042",
  "transaction": { "merchant": "Amazon.com", "amount": 1200.00, "date": "2026-07-14" },
  "disputeDetails": {
    "reasonCode": "C08",
    "reasonDescription": "Goods/Services Not Received",
    "dateFiled": "2026-07-18",
    "cardMemberStatement": "free text statement..."
  },
  "cardMemberEvidence": [
    { "evidenceId": "EV-001", "submittedBy": "cardMember", "type": "invoice", "text": "raw text..." }
  ],
  "merchantEvidence": [
    { "evidenceId": "EV-003", "submittedBy": "merchant", "type": "proof_of_delivery", "text": "raw text..." }
  ]
}
```

`type` values used by the parser: `invoice`, `communication_log`, `chat_log`,
`proof_of_delivery`, `statement` (any other string is accepted but won't
trigger the contact-attempts rule).

**Response body:** matches the `decision` + `scoring` blocks in the shared
Amex-aligned schema — see `models.py::ScoreResponse` for the exact shape.
The Node backend should store this response as-is against the dispute
record in MongoDB.

### `POST /parse-evidence?evidence_id=...&text=...`
Utility endpoint to parse a single piece of evidence in isolation (useful
for a "preview extracted signals before submitting" UI feature, if time
allows).

## Design notes for the presentation

- **Deterministic by design.** No ML model, no spaCy/transformer dependency.
  Every score is `weight × confidence`, and every factor is a named rule —
  this directly satisfies the "transparent reasoning layer" requirement and
  is safe to demo live (no model-loading flakiness).
- **Decision tiers, not a single verdict.** `auto_resolve` (≥75% confidence),
  `needs_more_evidence` (60–75%), `escalate_to_human` (<60%) — shows the
  system knows when *not* to decide, which is the framing to lead with:
  "Explainable AI Decision Support," not "AI that decides disputes."
- **Upgrade path to mention, not build:** swap `parser.py`'s regex/keyword
  rules for spaCy NER + a fine-tuned classifier once real data volume
  justifies it. Say this in the pitch as a roadmap item.
- **Tuning the weights:** all weights live in `scoring.py::WEIGHTS` as a
  single dict — trivial to expose as an admin-adjustable config if your
  teammate wants to build the "adjust weights live" stretch feature.
