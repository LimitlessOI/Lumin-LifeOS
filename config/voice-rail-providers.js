/**
 * SYNOPSIS: Voice Rail — pickable council engines per department (not Anthropic-only).
 * Voice Rail — pickable council engines per department (not Anthropic-only).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
/** Default picks shown in UI; memberKey must exist in council config on Railway. */
export const VOICE_RAIL_PROVIDER_PICKS = Object.freeze([
  { id: 'auto', memberKey: 'founder_auto', label: 'Auto (CFO picks)', provider: 'lifeos' },
  { id: 'anthropic', memberKey: 'claude_sonnet', label: 'Anthropic Claude', provider: 'anthropic' },
  { id: 'openai', memberKey: 'openai_gpt', label: 'OpenAI GPT', provider: 'openai' },
  { id: 'gemini', memberKey: 'gemini_flash', label: 'Google Gemini', provider: 'gemini' },
  { id: 'groq', memberKey: 'groq_llama', label: 'Groq Llama (free fast)', provider: 'groq' },
  { id: 'deepseek', memberKey: 'deepseek', label: 'DeepSeek', provider: 'deepseek' },
  { id: 'cerebras', memberKey: 'cerebras_llama', label: 'Cerebras', provider: 'cerebras' },
]);

export const FOUNDER_CONTINUOUS_SESSION_TAG = 'founder_rail_continuous';

const PROVIDER_ENV_KEYS = Object.freeze({
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
});

export function providerEnvConfigured(provider) {
  const envName = PROVIDER_ENV_KEYS[provider];
  if (!envName) return true;
  return Boolean(process.env[envName]?.trim());
}

export function listVoiceRailProviderPicks(councilMembers) {
  return VOICE_RAIL_PROVIDER_PICKS.filter((p) => p.id === 'auto' || councilMembers?.[p.memberKey]).map((p) => {
    if (p.id === 'auto') {
      return {
        id: p.id,
        member_key: p.memberKey,
        label: p.label,
        provider: p.provider,
        model: null,
        display_name: 'LifeOS Auto (CFO)',
        configured: true,
        available: true,
      };
    }
    const cfg = councilMembers[p.memberKey] || {};
    const provider = cfg.provider || p.provider;
    const configured = providerEnvConfigured(provider);
    return {
      id: p.id,
      member_key: p.memberKey,
      label: p.label,
      provider,
      model: cfg.model || null,
      display_name: cfg.name || p.label,
      configured,
      available: configured,
    };
  }).filter((p) => p.available);
}

export function normalizeProviderMemberKey(raw, councilMembers, councilAliasMap) {
  const key = String(raw || '').trim();
  if (!key) return null;
  const resolved = councilAliasMap?.[key] || key;
  if (councilMembers?.[resolved]) return resolved;
  const pick = VOICE_RAIL_PROVIDER_PICKS.find((p) => p.id === key || p.memberKey === key);
  if (pick && (pick.id === 'auto' || councilMembers?.[pick.memberKey])) return pick.memberKey;
  return null;
}
