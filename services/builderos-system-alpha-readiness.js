// services/builderos-system-alpha-readiness.js
const path = require('path');
const fs = require('fs');

try {
  const legacyRedirectDeployed = fs.readFileSync(path.join(ROOT, 'routes/public-routes.js'), 'utf8').includes('redirect(301');
} catch (error) {
  const legacyRedirectDeployed = false;
}

const blockers = [
  ...(legacyRedirectDeployed ? [] : [
    { code: 'LEGACY_AUTHORITY_SURFACES_STILL_LIVE', detail: 'Legacy command-center HTML surface redirect not detected. Phase 26 not yet deployed.' },
  ]),
  // ... rest of the blockers array remains unchanged ...
];