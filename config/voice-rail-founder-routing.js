/**
 * Founder Voice Rail — CFO-gated auto routing (cheap first, ramp on need).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import {
  getVoiceRailDepartment,
  normalizeVoiceRailDepartment,
  resolveDepartmentRouting,
} from './voice-rail-departments.js';

export const FOUNDER_AUTO_MEMBER = 'founder_auto';

/** Global ladder — cheapest capable engine first; CFO hat uses same policy. */
const TIER_LADDER = Object.freeze([
  ['gemini_flash', 'groq_llama', 'cerebras_llama'],
  ['deepseek'],
  ['openai_gpt'],
  ['claude_sonnet'],
]);

const DEPT_TIER_BIAS = Object.freeze({
  CFO: 0,
  ChC: 0,
  Hist: 0,
  BPB: 1,
  SDO: 1,
  SNT: 2,
  CDR: 2,
});

export function isFounderAutoMemberKey(raw) {
  const k = String(raw || '').trim().toLowerCase();
  return !k || k === 'auto' || k === FOUNDER_AUTO_MEMBER || k === 'founder_auto';
}

export function scoreFounderTaskTier(content, mode, intent, deptId) {
  const text = String(content || '').toLowerCase();
  let tier = DEPT_TIER_BIAS[normalizeVoiceRailDepartment(deptId)] ?? 0;

  if (['governance_correction', 'command'].includes(intent) || mode === 'command') tier = Math.max(tier, 3);
  if (mode === 'brainstorm' || intent === 'brainstorm') tier = Math.max(tier, 2);
  if (intent === 'commitment') tier = Math.max(tier, 1);

  if (/\b(really need to know|must know|critical|load.?bearing|architecture|council debate|prove it|root cause)\b/.test(text)) {
    tier = Math.max(tier, 3);
  }
  if (/\b(deploy|schema|migration|security|constitutional|ssot|blueprint)\b/.test(text)) {
    tier = Math.max(tier, 2);
  }
  if (text.length > 900) tier = Math.max(tier, 2);

  return Math.min(tier, TIER_LADDER.length - 1);
}

function firstAvailableMember(candidates, councilMembers) {
  for (const key of candidates) {
    if (councilMembers?.[key]) return key;
  }
  return null;
}

function pickMemberForTier(tier, councilMembers) {
  for (let t = tier; t >= 0; t -= 1) {
    const picked = firstAvailableMember(TIER_LADDER[t], councilMembers);
    if (picked) return { memberKey: picked, tier: t };
  }
  return { memberKey: 'gemini_flash', tier: 0 };
}

function explicitProviderFamily(memberKey, councilMembers, councilAliasMap) {
  const resolved = councilAliasMap?.[memberKey] || memberKey;
  const cfg = councilMembers?.[resolved] || {};
  return cfg.provider || resolved;
}

/** Within one provider family, pick cheapest rung unless tier demands escalation across ladder. */
function resolveExplicitMember(override, tier, councilMembers, councilAliasMap) {
  const key = String(override).trim();
  const resolved = councilAliasMap?.[key] || key;
  const provider = councilMembers?.[resolved]?.provider;

  if (provider === 'openai' && tier <= 1) {
    return councilMembers?.openai_gpt ? 'openai_gpt' : resolved;
  }
  if (provider === 'anthropic' && tier >= 3) {
    return councilMembers?.claude_sonnet ? 'claude_sonnet' : resolved;
  }
  if (provider === 'gemini') return councilMembers?.gemini_flash ? 'gemini_flash' : resolved;
  if (provider === 'groq') return councilMembers?.groq_llama ? 'groq_llama' : resolved;
  if (provider === 'deepseek') return councilMembers?.deepseek ? 'deepseek' : resolved;

  if (tier >= 3 && !['anthropic'].includes(provider)) {
    const up = pickMemberForTier(3, councilMembers);
    return up.memberKey;
  }

  return resolved;
}

export function describeRoutingTier(tier) {
  return ['economy', 'standard', 'deep', 'premium'][tier] || 'economy';
}

export function resolveFounderVoiceRailRouting({
  deptId,
  councilMemberOverride,
  councilMembers,
  councilAliasMap,
  content,
  mode,
  intent,
}) {
  const override = councilMemberOverride ? String(councilMemberOverride).trim() : '';
  let memberKey;
  let routingMeta;

  if (isFounderAutoMemberKey(override)) {
    const tier = scoreFounderTaskTier(content, mode, intent, deptId);
    const pick = pickMemberForTier(tier, councilMembers);
    memberKey = pick.memberKey;
    routingMeta = {
      mode: 'auto',
      tier: pick.tier,
      tier_label: describeRoutingTier(pick.tier),
      reason: `CFO auto — ${describeRoutingTier(pick.tier)} tier for ${intent || mode}`,
    };
  } else {
    const tier = scoreFounderTaskTier(content, mode, intent, deptId);
    memberKey = resolveExplicitMember(override, tier, councilMembers, councilAliasMap);
    routingMeta = {
      mode: 'explicit',
      tier,
      tier_label: describeRoutingTier(tier),
      provider_family: explicitProviderFamily(override, councilMembers, councilAliasMap),
      reason:
        tier >= 3
          ? 'Hard question — escalated within provider or to premium ladder'
          : 'Explicit engine — started cheap within provider family',
    };
  }

  const base = resolveDepartmentRouting(deptId, councilMembers, councilAliasMap, memberKey);
  const preferCheap =
    routingMeta.tier <= 1 && (base.provider === 'openai' || routingMeta.mode === 'auto');
  const modelId = resolveModelWithCheapPreference(base, preferCheap);

  return {
    ...base,
    modelId,
    routing_meta: routingMeta,
  };
}

function resolveModelWithCheapPreference(routing, preferCheap) {
  if (!preferCheap || routing.provider !== 'openai') return routing.modelId;
  return (
    process.env.OPENAI_CHEAP_MODEL?.trim() ||
    process.env.OPENAI_MINI_MODEL?.trim() ||
    'gpt-4o-mini'
  );
}
