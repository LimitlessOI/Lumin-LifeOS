/**
 * SYNOPSIS: Receptionist service for AI Receptionist blueprint; creates Vapi agent payloads and routes calls through Council AI.
 * WIRED: service factory only; intended for route/controller registration via existing factory pattern
 * @ssot docs/products/AI_RECEPTIONIST/AI_RECEPTIONIST_HOME.md
 */

const DEFAULT_AGENT_NAME = 'LifeOS Receptionist';
const DEFAULT_TASK_TYPE = 'general';

function toJsonText(value) {
  return JSON.stringify(value ?? {});
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function coerceString(value, fallback = '') {
  const text = normalizeText(value);
  return text || fallback;
}

function buildReceptionistScript(input = {}) {
  const businessName = coerceString(
    input.businessName ||
      input.companyName ||
      input.orgName ||
      input.name ||
      input.brandName,
    'the business',
  );

  const greeting = coerceString(
    input.greeting ||
      input.opening ||
      input.welcome ||
      `Thanks for calling ${businessName}. How can I help you today?`,
  );

  const style = coerceString(input.style || input.tone || input.voice, 'warm, concise, and helpful');
  const callHandling = coerceString(
    input.callHandling ||
      input.instructions ||
      input.script ||
      `Greet the caller, identify the reason for the call, collect the key details, and route the call to the right person or next step.`,
  );

  const fallback = coerceString(
    input.fallback ||
      input.overflow ||
      `If you cannot resolve the request immediately, take a clear message, confirm the caller's name and callback number, and explain the next step.`,
  );

  const hours = coerceString(input.hours || input.businessHours || '');
  const extras = [];

  if (hours) extras.push(`Business hours: ${hours}`);
  if (input.transferRules) extras.push(`Transfer rules: ${coerceString(input.transferRules)}`);
  if (input.escalation) extras.push(`Escalation: ${coerceString(input.escalation)}`);
  if (input.notes) extras.push(`Notes: ${coerceString(input.notes)}`);

  const lines = [
    `You are the receptionist for ${businessName}.`,
    `Style: ${style}.`,
    `Greeting: ${greeting}`,
    `Primary handling: ${callHandling}`,
    `Fallback: ${fallback}`,
    ...extras,
  ];

  return lines.filter(Boolean).join('\n');
}

function createReceptionistService({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function createVapiAgent({ ownerId, name, script, metadata } = {}) {
    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }

    const agentName = coerceString(name, DEFAULT_AGENT_NAME);
    const receptionistScript = coerceString(script, '');

    if (!receptionistScript) {
      const err = new Error('script_required');
      err.status = 400;
      throw err;
    }

    const agentConfig = {
      name: agentName,
      ownerId,
      provider: 'vapi',
      taskType: DEFAULT_TASK_TYPE,
      script: receptionistScript,
      metadata: metadata || {},
    };

    const { rows } = await pool.query(
      `INSERT INTO receptionist_agents
         (owner_id, name, provider, task_type, script, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [ownerId, agentName, 'vapi', DEFAULT_TASK_TYPE, receptionistScript, toJsonText(metadata || {})],
    );

    return {
      agent: rows[0],
      config: agentConfig,
    };
  }

  async function generateScriptFromInput({ input, ownerId } = {}) {
    const promptInput = input || {};
    const task = buildReceptionistScript(promptInput);

    const result = await callCouncilMember('Council AI', task, { taskType: 'general' });

    const generated =
      typeof result === 'string'
        ? result
        : result?.output ??
          result?.text ??
          result?.content ??
          result?.message ??
          result?.response ??
          '';

    const script = coerceString(generated, task);

    return {
      ownerId: ownerId || null,
      script,
      input: promptInput,
    };
  }

  async function createReceptionistAgent({ ownerId, name, input, script, metadata } = {}) {
    const resolvedOwnerId = ownerId || null;
    if (!resolvedOwnerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }

    let finalScript = coerceString(script, '');
    if (!finalScript) {
      const generated = await generateScriptFromInput({ input, ownerId: resolvedOwnerId });
      finalScript = generated.script;
    }

    return createVapiAgent({
      ownerId: resolvedOwnerId,
      name,
      script: finalScript,
      metadata: {
        ...(metadata || {}),
        source: 'receptionist_service',
      },
    });
  }

  async function routeCall({ ownerId, agentId, call, input, metadata } = {}) {
    const resolvedOwnerId = ownerId || null;
    if (!resolvedOwnerId) {
      const err = new Error('owner_id_required');
      err.status = 401;
      throw err;
    }

    let agent = null;

    if (agentId) {
      const { rows } = await pool.query(
        `SELECT * FROM receptionist_agents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [agentId, resolvedOwnerId],
      );
      agent = rows[0] || null;
      if (!agent) {
        const err = new Error('agent_not_found');
        err.status = 404;
        throw err;
      }
    } else {
      const created = await createReceptionistAgent({
        ownerId: resolvedOwnerId,
        name: input?.name || DEFAULT_AGENT_NAME,
        input,
        script: input?.script,
        metadata,
      });
      agent = created.agent;
    }

    const routingRequest = [
      `Route this inbound call to the receptionist flow.`,
      `Caller context: ${coerceString(call?.from || call?.caller || call?.phone || 'unknown')}`,
      `Call purpose: ${coerceString(call?.purpose || call?.reason || call?.summary || input?.purpose || input?.reason || 'general inquiry')}`,
      `Use the registered receptionist agent and provide a concise, helpful response.`,
    ].join('\n');

    const councilResponse = await callCouncilMember('Council AI', routingRequest, { taskType: 'general' });

    return {
      agent,
      call: call || null,
      routing: {
        routed: true,
        response: councilResponse ?? null,
      },
    };
  }

  async function getAgentById(agentId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM receptionist_agents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [agentId, ownerId],
    );
    return rows[0] || null;
  }

  async function listAgents(ownerId, { limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM receptionist_agents WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  return {
    createVapiAgent,
    generateScriptFromInput,
    createReceptionistAgent,
    routeCall,
    getAgentById,
    listAgents,
  };
}

export { createReceptionistService };
export const receptionistService = {
  createReceptionistService,
};