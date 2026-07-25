from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import ScoreRequest, ScoreResponse, EvidenceParsed
from parser import parse_evidence_text
from scoring import evaluate_signals, compute_final_score
from reasoning import build_decision

app = FastAPI(title="Dispute Resolution AI Service", version="1.0.0")

# Allow the Node backend / React dev server to call this freely in the demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "dispute-ai-engine"}


@app.post("/parse-evidence")
def parse_evidence(evidence_id: str, text: str):
    """Parse a single piece of evidence text and return structured signals."""
    parsed = parse_evidence_text(text)
    return {"evidenceId": evidence_id, "parsedSignals": parsed}


@app.post("/score", response_model=ScoreResponse)
def score_dispute(request: ScoreRequest):
    """
    Full pipeline: evidence in -> structured signals -> weighted score ->
    explainable decision out. This is the single endpoint the Node backend
    calls after both parties have submitted evidence.
    """
    # 1. Parse every piece of evidence from both sides
    cm_parsed: list[EvidenceParsed] = [
        EvidenceParsed(
            evidenceId=ev.evidenceId,
            submittedBy=ev.submittedBy,
            type=ev.type,
            parsedSignals=parse_evidence_text(ev.text),
        )
        for ev in request.cardMemberEvidence
    ]
    m_parsed: list[EvidenceParsed] = [
        EvidenceParsed(
            evidenceId=ev.evidenceId,
            submittedBy=ev.submittedBy,
            type=ev.type,
            parsedSignals=parse_evidence_text(ev.text),
        )
        for ev in request.merchantEvidence
    ]

    # Also parse the card member's free-text statement as evidence, since
    # it's often the richest source of signal (e.g. "not received")
    statement_signal = parse_evidence_text(request.disputeDetails.cardMemberStatement)
    cm_parsed.append(EvidenceParsed(
        evidenceId="statement",
        submittedBy="cardMember",
        type="statement",
        parsedSignals=statement_signal,
    ))

    # 2. Evaluate weighted signals
    signals = evaluate_signals(
        card_member_evidence=cm_parsed,
        merchant_evidence=m_parsed,
        transaction_date=request.transaction.date,
        date_filed=request.disputeDetails.dateFiled,
    )

    # 3. Compute normalized score
    score_result = compute_final_score(signals)

    # 4. Build explainable decision
    decision = build_decision(signals, score_result["normalizedConfidence"])

    return ScoreResponse(
        disputeId=request.disputeId,
        parsedEvidence={
            "cardMemberEvidence": [e.model_dump() for e in cm_parsed],
            "merchantEvidence": [e.model_dump() for e in m_parsed],
        },
        scoring={
            "signals": [s.model_dump() for s in signals],
            "cardMemberScore": score_result["cardMemberScore"],
            "merchantScore": score_result["merchantScore"],
            "normalizedConfidence": score_result["normalizedConfidence"],
        },
        decision=decision,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
