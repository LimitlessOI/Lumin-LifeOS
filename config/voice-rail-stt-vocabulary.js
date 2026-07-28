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
  'Taloa',
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
 * @param {{ extraTerms?: string[], correctionHints?: string[] }} [extras]
 */
export function buildWhisperPrompt(contextTail = '', extras = {}) {
  const terms = [...VOICE_RAIL_STT_TERMS, ...(extras.extraTerms || [])].join(', ');
  const tail = String(contextTail || '').trim().slice(-180);
  let base = `LifeOS Voice Rail dictation. Department codes: ${terms}. Spoken letters like B P B mean BPB.`;
  if (extras.correctionHints?.length) {
    base += ` Learned corrections: ${extras.correctionHints.join('; ').slice(0, 240)}.`;
  }
  return tail ? `${base} Prior text: ${tail}` : base;
}

/** Spoken / misheard forms → canonical department or product tokens. */
const CORRECTION_RULES = [
  [/\bbee\s+pee\s+bee\b/gi, 'BPB'],
  [/\bb\s*[\.\-]?\sp\s*[\.\-]?\sb\b/gi, 'BPB'],
  [/\bblue\s+print\s+dept\b/gi, 'BPB'],
  [/\bsee\s+aitch\s+see\b/gi, 'ChC'],
  [/\bch\s*[\.\-]?\sc\b/gi, 'ChC'],
  [/\bsee\s+eff\s+oh\b/gi, 'CFO'],
  [/\bc\s*[\.\-]?\sf\s*[\.\-]?\so\b/gi, 'CFO'],
  [/\bsee\s+dee\s+are\b/gi, 'CDR'],
  [/\bc\s*[\.\-]?\sd\s*[\.\-]?\sr\b/gi, 'CDR'],
  [/\bsee\s+dee\s+oh\b/gi, 'CDO'],
  [/\bc\s*[\.\-]?\sd\s*[\.\-]?\so\b/gi, 'CDO'],
  [/\bess\s+dee\s+oh\b/gi, 'SDO'],
  [/\bs\s*[\.\-]?\sd\s*[\.\-]?\so\b/gi, 'SDO'],
  [/\bsee\s+enn\s+tee\b/gi, 'SNT'],
  [/\bs\s*[\.\-]?\sn\s*[\.\-]?\st\b/gi, 'SNT'],
  [/\bheist\b/gi, 'Hist'],
  [/\bhist\b/gi, 'Hist'],
  [/\blife\s+o\ss\b/gi, 'LifeOS'],
  [/\bbuilder\s+o\ss\b/gi, 'BuilderOS'],
  [/\btoken\s+saver\s+o\ss\b/gi, 'TokenSaverOS'],
  [/\bgate\s+change\b/gi, 'gate-change'],
  [/\bfounder\s+packet\b/gi, 'founder packet'],
  [/\btolowa\b/gi, 'Taloa'],
];

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply deterministic vocabulary fixes after Whisper returns text.
 * @param {string} text
 * @param {Array<{misheard:string, canonical:string}>} [userCorrections]
 * @returns {string}
 */
export function applyVoiceRailVocabulary(text, userCorrections = []) {
  let out = String(text || '').trim();
  if (!out) return out;
  for (const [pattern, replacement] of CORRECTION_RULES) {
    out = out.replace(pattern, replacement);
  }
  for (const rule of userCorrections || []) {
    const m = String(rule.misheard || '').trim();
    const c = String(rule.canonical || '').trim();
    if (!m || !c || m.toLowerCase() === c.toLowerCase()) continue;
    out = out.replace(new RegExp(`\\b${escapeRegex(m)}\\b`, 'gi'), c);
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function listVoiceRailSttVocabularyPublic() {
  return {
    terms: [...VOICE_RAIL_STT_TERMS],
    departments: [...VOICE_RAIL_DEPARTMENT_IDS],
  };
}