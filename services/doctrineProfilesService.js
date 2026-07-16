/**
 * SYNOPSIS: Existing code in the file
 */
// Existing code in the file
const profiles = [
  { id: 1, name: 'Doctrine Alpha', details: 'Details for Doctrine Alpha' },
  { id: 2, name: 'Doctrine Beta', details: 'Details for Doctrine Beta' }
];

export function getDoctrineDetails(id) {
  return profiles.find(profile => profile.id === id)?.details || 'Profile not found';
}

// New code to prepare ready-under-test doctrine-specific profiles
export function prepareDoctrineProfilesForTesting() {
  return profiles.map(profile => ({
    ...profile,
    isReadyForTest: true
  }));
}

export { profiles };
