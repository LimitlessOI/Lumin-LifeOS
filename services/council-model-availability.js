/**
 * Provider-aware candidate filtering for council/builder routing.
 *
 * Runtime task authority can only make sensible choices if the candidate set
 * excludes models that are impossible to call on the current runtime.
 *
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import { createCouncilMembers } from '../config/council-members.js';

function loadCouncilMembers(env = process.env) {
  return createCouncilMembers({
    OLLAMA_ENDPOINT: env.OLLAMA_ENDPOINT,
    DEEPSEEK_BRIDGE_ENABLED: env.DEEPSEEK_BRIDGE_ENABLED,
  });
}

function envValue(name, env = process.env) {
  return String(env?.[name] || '').trim();
}

function hasAny(names, env = process.env) {
  return names.some((name) => envValue(name, env));
}

export function getCouncilMemberAvailability(memberKey, env = process.env) {
  const members = loadCouncilMembers(env);
  const config = members?.[memberKey];
  if (!config) {
    return { available: false, reason: 'unknown_model' };
  }

  switch (config.provider) {
    case 'anthropic':
      return hasAny(['LIFEOS_ANTHROPIC_KEY', 'ANTHROPIC_API_KEY'], env)
        ? { available: true, reason: 'anthropic_key_present' }
        : { available: false, reason: 'anthropic_api_key_missing' };

    case 'openrouter':
      return hasAny(['OPENROUTER_API_KEY'], env)
        ? { available: true, reason: 'openrouter_key_present' }
        : { available: false, reason: 'openrouter_api_key_missing' };

    case 'gemini':
    case 'google':
      return hasAny(['LIFEOS_GEMINI_KEY', 'GEMINI_API_KEY'], env)
        ? { available: true, reason: 'gemini_key_present' }
        : { available: false, reason: 'gemini_api_key_missing' };

    case 'groq':
      return hasAny(['GROQ_API_KEY'], env)
        ? { available: true, reason: 'groq_key_present' }
        : { available: false, reason: 'groq_api_key_missing' };

    case 'cerebras':
      return hasAny(['CEREBRAS_API_KEY'], env)
        ? { available: true, reason: 'cerebras_key_present' }
        : { available: false, reason: 'cerebras_api_key_missing' };

    case 'mistral':
      return hasAny(['MISTRAL_API_KEY'], env)
        ? { available: true, reason: 'mistral_key_present' }
        : { available: false, reason: 'mistral_api_key_missing' };

    case 'together':
      return hasAny(['TOGETHER_API_KEY'], env)
        ? { available: true, reason: 'together_key_present' }
        : { available: false, reason: 'together_api_key_missing' };

    case 'deepseek':
      if (config.useLocal) {
        return { available: true, reason: 'deepseek_bridge_enabled' };
      }
      return hasAny(['DEEPSEEK_API_KEY', 'Deepseek_API_KEY'], env)
        ? { available: true, reason: 'deepseek_key_present' }
        : { available: false, reason: 'deepseek_api_key_missing' };

    case 'ollama': {
      const ollamaMode = envValue('COUNCIL_OLLAMA_MODE', env) || 'last_resort';
      return ollamaMode === 'off'
        ? { available: false, reason: 'ollama_disabled' }
        : { available: true, reason: `ollama_mode_${ollamaMode}` };
    }

    default:
      return { available: true, reason: `provider_${config.provider || 'unknown'}_assumed_available` };
  }
}

export function filterAvailableCouncilMembers(memberKeys, env = process.env) {
  const unique = [...new Set((memberKeys || []).map((m) => String(m || '').trim()).filter(Boolean))];
  const available = [];
  const unavailable = [];
  const availabilityByModel = {};

  for (const memberKey of unique) {
    const availability = getCouncilMemberAvailability(memberKey, env);
    availabilityByModel[memberKey] = availability;
    if (availability.available) {
      available.push(memberKey);
    } else {
      unavailable.push({ model: memberKey, reason: availability.reason });
    }
  }

  return { available, unavailable, availabilityByModel };
}
