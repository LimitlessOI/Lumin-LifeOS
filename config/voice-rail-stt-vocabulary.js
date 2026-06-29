/**
 * SYNOPSIS: Voice Rail STT — Whisper prompt terms + post-transcription corrections.
 * Voice Rail STT — Whisper prompt terms + post-transcription corrections.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { VOICE_RAIL_DEPARTMENT_IDS } from './voice-rail-departments.js';

/** Canonical tokens Whisper should prefer (departments + product vocabulary). */
export const VOICE_RAIL_STT_TERMS = Object.freeze([
  ...VOICE_RAIL_DEPARTMENT_IDS,
  'CDO',
  'Cncl',
  'LifeOS',
  'LimitlessOS',
  'BuilderOS',
  'Lumin',
  'SSOT',
  'TokenSaverOS',
  'Voice Rail',
  'gate-change',
  'founder packet',
  'FOUNDER_PACKET',
  'Railway',
  'Neon',
  'Command Center',
  'ChC',
]);

/**
 * Build Whisper `prompt` — biases recognition toward LifeOS department codes.
 * @param {string} [contextTail] — recent committed text (last ~180 chars)
 */
export function buildWhisperPrompt(contextTail = '') {
  const terms = VOICE_RAIL_STT_TERMS.join(', ');
  const tail = String(contextTail || '').trim().slice(-180);
  const base = `LifeOS Voice Rail dictation. Department codes: ${terms}. Spoken letters like B P B mean BPB.`;
  return tail ? `${base} Prior text: ${tail}` : base;
}

/** Spoken / misheard forms → canonical department or product tokens. */
const CORRECTION_RULES = [
  [/\bbee\s+pee\s+bee\b/gi, 'BPB'],
  [/\bb\s*[\.\-]?\s*p\s*[\.\-]?\s*b\b/gi, 'BPB'],
  [/\bblue\s+print\s+dept\b/gi, 'BPB'],
  [/\bsee\s+aitch\s+see\b/gi, 'ChC'],
  [/\bch\s*[\.\-]?\s*c\b/gi, 'ChC'],
  [/\bsee\s+eff\s+oh\b/gi, 'CFO'],
  [/\bc\s*[\.\-]?\s*f\s*[\.\-]?\s*o\b/gi, 'CFO'],
  [/\bsee\s+dee\s+are\b/gi, 'CDR'],
  [/\bc\s*[\.\-]?\s*d\s*[\.\-]?\s*r\b/gi, 'CDR'],
  [/\bsee\s+dee\s+oh\b/gi, 'CDO'],
  [/\bc\s*[\.\-]?\s*d\s*[\.\-]?\s*o\b/gi, 'CDO'],
  [/\bess\s+dee\s+oh\b/gi, 'SDO'],
  [/\bs\s*[\.\-]?\s*d\s*[\.\-]?\s*o\b/gi, 'SDO'],
  [/\bsee\s+enn\s+tee\b/gi, 'SNT'],
  [/\bs\s*[\.\-]?\s*n\s*[\.\-]?\s*t\b/gi, 'SNT'],
  [/\bheist\b/gi, 'Hist'],
  [/\bhist\b/gi, 'Hist'],
  [/\blife\s+o\s*s\b/gi, 'LifeOS'],
  [/\bbuilder\s+o\s*s\b/gi, 'BuilderOS'],
  [/\btoken\s+saver\s+o\s*s\b/gi, 'TokenSaverOS'],
  [/\bgate\s+change\b/gi, 'gate-change'],
  [/\bfounder\s+packet\b/gi, 'founder packet'],
];

/**
 * Apply deterministic vocabulary fixes after Whisper returns text.
 * @param {string} text
 * @returns {string}
 */
export function applyVoiceRailVocabulary(text) {
  let out = String(text || '').trim();
  if (!out) return out;
  for (const [pattern, replacement] of CORRECTION_RULES) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function listVoiceRailSttVocabularyPublic() {
  return {
    terms: [...VOICE_RAIL_STT_TERMS],
    departments: [...VOICE_RAIL_DEPARTMENT_IDS],
  };
}
