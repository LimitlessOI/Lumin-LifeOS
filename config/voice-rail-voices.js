/**
 * SYNOPSIS: Voice Rail — reuse ElevenLabs voice catalog (same IDs as video-pipeline + founder env).
 * Voice Rail — reuse ElevenLabs voice catalog (same IDs as video-pipeline + founder env).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/** ElevenLabs built-in / project voices (also used by services/video-pipeline.js). */
export const ELEVENLABS_VOICE_CATALOG = Object.freeze({
  founder: {
    key: 'founder',
    label: 'Founder coaching',
    description: 'Adam coaching voice from ELEVENLABS_VOICE_ID',
    envVoiceId: 'ELEVENLABS_VOICE_ID',
    defaultId: '21m00Tcm4TlvDq8ikWAM',
  },
  professional: {
    key: 'professional',
    label: 'George — professional',
    description: 'Clear, steady narrator',
    defaultId: 'JBFqnCBsd6RMkjVDRZzb',
  },
  friendly: {
    key: 'friendly',
    label: 'Sarah — warm',
    description: 'Warm, approachable',
    defaultId: 'EXAVITQu4vr4xnSDxMaL',
  },
  energetic: {
    key: 'energetic',
    label: 'Daniel — energetic',
    description: 'Upbeat, confident',
    defaultId: 'onwK4e9ZLuTAKqWW03F9',
  },
});

/** Default spoken voice per BuilderOS department seat. */
export const VOICE_RAIL_DEPARTMENT_VOICE = Object.freeze({
  ChC: 'founder',
  Hist: 'professional',
  SNT: 'professional',
  CFO: 'professional',
  BPB: 'friendly',
  SDO: 'friendly',
  CDR: 'energetic',
});

export function resolveElevenLabsVoiceId(catalogKey) {
  const entry = ELEVENLABS_VOICE_CATALOG[catalogKey] || ELEVENLABS_VOICE_CATALOG.founder;
  if (entry.envVoiceId) {
    const fromEnv = process.env[entry.envVoiceId]?.trim();
    if (fromEnv) return fromEnv;
  }
  return entry.defaultId;
}

export function resolveDepartmentVoiceId(deptId) {
  const dept = String(deptId || 'ChC').trim();
  const catalogKey = VOICE_RAIL_DEPARTMENT_VOICE[dept] || 'founder';
  return {
    department: dept,
    catalog_key: catalogKey,
    voice_id: resolveElevenLabsVoiceId(catalogKey),
    label: ELEVENLABS_VOICE_CATALOG[catalogKey]?.label || catalogKey,
  };
}

export function listVoiceRailVoices() {
  return Object.values(ELEVENLABS_VOICE_CATALOG).map((v) => ({
    key: v.key,
    label: v.label,
    description: v.description,
    voice_id: resolveElevenLabsVoiceId(v.key),
  }));
}

export function listDepartmentVoiceMap() {
  return Object.entries(VOICE_RAIL_DEPARTMENT_VOICE).map(([department, catalog_key]) => {
    const voice_id = resolveElevenLabsVoiceId(catalog_key);
    return {
      department,
      catalog_key,
      voice_id,
      label: ELEVENLABS_VOICE_CATALOG[catalog_key]?.label || catalog_key,
    };
  });
}
