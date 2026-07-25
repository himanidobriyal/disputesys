const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the Python FastAPI /score endpoint with the full dispute payload
 * and returns the parsed evidence, scoring, and decision blocks.
 */
async function scoreDispute(dispute) {
  const payload = {
    disputeId: dispute.disputeId,
    transaction: dispute.transaction,
    disputeDetails: dispute.disputeDetails,
    cardMemberEvidence: dispute.cardMemberEvidence.map((e) => ({
      evidenceId: e.evidenceId,
      submittedBy: e.submittedBy,
      type: e.type,
      text: e.text,
    })),
    merchantEvidence: dispute.merchantEvidence.map((e) => ({
      evidenceId: e.evidenceId,
      submittedBy: e.submittedBy,
      type: e.type,
      text: e.text,
    })),
  };

  const response = await axios.post(`${AI_SERVICE_URL}/score`, payload);
  return response.data; // { disputeId, parsedEvidence, scoring, decision }
}

module.exports = { scoreDispute };
