/**
 * SYNOPSIS: services/commitment-seeder.js
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// services/commitment-seeder.js

export const seedCommitments = () => {
  const commitments = [
    { id: 26, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    { id: 27, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    { id: 28, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    { id: 29, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    { id: 30, missionId: 'MISSION-0001', userId: 'Sherry', status: 'active' },
    { id: 31, missionId: 'MISSION-0001', userId: 'Sherry', status: 'active' },
    { id: 32, missionId: 'MISSION-0001', userId: 'Sherry', status: 'active' },
    { id: 33, missionId: 'MISSION-0001', userId: 'Sherry', status: 'pendingApproval' }
  ];

  // Logic to insert commitments into the database or relevant storage
  // Example: database.insert(commitments);

  return commitments;
};
