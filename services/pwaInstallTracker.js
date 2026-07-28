/**
 * SYNOPSIS: Tracks a PWA installation and increments the install count.
 */
// services/pwaInstallTracker.js

let installCount = 0;

/**
 * Tracks a PWA installation and increments the install count.
 */
function trackPwaInstall() {
  installCount += 1;
  console.log(`PWA Installations: ${installCount}`);
}

export { trackPwaInstall };
