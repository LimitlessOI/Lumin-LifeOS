/**
 * SYNOPSIS: Exports createEaiRoutes — routes/egress-proxy-routes.js.
 */
import express from 'express';

const REDACTION_TOKEN = '[REDACTED]';

function asText(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function redactSensitiveText(text) {
  let redacted = asText(text);

  redacted = redacted.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    REDACTION_TOKEN,
  );

  redacted = redacted.replace(
    /\b(?:\+?\d[\d\s().-]{7,}\d)\b/g,
    REDACTION_TOKEN,
  );

  redacted = redacted.replace(
    /\b(?:\d[ -]*?){13,19}\b/g,
    REDACTION_TOKEN,
  );

  redacted = redacted.replace(
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    REDACTION_TOKEN,
  );

  redacted = redacted.replace(
    /\b(?:sk-[A-Za-z0-9]{16,}|rk-[A-Za-z0-9]{16,}|pk_live_[A-Za-z0-9]{16,}|pk_test_[A-Za-z0-9]{16,})\b/g,
    REDACTION_TOKEN,
  );

  return redacted;
}

function normalizeMetadata(metadata) {
  const parsed = safeJsonParse(metadata, metadata);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function buildScrubbedPayload({ prompt, metadata }) {
  const scrubbedPrompt = redactSensitiveText(asText(prompt));
  const scrubbedMetadata = JSON.parse(JSON.stringify(normalizeMetadata(metadata), (_key, value) => {
    if (typeof value === 'string') return redactSensitiveText(value);
    return value;
  }));

  return {
    prompt: scrubbedPrompt,
    metadata: scrubbedMetadata,
  };
}

function buildResponseData({ prompt, metadata }) {
  return {
    ...buildScrubbedPayload({ prompt, metadata }),
  };
}

export function createEaiRoutes({ pool, requireKey, logger }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  const router = express.Router();

  router.post('/api/v1/egress-proxy', requireKey, async (req, res, next) => {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

    try {
      const body = req?.body && typeof req.body === 'object' ? req.body : {};
      const prompt = body.prompt ?? '';
      const metadata = normalizeMetadata(body.metadata);

      const data = buildResponseData({ prompt, metadata });

      await pool.query(
        `INSERT INTO audit_logs (actor, prompt, response, data_classification)
         VALUES ($1, $2, $3, $4)`,
        [
          asText(ownerId),
          asText(prompt),
          JSON.stringify(data),
          asText(metadata?.dataClassification || 'restricted'),
        ],
      );

      return res.status(200).json({ ok: true, data });
    } catch (error) {
      if (logger && typeof logger.error === 'function') {
        logger.error({ err: error }, 'egress_proxy_failed');
      }
      return next(error);
    }
  });

  return router;
}