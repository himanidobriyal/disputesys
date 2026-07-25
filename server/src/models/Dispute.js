const mongoose = require('mongoose');
const { Schema } = mongoose;

const EvidenceSchema = new Schema(
  {
    evidenceId: { type: String, required: true },
    submittedBy: { type: String, enum: ['cardMember', 'merchant'], required: true },
    type: { type: String, required: true }, // invoice, communication_log, proof_of_delivery, etc.
    text: { type: String, required: true }, // raw text content parsed by the AI service
    fileUrl: { type: String }, // optional, if a real file was uploaded
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ScoringSignalSchema = new Schema(
  {
    factor: String,
    party: { type: String, enum: ['cardMember', 'merchant'] },
    weight: Number,
    confidence: Number,
    contribution: Number,
    explanation: String,
  },
  { _id: false }
);

const TimelineEntrySchema = new Schema(
  {
    stage: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DisputeSchema = new Schema(
  {
    disputeId: { type: String, required: true, unique: true },
    cardMemberId: { type: String, required: true },
    merchantId: { type: String, required: true },

    transaction: {
      merchant: { type: String, required: true },
      amount: { type: Number, required: true },
      date: { type: String, required: true }, // YYYY-MM-DD
    },

    disputeDetails: {
      reasonCode: { type: String, required: true },
      reasonDescription: { type: String, required: true },
      dateFiled: { type: String, required: true }, // YYYY-MM-DD
      cardMemberStatement: { type: String, required: true },
    },

    cardMemberEvidence: [EvidenceSchema],
    merchantEvidence: [EvidenceSchema],

    scoring: {
      signals: [ScoringSignalSchema],
      cardMemberScore: Number,
      merchantScore: Number,
      normalizedConfidence: {
        cardMember: Number,
        merchant: Number,
      },
    },

    decision: {
      recommendedOutcome: { type: String, enum: ['cardMember', 'merchant'] },
      confidence: Number,
      decisionTier: {
        type: String,
        enum: ['auto_resolve', 'needs_more_evidence', 'escalate_to_human'],
      },
      reasoning: [String],
      requiresHumanReview: Boolean,
    },

    status: {
      current: {
        type: String,
        enum: [
          'submitted',
          'evidence_pending',
          'scoring',
          'resolved',
          'escalated',
        ],
        default: 'submitted',
      },
      timeline: [TimelineEntrySchema],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dispute', DisputeSchema);
