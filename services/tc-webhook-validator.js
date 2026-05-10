import crypto from 'crypto';
// @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
// tc-communication-callback-service.js
// Normalizes delivery/reply callbacks into canonical TC communication state. */
function normalizeProviderEvent(provider, payload = {}) {
  const p = String(provider || 'manual').toLowerCase();
  const event = String(
    payload.event_type || payload.eventType || payload.status || payload.MessageStatus || payload.SmsStatus || payload.EmailEvent || 'delivered'
  ).toLowerCase();
  let status = 'sent';
  if (['queued', 'accepted', 'scheduled', 'sending'].includes(event)) status = 'prepared';
  else if (['sent', 'delivered', 'success'].includes(event))