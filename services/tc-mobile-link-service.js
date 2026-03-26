/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-mobile-link-service.js
 * Signed mobile action links for one-tap approval and alert actions.
 */

import crypto from 'crypto';

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString();
}

function getSecret() {
  return process.env.TCO_ENCRYPTION_KEY || process.env.COMMAND_CENTER_KEY || process.env.TWILIO_AUTH_TOKEN || null;
}

function signPayload(payload) {
  const secret = getSecret();
  if (!secret) throw new Error('Mobile link signing secret is not configured');
  const encoded = base64urlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  const secret = getSecret();
  if (!secret) throw new Error('Mobile link signing secret is not configured');
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) throw new Error('Malformed token');
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid token signature');
  }
  const payload = JSON.parse(base64urlDecode(encoded));
  if (!payload.exp || Date.now() > payload.exp) throw new Error('Token expired');
  return payload;
}

function buildReviewUrl(transactionId, baseUrl) {
  if (!transactionId || !baseUrl) return null;
  return `${String(baseUrl).replace(/\/$/, '')}/tc?tx=${transactionId}`;
}

export function createTCMobileLinkService({ baseUrl = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || '' } = {}) {
  function createApprovalLink(approval, { action = 'approve', ttlMinutes = 120 } = {}) {
    const exp = Date.now() + (Math.max(5, Number(ttlMinutes) || 120) * 60 * 1000);
    const payload = {
      kind: 'approval',
      target_id: approval.id,
      transaction_id: approval.transaction_id,
      action,
      exp,
      review_url: buildReviewUrl(approval.transaction_id, baseUrl),
    };
    const token = signPayload(payload);
    const root = String(baseUrl || '').replace(/\/$/, '');
    return {
      token,
      expires_at: new Date(exp).toISOString(),
      execute_url: root ? `${root}/api/v1/tc/mobile-links/execute?token=${encodeURIComponent(token)}` : null,
      review_url: payload.review_url,
    };
  }

  function createAlertLink(alert, { action = 'acknowledge', ttlMinutes = 120 } = {}) {
    const exp = Date.now() + (Math.max(5, Number(ttlMinutes) || 120) * 60 * 1000);
    const payload = {
      kind: 'alert',
      target_id: alert.id,
      transaction_id: alert.transaction_id,
      action,
      exp,
      review_url: buildReviewUrl(alert.transaction_id, baseUrl),
    };
    const token = signPayload(payload);
    const root = String(baseUrl || '').replace(/\/$/, '');
    return {
      token,
      expires_at: new Date(exp).toISOString(),
      execute_url: root ? `${root}/api/v1/tc/mobile-links/execute?token=${encodeURIComponent(token)}` : null,
      review_url: payload.review_url,
    };
  }

  return {
    createApprovalLink,
    createAlertLink,
    verifyToken,
  };
}

export default createTCMobileLinkService;
