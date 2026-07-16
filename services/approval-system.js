/**
 * SYNOPSIS: Array to simulate a database for commitments
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// Array to simulate a database for commitments
const commitments = [];

// Function to add a new commitment (initially in 'pending' state)
function addCommitment(id, details) {
  commitments.push({ id, details, state: 'pending' });
}

// Function to approve a commitment
function approveCommitment(id) {
  const commitment = commitments.find(c => c.id === id);
  if (commitment && commitment.state === 'pending') {
    commitment.state = 'approved';
    return true;
  }
  return false;
}

// Function to reject a commitment
function rejectCommitment(id) {
  const commitment = commitments.find(c => c.id === id);
  if (commitment && commitment.state === 'pending') {
    commitment.state = 'rejected';
    return true;
  }
  return false;
}

// Exporting the functions to meet the export requirement
export { addCommitment, approveCommitment, rejectCommitment };
