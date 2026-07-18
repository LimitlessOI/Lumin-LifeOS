/**
 * SYNOPSIS: Exports formatExpirySweepReport — services/site-builder-preview-expiry-ui.js.
 */
export function formatExpirySweepReport(swept) {
  const count = swept.length;
  const ids = swept.map(item => `<li>${item.previewId} (expired at ${item.expiredAt})</li>`).join('');
  return `<h3>Expiry Sweep Report</h3><p>Total expired: ${count}</p><ul>${ids}</ul>`;
}

export function getExpirySweepStatusBadge(lastRanAt) {
  if (!lastRanAt) {
    return 'Never run';
  }
  const now = new Date();
  const lastRan = new Date(lastRanAt);
  const diffMs = now - lastRan;
  const diffMin = Math.floor(diffMs / 60000);
  return `Last ran: ${diffMin} min ago`;
}
