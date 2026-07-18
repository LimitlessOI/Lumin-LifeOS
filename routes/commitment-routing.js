/**
 * SYNOPSIS: EXISTING FILE CONTENT
 */
// EXISTING FILE CONTENT

import express from 'express';

const router = express.Router();

function getCommitments(req, res) {
  res.send('Get all commitments');
}

function createCommitment(req, res) {
  res.send('Create a new commitment');
}

function updateCommitment(req, res) {
  res.send('Update an existing commitment');
}

function deleteCommitment(req, res) {
  res.send('Delete a commitment');
}

function registerCommitmentRoutes(app) {
  app.use('/commitments', router);
}

router.get('/', getCommitments);
router.post('/', createCommitment);
router.put('/:id', updateCommitment);
router.delete('/:id', deleteCommitment);

export { registerCommitmentRoutes };
