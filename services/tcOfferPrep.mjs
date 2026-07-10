/**
 * SYNOPSIS: Exports runOfferPrep — services/tcOfferPrep.mjs.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
export async function runOfferPrep(deps, { agentId, propertyAddress, clientProfileId }) {
  if (!deps || typeof deps !== 'object') {
    throw new Error('deps is required');
  }
  const { pool, callCouncilMember, logger } = deps;
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('deps.pool with query() is required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('deps.callCouncilMember is required');
  }

  const clientProfile = await loadClientProfile(pool, clientProfileId);
  const comps = await loadRecentComps(deps, propertyAddress);

  const prompt = buildOfferPrepPrompt({
    agentId,
    propertyAddress,
    clientProfile,
    comps,
  });

  const raw = await callCouncilMember('offer-strategist', prompt);

  const parsed = parseStrategistResponse(raw);

  const output = {
    agentId: agentId ?? null,
    propertyAddress: propertyAddress ?? null,
    clientProfile,
    comps,
    offerPrice: parsed.offerPrice ?? null,
    terms: parsed.terms ?? null,
    contingencies: parsed.contingencies ?? [],
    contingencyLogic: parsed.contingencyLogic ?? null,
    rawResponse: raw,
  };

  const insertResult = await pool.query(
    `INSERT INTO tc_offer_prep_runs (agent_id, property_address, client_profile_id, output)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [agentId ?? null, propertyAddress ?? null, clientProfileId ?? null, JSON.stringify(output)]
  );

  const runId = insertResult?.rows?.[0]?.id ?? null;

  logger?.info?.('offer-prep completed', {
    runId,
    agentId: agentId ?? null,
    propertyAddress: propertyAddress ?? null,
    clientProfileId: clientProfileId ?? null,
  });

  return {
    offerPrice: parsed.offerPrice ?? null,
    terms: parsed.terms ?? null,
    contingencies: parsed.contingencies ?? [],
    runId,
  };
}

async function loadClientProfile(pool, clientProfileId) {
  if (!clientProfileId) return null;

  const result = await pool.query(
    `SELECT id, name, email, phone, no, setup_fee_waived, setup_paid, setup_paid_at, setup_paid_amt, monthly_fee, notes, created_at, updated_at
     FROM tc_agent_clients
     WHERE id = $1
     LIMIT 1`,
    [clientProfileId]
  );

  return result.rows[0] ?? null;
}

async function loadRecentComps(deps, propertyAddress) {
  const { pool, mlsClient, logger } = deps;

  if (typeof mlsClient === 'function') {
    const comps = await mlsClient(propertyAddress);
    return normalizeComps(comps);
  }

  logger?.warn?.('offer-prep missing deps.mlsClient; using empty comps');
  return [];
}

function normalizeComps(comps) {
  if (!comps) return [];
  if (Array.isArray(comps)) return comps;
  if (Array.isArray(comps.comps)) return comps.comps;
  if (Array.isArray(comps.results)) return comps.results;
  return [comps];
}

function buildOfferPrepPrompt({ agentId, propertyAddress, clientProfile, comps }) {
  return [
    'You are the offer strategist for a real estate offer-prep workflow.',
    'Use the provided client profile and comparable properties to recommend an offer price, terms, and contingency logic.',
    'Return STRICT JSON with keys: offerPrice, terms, contingencies, contingencyLogic.',
    'contingencies must be an array of concise contingency strings.',
    'terms should be a concise object or string describing offer terms.',
    '',
    `agentId: ${stringifyForPrompt(agentId)}`,
    `propertyAddress: ${stringifyForPrompt(propertyAddress)}`,
    `clientProfile: ${stringifyForPrompt(clientProfile)}`,
    `comps: ${stringifyForPrompt(comps)}`,
  ].join('\n');
}

function parseStrategistResponse(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  const json = extractJson(text);
  if (!json) {
    return {
      offerPrice: null,
      terms: null,
      contingencies: [],
      contingencyLogic: text || null,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      offerPrice: null,
      terms: null,
      contingencies: [],
      contingencyLogic: text || null,
    };
  }

  return {
    offerPrice: parsed.offerPrice ?? parsed.offer_price ?? null,
    terms: parsed.terms ?? null,
    contingencies: Array.isArray(parsed.contingencies) ? parsed.contingencies : [],
    contingencyLogic: parsed.contingencyLogic ?? parsed.contingency_logic ?? null,
  };
}

function extractJson(text) {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start =
    firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start === -1) return null;

  const endBrace = text.lastIndexOf('}');
  const endBracket = text.lastIndexOf(']');
  const end = Math.max(endBrace, endBracket);
  if (end === -1 || end <= start) return null;

  return text.slice(start, end + 1);
}

function stringifyForPrompt(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default {
  runOfferPrep,
};
