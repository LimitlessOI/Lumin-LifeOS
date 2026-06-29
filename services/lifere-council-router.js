/**
 * SYNOPSIS: LifeRE council router — invokes live council when callCouncilMember provided.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickModel } from './lifere-model-router.js';
import { applyAiProseTruthEnvelope } from './ai-prose-truth-envelope.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function envelopeCouncilRoleProse(text, role) {
  const { text: safe, envelope } = applyAiProseTruthEnvelope(text, {
    source: 'lifere_council_router',
    taskType: 'lifere_council',
    command_truth: 'NO_COMMAND_RAN',
    pass_fail: 'NO_COMMAND_RAN',
  });
  return { summary: safe, truth_envelope: envelope, role };
}

function loadCouncilConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config/lifere-council-roles.json'), 'utf8'));
}

export function selectCouncilRoles({ intent = 'default', twins = {}, costSensitive = true }) {
  const cfg = loadCouncilConfig();
  const text = String(intent).toLowerCase();
  let roles = ['Chair'];

  for (const [key, roleList] of Object.entries(cfg.intent_regex_map || {})) {
    if (key === 'default') continue;
    if (new RegExp(key, 'i').test(text)) roles = [...new Set([...roles, ...roleList])];
  }

  if (costSensitive && !roles.includes('CFO')) roles.push('CFO');
  return roles;
}

export async function runCouncilDeliberation({
  intent,
  message,
  userId = 'adam',
  twins = {},
  callCouncilMember = null,
  logger = console,
}) {
  const roles = selectCouncilRoles({ intent, twins });
  const cfg = loadCouncilConfig();
  const modelPick = pickModel({ taskComplexity: roles.length > 3 ? 'high' : 'low' });

  const role_outputs = [];
  for (const role of roles) {
    const key = role.replace(/ /g, '_');
    const spec = cfg.roles?.[key] || cfg.roles?.[role];
    let summary = `${role} reviewed: ${message?.slice(0, 120) || intent}`;

    if (callCouncilMember && role !== 'CFO') {
      try {
        const prompt = `[LifeRE ${role}] Intent: ${intent}\nUser: ${userId}\nMessage: ${message || ''}\nRespond in 2-3 sentences as ${role}. Label uncertainty THINK if inferring.`;
        const member = role === 'Chair' ? 'anthropic' : 'gemini';
        const raw = await callCouncilMember(member, prompt, { maxTokens: 300, taskType: 'lifere_council' });
        const rawText = typeof raw === 'string' ? raw : raw?.content || summary;
        const enveloped = envelopeCouncilRoleProse(rawText, role);
        summary = enveloped.summary;
      } catch (err) {
        logger.warn?.(`[lifere-council] ${role} skip:`, err.message);
      }
    }

    role_outputs.push({
      role,
      advisory: spec?.authority_ceiling === 'advisory' || String(spec?.authority_ceiling || '').includes('advisory'),
      summary,
    });
  }

  let chair_answer = role_outputs.find((r) => r.role === 'Chair')?.summary
    || `Chair synthesis for "${intent}": ${message?.slice(0, 200) || 'No message'}`;

  if (callCouncilMember) {
    try {
      const synthesisPrompt = `Synthesize these council role notes into plain English for the founder (2-4 sentences):\n${role_outputs.map((r) => `${r.role}: ${r.summary}`).join('\n')}`;
      const raw = await callCouncilMember('anthropic', synthesisPrompt, { maxTokens: 400, taskType: 'lifere_chair' });
      const rawText = typeof raw === 'string' ? raw : raw?.content || chair_answer;
      chair_answer = envelopeCouncilRoleProse(rawText, 'Chair').summary;
    } catch {
      /* keep role_outputs chair */
    }
  }

  const receiptPath = `products/receipts/LIFERE_COUNCIL_${Date.now()}.json`;
  try {
    fs.mkdirSync(path.join(ROOT, 'products/receipts'), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, receiptPath),
      `${JSON.stringify({ schema: 'lifere_council_v1', intent, userId, roles, chair_answer, at: new Date().toISOString() }, null, 2)}\n`
    );
  } catch {
    /* non-fatal */
  }

  return {
    ok: true,
    chair_answer,
    role_outputs,
    receipt_path: receiptPath,
    roles_invoked: roles,
    model: modelPick,
    live_council: Boolean(callCouncilMember),
    counsel_only: true,
    command_truth: 'NO_COMMAND_RAN',
  };
}

export function createLifeRECouncilRouter({ callCouncilMember = null, logger = console } = {}) {
  return {
    selectCouncilRoles,
    runCouncilDeliberation: (opts) => runCouncilDeliberation({ ...opts, callCouncilMember, logger }),
    loadCouncilConfig,
  };
}
