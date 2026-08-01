/**
 * SYNOPSIS: services/commitment-seeder.js
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// services/commitment-seeder.js

export const seedCommitments = () => {
  const commitments = [
    // 26, Adam
    { id: 26, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    // 27, Adam
    { id: 27, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    // 28, Adam
    { id: 28, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    // 29, Adam
    { id: 29, missionId: 'MISSION-0001', userId: 'Adam', status: 'active' },
    // 30, Sherry
    { id: 30, missionId: 'MISSION-0001', userId: 'Sherry', status: 'active' },
    // 31, Sherry
    { id: 31, missionId: 'MISSION-0001', userId: 'Sherry', status: 'active' },
    // 32, Sherry
    { id: 32, missionId: 'MISSION-0001', userId: 'Sherry', status: 'active' },
    // 33, pending approval
    { id: 33, missionId: 'MISSION-0001', userId: 'Sherry', status: 'pendingApproval' }
  ];

  // Logic to insert commitments into the database or relevant storage
  // Example: database.insert(commitments);

  return commitments;
};
