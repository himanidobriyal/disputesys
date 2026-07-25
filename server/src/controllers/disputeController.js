const Dispute = require('../models/Dispute');
const { scoreDispute } = require('../services/aiService');

// POST /api/disputes
async function createDispute(req, res) {
  try {
    const {
      disputeId,
      cardMemberId,
      merchantId,
      transaction,
      disputeDetails,
      cardMemberEvidence = [],
    } = req.body;

    if (!disputeId || !cardMemberId || !merchantId || !transaction || !disputeDetails) {
      return res.status(400).json({ error: 'Missing required dispute fields.' });
    }

    const dispute = await Dispute.create({
      disputeId,
      cardMemberId,
      merchantId,
      transaction,
      disputeDetails,
      cardMemberEvidence,
      status: {
        current: 'evidence_pending',
        timeline: [{ stage: 'dispute_filed' }],
      },
    });

    res.status(201).json(dispute);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'disputeId already exists.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create dispute.' });
  }
}

// POST /api/disputes/:id/evidence
// body: { submittedBy: 'cardMember' | 'merchant', type, text, evidenceId }
async function addEvidence(req, res) {
  try {
    const { id } = req.params;
    const { submittedBy, type, text, evidenceId, fileUrl } = req.body;

    if (!submittedBy || !type || !text || !evidenceId) {
      return res.status(400).json({ error: 'Missing required evidence fields.' });
    }

    const dispute = await Dispute.findOne({ disputeId: id });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found.' });

    const evidenceItem = { evidenceId, submittedBy, type, text, fileUrl };

    if (submittedBy === 'cardMember') {
      dispute.cardMemberEvidence.push(evidenceItem);
    } else {
      dispute.merchantEvidence.push(evidenceItem);
    }

    dispute.status.timeline.push({
      stage: submittedBy === 'cardMember' ? 'cardmember_evidence_submitted' : 'merchant_evidence_submitted',
    });

    await dispute.save();
    res.status(200).json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add evidence.' });
  }
}

// POST /api/disputes/:id/score
// Triggers the AI service, stores scoring + decision back on the dispute
async function scoreDisputeController(req, res) {
  try {
    const { id } = req.params;
    const dispute = await Dispute.findOne({ disputeId: id });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found.' });

    if (dispute.cardMemberEvidence.length === 0 || dispute.merchantEvidence.length === 0) {
      return res.status(400).json({
        error: 'Both card member and merchant evidence are required before scoring.',
      });
    }

    dispute.status.current = 'scoring';
    dispute.status.timeline.push({ stage: 'ai_scoring_started' });
    await dispute.save();

    const aiResult = await scoreDispute(dispute);

    dispute.scoring = aiResult.scoring;
    dispute.decision = aiResult.decision;
    dispute.status.current = aiResult.decision.requiresHumanReview ? 'escalated' : 'resolved';
    dispute.status.timeline.push({ stage: 'ai_scoring_complete' });
    if (!aiResult.decision.requiresHumanReview) {
      dispute.status.timeline.push({ stage: 'resolved' });
    }

    await dispute.save();
    res.status(200).json(dispute);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to score dispute.', details: err.message });
  }
}

// GET /api/disputes/:id
async function getDispute(req, res) {
  try {
    const dispute = await Dispute.findOne({ disputeId: req.params.id });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found.' });
    res.status(200).json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dispute.' });
  }
}

// GET /api/disputes
async function listDisputes(req, res) {
  try {
    const disputes = await Dispute.find().sort({ createdAt: -1 });
    res.status(200).json(disputes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch disputes.' });
  }
}

module.exports = {
  createDispute,
  addEvidence,
  scoreDisputeController,
  getDispute,
  listDisputes,
};
