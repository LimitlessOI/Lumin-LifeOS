/**
 * SYNOPSIS: Lumin Communication Law — anti-formula enforcement + wiring audit for human translation layer.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAW_PATH = path.join(ROOT, 'builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json');

let cachedLaw = null;

export function loadLuminCommunicationLaw() {
  if (cachedLaw) return cachedLaw;
  cachedLaw = JSON.parse(fs.readFileSync(LAW_PATH, 'utf8'));
  return cachedLaw;
}

export function isLuminCommunicationLawEnforced() {
  const raw = String(process.env.LUMIN_COMMUNICATION_LAW ?? '1').trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(raw);
}

function compilePatterns(law) {
  const phrases = (law.forbidden_phrases || []).map((p) => String(p).toLowerCase());
  const openingRes = (law.forbidden_opening_patterns || []).map((p) => {
    try {
      return new RegExp(p, 'i');
    } catch {
      return null;
    }
  }).filter(Boolean);
  return { phrases, openingRes };
}

export function detectFormulaViolations(text = '', law = loadLuminCommunicationLaw()) {
  const body = String(text || '');
  const lower = body.toLowerCase();
  const { phrases, openingRes } = compilePatterns(law);
  const violations = [];

  for (const phrase of phrases) {
    if (lower.includes(phrase)) {
      violations.push({ kind: 'forbidden_phrase', match: phrase });
    }
  }

  for (const re of openingRes) {
    if (re.test(body)) {
      violations.push({ kind: 'forbidden_opening', match: re.source });
    }
  }

  return violations;
}

export function scrubFormulaViolations(text = '', law = loadLuminCommunicationLaw()) {
  let out = String(text || '');
  const { phrases, openingRes } = compilePatterns(law);

  // Preserve honest identity: strip go-between denials cleanly (bare scrub left "Not a .")
  out = out
    .replace(/\bnot a go-between\.?\s*/gi, '')
    .replace(/\bnever a go-between\.?\s*/gi, '')
    .replace(/\bnot a translation layer(?: between[^.!?]*)?\.?\s*/gi, '')
    .replace(/\bI am not a (?:go-between|middleman|translation layer)\b\.?\s*/gi, 'I am the system. ');

  for (const phrase of phrases) {
    // Skip scrubbing bare "go-between" after negation rewrite above; still detect it.
    if (phrase === 'go-between' || phrase === 'translation layer between') continue;
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, '').replace(/\s{2,}/g, ' ').trim();
  }

  for (const re of openingRes) {
    out = out.replace(re, '').trim();
  }

  return out.replace(/^\s*[,.\-–—!?\s]+/, '').replace(/\s{2,}/g, ' ').trim();
}

function isGuttedOutput(text = '') {
  const t = String(text || '').trim();
  if (t.length < 8) return true;
  const alpha = (t.match(/[a-zA-Z]/g) || []).length;
  return alpha < 6;
}

export function buildCommunicationLawReceipt({
  passed,
  violations = [],
  scrubbed = false,
  retried = false,
  stylesUsed = null,
} = {}) {
  return {
    schema: 'lumin_communication_law_receipt_v1',
    enforced: isLuminCommunicationLawEnforced(),
    passed: Boolean(passed),
    violation_count: violations.length,
    violations: violations.slice(0, 8).map((v) => v.match || v.kind),
    scrubbed,
    retried,
    styles_used: stylesUsed
      ? {
        opening: stylesUsed.opening?.id || null,
        length: stylesUsed.length?.id || null,
        tone: stylesUsed.tone?.id || null,
        question_ending: stylesUsed.question_ending?.id || null,
      }
      : null,
    authority: 'builderos-reboot/governance/LUMIN_COMMUNICATION_LAW.json',
  };
}

export function enforceCommunicationLaw(text = '', options = {}) {
  if (!isLuminCommunicationLawEnforced()) {
    return {
      text: String(text || ''),
      passed: true,
      violations: [],
      receipt: buildCommunicationLawReceipt({ passed: true }),
    };
  }

  const law = loadLuminCommunicationLaw();
  const initial = detectFormulaViolations(text, law);
  let cleaned = text;
  let scrubbed = false;

  if (initial.length) {
    cleaned = scrubFormulaViolations(text, law);
    scrubbed = cleaned !== text;
  }

  const remaining = detectFormulaViolations(cleaned, law);
  const passed = remaining.length === 0;

  if (isGuttedOutput(cleaned) && initial.length) {
    cleaned = '';
  }

  return {
    text: cleaned,
    passed,
    violations: [...initial, ...remaining],
    receipt: buildCommunicationLawReceipt({
      passed,
      violations: remaining.length ? remaining : initial,
      scrubbed,
      retried: options.retried === true,
      stylesUsed: options.stylesUsed || null,
    }),
  };
}

export function auditLuminCommunicationWiring() {
  const law = loadLuminCommunicationLaw();
  const checks = [];

  function add(id, ok, detail) {
    checks.push({ id, ok: Boolean(ok), detail: ok ? detail || 'PASS' : detail });
  }

  add('COMM-LAW-01', fs.existsSync(LAW_PATH), 'LUMIN_COMMUNICATION_LAW.json');
  add(
    'COMM-LAW-02',
    fs.existsSync(path.join(ROOT, law.supreme_authority || 'docs/constitution/LUMIN_COMMUNICATION_DNA.md')),
    'LUMIN_COMMUNICATION_DNA.md constitutional doc',
  );
  add('COMM-LAW-03', fs.existsSync(path.join(ROOT, law.canonical?.translation_runtime || '')), 'translation runtime');

  const translatePath = path.join(ROOT, 'services/chair-personality-translate.js');
  const translateSrc = fs.readFileSync(translatePath, 'utf8');
  add(
    'COMM-WIRE-01',
    translateSrc.includes('lumin-communication-guard'),
    'translate imports communication guard',
  );
  add(
    'COMM-WIRE-02',
    translateSrc.includes('response-variety') || translateSrc.includes('createResponseVariety'),
    'translate imports response variety',
  );
  add(
    'COMM-WIRE-03',
    translateSrc.includes('enforceCommunicationLaw'),
    'translate calls enforceCommunicationLaw',
  );
  add(
    'COMM-WIRE-04',
    translateSrc.includes('wrapPromptWithVariety'),
    'translate uses wrapPromptWithVariety',
  );
  add(
    'COMM-WIRE-05',
    /TRANSLATION.*NOT.*roleplay|NOT roleplay/i.test(translateSrc)
      && /COMMUNICATION DNA/i.test(translateSrc),
    'translate prompt asserts DNA + translation-not-theater',
  );

  add('COMM-WIRE-06', fs.existsSync(path.join(ROOT, 'services/response-variety.js')), 'response-variety.js');
  add('COMM-WIRE-07', fs.existsSync(path.join(ROOT, 'services/communication-profile.js')), 'communication-profile.js');
  add('COMM-WIRE-08', fs.existsSync(path.join(ROOT, 'services/lumin-context-loader.js')), 'lumin-context-loader.js');

  const directPath = path.join(ROOT, 'services/chair-direct-agent.js');
  const directSrc = fs.existsSync(directPath) ? fs.readFileSync(directPath, 'utf8') : '';
  add('COMM-WIRE-09', fs.existsSync(directPath), 'chair-direct-agent.js (founder front door)');
  add(
    'COMM-WIRE-10',
    /enforceCommunicationLaw/.test(directSrc) && /lumin-communication-guard/.test(directSrc),
    'direct agent enforces Communication Law on human replies',
  );
  add(
    'COMM-WIRE-11',
    /COMMUNICATION DNA/i.test(directSrc) && /never ChatGPT formula/i.test(directSrc),
    'direct agent prompt carries Communication DNA',
  );
  add(
    'COMM-WIRE-12',
    /LUMIN_COMMUNICATION_DNA\.md/.test(directSrc),
    'direct agent cites constitutional DNA authority',
  );
  add(
    'COMM-WIRE-13',
    /self_voice/.test(directSrc) && /HOW I SPEAK/.test(directSrc),
    'direct agent injects self_voice principles',
  );
  add(
    'COMM-WIRE-14',
    Array.isArray(law.self_voice?.principles) && law.self_voice.principles.length >= 6,
    'law JSON carries self_voice principles',
  );
  add(
    'COMM-WIRE-15',
    /self_voice/.test(translateSrc) && /HOW I SPEAK/.test(translateSrc),
    'translate injects self_voice principles',
  );

  const passed = checks.filter((c) => c.ok).length;
  return {
    schema: 'lumin_communication_wiring_audit_v1',
    generated_at: new Date().toISOString(),
    enforced: isLuminCommunicationLawEnforced(),
    checks,
    ok: checks.every((c) => c.ok),
    score: checks.length ? Math.round((passed / checks.length) * 100) / 10 : 0,
  };
}
