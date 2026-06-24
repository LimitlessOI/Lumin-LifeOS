/**
 * SYNOPSIS: Point B DNA — runtime stamp + prompt inject; supreme purpose enforcement.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DNA_JSON_PATH = path.join(ROOT, 'builderos-reboot/governance/POINT_B_DNA.json');
const DNA_MD_PATH = path.join(ROOT, 'docs/constitution/POINT_B_DNA.md');

export const POINT_B_DNA_VERSION = 'point_b_dna_v1';

let cachedDna = null;

export function loadPointBDnaJson() {
  if (cachedDna) return cachedDna;
  cachedDna = JSON.parse(fs.readFileSync(DNA_JSON_PATH, 'utf8'));
  return cachedDna;
}

export const POINT_B_DNA_PROMPT_BLOCK = `POINT B DNA (supreme purpose — cannot be misread):
- This system exists ONLY to get from Point A to Point B as the founder defines B — honest scoreboard, no deception.
- 100% intention + however much mechanics solved = results (scorecard only — not moral good/bad).
- Intention is WHY; mechanics (governance, receipts, twin format, gates) are HOW — necessary, NOT the destination.
- Many paths A→B; efficiency is secondary to honest arrival. Partial success is NOT Point B.
- Synergy: human + AI > sum of parts (1+1=3) when truth is shared. Chair helps flesh broad vision → refine → build → scoreboard.
- Deception corrupts the scoreboard — never our path. Process PASS without B = FAIL.
- Obstacles = lessons; failure = feedback unless we quit. Reality scores.
- Founder input is honest but fallible — clarify before lock (Wisdom).`;

export function getPointBDnaPromptBlock() {
  return POINT_B_DNA_PROMPT_BLOCK;
}

const PROCESS_THEATER_RE = /\b(governance complete|ssot updated|receipt scan pass|machine path pass|pipeline succeeded)\b/i;

export function detectProcessTheaterAsPointB(body = {}) {
  if (!body || typeof body !== 'object') return null;
  const summary = [
    body.human_summary,
    body.human_summary_technical,
    body.done_synopsis,
  ].filter(Boolean).join(' ');
  if (!summary) return null;
  const claimsB = /\b(point b reached|alpha complete|founder success|arrived at b|mission complete)\b/i.test(summary);
  const processOnly = PROCESS_THEATER_RE.test(summary);
  const noFounderUsability = body.founder_usability_pass !== true;
  const commandRan = body.command_truth && body.command_truth !== 'NO_COMMAND_RAN';
  if (claimsB && processOnly && noFounderUsability && !commandRan) {
    return 'PROCESS_THEATER_AS_POINT_B';
  }
  return null;
}

export function stampPointBDna(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const out = {
    ...body,
    point_b_dna_version: POINT_B_DNA_VERSION,
    system_purpose: 'point_a_to_point_b',
    synergy_model: 'human_ai_greater_than_sum',
  };
  const theater = detectProcessTheaterAsPointB(out);
  if (theater && out.pass_fail === 'PASS') {
    out.pass_fail = 'FAIL';
    out.ok = false;
    out.truth_gate_violation = theater;
    out.first_blocker = out.first_blocker || 'Governance/process success is not Point B — scoreboard must reflect founder arrival.';
    if (!out.execution_receipt?.lesson) {
      out.execution_receipt = {
        ...(out.execution_receipt || {}),
        lesson: 'Point B DNA: mechanics and receipts are tools — reporting B without founder arrival is deception on the scoreboard.',
      };
    }
  }
  return out;
}

export function assertPointBDnaFilesExist() {
  const failures = [];
  if (!fs.existsSync(DNA_JSON_PATH)) failures.push('missing POINT_B_DNA.json');
  if (!fs.existsSync(DNA_MD_PATH)) failures.push('missing POINT_B_DNA.md');
  if (failures.length) return { ok: false, failures };
  const json = loadPointBDnaJson();
  if (json.version !== POINT_B_DNA_VERSION) {
    failures.push(`POINT_B_DNA.json version mismatch: ${json.version}`);
  }
  if (!json.sole_purpose?.statement?.includes('Point A')) {
    failures.push('POINT_B_DNA.json sole_purpose.statement drift');
  }
  if (!json.synergy?.statement) failures.push('POINT_B_DNA.json missing synergy');
  return { ok: failures.length === 0, failures };
}
