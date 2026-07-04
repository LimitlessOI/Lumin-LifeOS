/**
 * SYNOPSIS: Exports createWhiteLabelService — services/white-label-service.js.
 */
import { callCouncilMember } from './council-member.js';

function asTrimmedString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function safeJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function sanitizeCouncilResponse(result) {
  if (result && typeof result === 'object') {
    if (Object.prototype.hasOwnProperty.call(result, 'response')) return result.response;
    if (Object.prototype.hasOwnProperty.call(result, 'content')) return result.content;
    if (Object.prototype.hasOwnProperty.call(result, 'output')) return result.output;
    if (Object.prototype.hasOwnProperty.call(result, 'data')) return result.data;
  }
  return result ?? null;
}

function stripInternalModelDetails(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value
      .replace(/\b(gpt-[\w.-]+|o\d(?:-\w+)?|claude-[\w.-]+|anthropic|openai)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (Array.isArray(value)) return value.map((item) => stripInternalModelDetails(item));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (/model|provider|engine|system_prompt|internal/i.test(key)) continue;
      out[key] = stripInternalModelDetails(val);
    }
    return out;
  }
  return value;
}

function normalizeBoolean(input) {
  if (typeof input === 'boolean') return input;
  if (input === 1 || input === '1' || input === 'true') return true;
  if (input === 0 || input === '0' || input === 'false') return false;
  return null;
}

function extractOwnerId(req) {
  return req?.lifeosUser?.sub || null;
}

export function createWhiteLabelService(pool, callCouncilMemberFn = callCouncilMember) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }

  async function invokeCouncil(prompt) {
    const result = await callCouncilMemberFn('openai', prompt, { taskType: 'general' });
    return stripInternalModelDetails(sanitizeCouncilResponse(result));
  }

  async function configureWhiteLabelPartner(req) {
    const body = req?.body || {};
    const ownerId = extractOwnerId(req);
    if (!ownerId) {
      const err = new Error('jwt_required');
      err.status = 401;
      throw err;
    }

    const clientId = asTrimmedString(body.client_id);
    const brandName = asTrimmedString(body.brand_name);
    const customDomain = asTrimmedString(body.custom_domain);
    const customLogo = asTrimmedString(body.custom_logo);
    const hideTiers = normalizeBoolean(body.hide_tiers);
    const hideModels = normalizeBoolean(body.hide_models);
    const hideCosts = normalizeBoolean(body.hide_costs);
    const hideArchitecture = normalizeBoolean(body.hide_architecture);
    const apiResponseFormat = asTrimmedString(body.api_response_format);

    if (!clientId) {
      const err = new Error('client_id_required');
      err.status = 400;
      throw err;
    }
    if (!brandName) {
      const err = new Error('brand_name_required');
      err.status = 400;
      throw err;
    }
    if (hideTiers === null) {
      const err = new Error('hide_tiers_required');
      err.status = 400;
      throw err;
    }
    if (hideModels === null) {
      const err = new Error('hide_models_required');
      err.status = 400;
      throw err;
    }
    if (hideCosts === null) {
      const err = new Error('hide_costs_required');
      err.status = 400;
      throw err;
    }
    if (hideArchitecture === null) {
      const err = new Error('hide_architecture_required');
      err.status = 400;
      throw err;
    }
    if (!apiResponseFormat) {
      const err = new Error('api_response_format_required');
      err.status = 400;
      throw err;
    }

    const aiSummary = await invokeCouncil(
      [
        'Normalize this white-label configuration for internal storage and response shaping.',
        `client_id: ${clientId}`,
        `brand_name: ${brandName}`,
        `custom_domain: ${customDomain}`,
        `custom_logo: ${customLogo}`,
        `hide_tiers: ${hideTiers}`,
        `hide_models: ${hideModels}`,
        `hide_costs: ${hideCosts}`,
        `hide_architecture: ${hideArchitecture}`,
        `api_response_format: ${apiResponseFormat}`,
        'Return a concise normalized summary without internal reasoning or model details.',
      ].join('\n'),
    );

    const { rows } = await pool.query(
      `INSERT INTO partner_configurations
         (owner_id, client_id, brand_name, custom_domain, custom_logo, ai_summary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
       ON CONFLICT (client_id)
       DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         brand_name = EXCLUDED.brand_name,
         custom_domain = EXCLUDED.custom_domain,
         custom_logo = EXCLUDED.custom_logo,
         ai_summary = EXCLUDED.ai_summary,
         updated_at = NOW()
       RETURNING *`,
      [
        ownerId,
        clientId,
        brandName,
        customDomain || null,
        customLogo || null,
        JSON.stringify({
          summary: aiSummary,
          config: {
            client_id: clientId,
            brand_name: brandName,
            custom_domain: customDomain || null,
            custom_logo: customLogo || null,
            hide_tiers: hideTiers,
            hide_models: hideModels,
            hide_costs: hideCosts,
            hide_architecture: hideArchitecture,
            api_response_format: apiResponseFormat,
          },
        }),
      ],
    );

    return rows[0] || null;
  }

  async function transformResponse(input) {
    const payload = safeJson(input, input);
    const aiResult = await invokeCouncil(
      [
        'Transform the following white-label response for partner-facing delivery.',
        'Strip internal model names, hidden implementation details, and provider-specific metadata.',
        `payload: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`,
        'Return the transformed response only.',
      ].join('\n'),
    );

    return stripInternalModelDetails(aiResult);
  }

  return {
    configureWhiteLabelPartner,
    transformResponse,
  };
}