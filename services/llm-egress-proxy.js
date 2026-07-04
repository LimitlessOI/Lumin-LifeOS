/**
 * SYNOPSIS: Exports createLlmEgressProxy — services/llm-egress-proxy.js.
 */
import { randomUUID } from 'node:crypto';

const DEFAULT_TASK_TYPE = 'general';
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

function buildPromptPayload({ prompt, metadata }) {
  const base = {
    prompt: asText(prompt),
  };

  if (metadata && typeof metadata === 'object') {
    base.metadata = metadata;
  }

  return base;
}

function normalizeCouncilResponse(result, redactedPrompt) {
  if (result && typeof result === 'object') {
    if (typeof result.redactedText === 'string') {
      return result.redactedText;
    }
    if (typeof result.text === 'string') {
      return result.text;
    }
    if (typeof result.output === 'string') {
      return result.output;
    }
  }
  return redactedPrompt;
}

export function createLlmEgressProxy({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function logAuditEntry({ prompt, response, actor, dataClassification }) {
    const auditId = randomUUID();
    await pool.query(
      `INSERT INTO audit_logs (id, prompt, response, actor, data_classification)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        auditId,
        asText(prompt),
        asText(response),
        asText(actor),
        asText(dataClassification),
      ],
    );
    return auditId;
  }

  async function redactPrompt(prompt, metadata = {}) {
    const taskType = metadata.taskType || DEFAULT_TASK_TYPE;
    const councilResult = await callCouncilMember(
      'spaCy',
      buildPromptPayload({ prompt, metadata }),
      { taskType },
    );

    const redactedPrompt = redactSensitiveText(asText(prompt));
    const normalized = normalizeCouncilResponse(councilResult, redactedPrompt);

    return {
      redactedPrompt: normalized,
      councilResult,
      dataClassification: metadata.dataClassification || 'restricted',
    };
  }

  async function proxyRequest({ actor, prompt, metadata = {} }) {
    const rawPrompt = asText(prompt).trim();
    if (!rawPrompt) {
      const err = new Error('prompt_required');
      err.status = 400;
      throw err;
    }

    const redaction = await redactPrompt(rawPrompt, metadata);
    const responsePayload = {
      id: randomUUID(),
      redacted_prompt: redaction.redactedPrompt,
      data_classification: redaction.dataClassification,
    };

    await logAuditEntry({
      prompt: rawPrompt,
      response: JSON.stringify(responsePayload),
      actor: asText(actor || 'system'),
      dataClassification: redaction.dataClassification,
    });

    return responsePayload;
  }

  async function proxyHttp(req, res) {
    const ownerId = req?.lifeosUser?.sub || null;
    if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

    try {
      const body = req?.body && typeof req.body === 'object' ? req.body : {};
      const prompt = body.prompt ?? body.raw_prompt ?? body.input ?? '';
      const metadata = safeJsonParse(body.metadata, body.metadata) || {};
      const result = await proxyRequest({
        actor: ownerId,
        prompt,
        metadata,
      });
      return res.status(200).json(result);
    } catch (error) {
      const status = error?.status || 500;
      return res.status(status).json({
        error: error?.message || 'llm_egress_proxy_failed',
      });
    }
  }

  return {
    redactPrompt,
    proxyRequest,
    proxyHttp,
  };
}