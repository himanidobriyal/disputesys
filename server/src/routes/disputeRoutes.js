const express = require('express');
const router = express.Router();
const {
  createDispute,
  addEvidence,
  scoreDisputeController,
  getDispute,
  listDisputes,
} = require('../controllers/disputeController');

router.post('/', createDispute);                  // POST /api/disputes
router.get('/', listDisputes);                     // GET  /api/disputes
router.get('/:id', getDispute);                     // GET  /api/disputes/:id
router.post('/:id/evidence', addEvidence);          // POST /api/disputes/:id/evidence
router.post('/:id/score', scoreDisputeController);  // POST /api/disputes/:id/score

module.exports = router;
