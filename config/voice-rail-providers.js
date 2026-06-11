/**
 * Voice Rail — pickable council engines per department (not Anthropic-only).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
/** Default picks shown in UI; memberKey must exist in council config on Railway. */
export const VOICE_RAIL_PROVIDER_PICKS = Object.freeze([
  { id: 'anthropic', memberKey: 'claude_sonnet', label: 'Anthropic', provider: 'anthropic' },
  { id: 'gemini', memberKey: 'gemini_flash', label: 'Gemini', provider: 'gemini' },
  { id: 'openai_path', memberKey: 'groq_llama', label: 'OpenAI-class (Groq)', provider: 'groq' },
  { id: 'deepseek', memberKey: 'deepseek', label: 'DeepSeek', provider: 'deepseek' },
  { id: 'cerebras', memberKey: 'cerebras_llama', label: 'Cerebras', provider: 'cerebras' },
]);

export const FOUNDER_CONTINUOUS_SESSION_TAG = 'founder_rail_continuous';

export function listVoiceRailProviderPicks(councilMembers) {
  return VOICE_RAIL_PROVIDER_PICKS.filter((p) => councilMembers?.[p.memberKey]).map((p) => {
    const cfg = councilMembers[p.memberKey] || {};
    return {
      id: p.id,
      member_key: p.memberKey,
      label: p.label,
      provider: cfg.provider || p.provider,
      model: cfg.model || null,
      display_name: cfg.name || p.label,
    };
  });
}

export function normalizeProviderMemberKey(raw, councilMembers, councilAliasMap) {
  const key = String(raw || '').trim();
  if (!key) return null;
  const resolved = councilAliasMap?.[key] || key;
  if (councilMembers?.[resolved]) return resolved;
  const pick = VOICE_RAIL_PROVIDER_PICKS.find((p) => p.id === key || p.memberKey === key);
  if (pick && councilMembers?.[pick.memberKey]) return pick.memberKey;
  return null;
}
