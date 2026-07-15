/**
 * SYNOPSIS: Exports formatExpirySweepReport — services/site-builder-preview-expiry-ui.js.
 */
export function formatExpirySweepReport(swept) {
  const count = swept.length;
  const ids = swept.map(item => item.previewId).join(', ');
  return `<div>Expired Previews: ${count}</div><div>Preview IDs: ${ids}</div>`;
}

export function getExpirySweepStatusBadge(lastRanAt) {
  if (!lastRanAt) {
    return 'Never run';
  }
  const now = new Date();
  const diffMs = now - new Date(lastRanAt);
  const diffMinutes = Math.floor(diffMs / 60000);
  return `Last ran: ${diffMinutes} min ago`;
}
