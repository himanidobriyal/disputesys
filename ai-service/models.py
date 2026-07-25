from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class EvidenceInput(BaseModel):
    evidenceId: str
    submittedBy: Literal["cardMember", "merchant"]
    type: str  # e.g. invoice, communication_log, proof_of_delivery, chat_log
    text: str  # raw text content (OCR'd or typed) to be parsed


class TransactionInfo(BaseModel):
    merchant: str
    amount: float
    date: str  # YYYY-MM-DD


class DisputeDetails(BaseModel):
    reasonCode: str
    reasonDescription: str
    dateFiled: str
    cardMemberStatement: str


class ScoreRequest(BaseModel):
    disputeId: str
    transaction: TransactionInfo
    disputeDetails: DisputeDetails
    cardMemberEvidence: List[EvidenceInput]
    merchantEvidence: List[EvidenceInput]


class ParsedSignal(BaseModel):
    extractedDates: List[str] = []
    extractedAmounts: List[float] = []
    keyPhrases: List[str] = []
    sentiment: str = "neutral"
    confidence: float = 0.5


class EvidenceParsed(BaseModel):
    evidenceId: str
    submittedBy: str
    type: str
    parsedSignals: ParsedSignal


class ScoringSignal(BaseModel):
    factor: str
    party: Literal["cardMember", "merchant"]
    weight: float
    confidence: float
    contribution: float
    explanation: str


class ScoringResult(BaseModel):
    signals: List[ScoringSignal]
    cardMemberScore: float
    merchantScore: float
    normalizedConfidence: dict


class Decision(BaseModel):
    recommendedOutcome: str
    confidence: float
    decisionTier: Literal["auto_resolve", "needs_more_evidence", "escalate_to_human"]
    reasoning: List[str]
    requiresHumanReview: bool


class ScoreResponse(BaseModel):
    disputeId: str
    parsedEvidence: dict
    scoring: ScoringResult
    decision: Decision
