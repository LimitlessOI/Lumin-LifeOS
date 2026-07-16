/**
 * SYNOPSIS: Service module — Approval System.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
const commitments = new Map();

function addCommitment(id) {
  commitments.set(id, { status: 'pending' });
}

function approveCommitment(id) {
  if (commitments.has(id)) {
    commitments.set(id, { status: 'approved' });
    return true;
  }
  return false;
}

function rejectCommitment(id) {
  if (commitments.has(id)) {
    commitments.set(id, { status: 'rejected' });
    return true;
  }
  return false;
}

function getCommitmentStatus(id) {
  if (commitments.has(id)) {
    return commitments.get(id).status;
  }
  return null;
}

export { approveCommitment, rejectCommitment, addCommitment, getCommitmentStatus };