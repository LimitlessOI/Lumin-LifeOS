import crypto from 'crypto';
import { URL } from 'url'; // For Twilio URL parsing

// Internal helper to normalize provider events
function normalizeProviderEvent(provider, payload = {}) {
  const p = String(provider || 'manual').toLowerCase();
  const event = String(
    payload.event_type || payload.eventType || payload.status || payload.MessageStatus || payload.SmsStatus || payload.EmailEvent || 'delivered'
  ).toLowerCase();

  let status = 'sent';
  if (['queued', 'accepted', 'scheduled', 'sending'].includes(event)) status = 'prepared';
  else if (['sent', 'delivered', 'success'].includes(event)) status = 'sent';
  else if (['opened', 'read', 'seen'].includes(