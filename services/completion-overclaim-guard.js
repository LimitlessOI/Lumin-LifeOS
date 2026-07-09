/**
 * SYNOPSIS: Completion overclaim guard — a claim may never assert a level above its proven gates.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Enforces the ONE overclaim rule agreed in the BuilderOS consensus (Wave 0 item 2):
 * a receipt/status/certification may never assert a completion level higher than the gates it
 * can actually prove. On violation the claim auto-downgrades to the highest provable level
 * (or UNVERIFIED). This module owns ENFORCEMENT only; the completion vocabulary itself lives in a
 * single source of truth (COMPLETION_VOCABULARY_SSOT.json, vocabulary lane). No vocabulary is
 * duplicated here — if the SSOT is absent the guard is inert (and says so) rather than inventing terms.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SSOT_PATH = 'builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json';

/** Load the completion-vocabulary SSOT. Returns null if it does not exist yet. */
export function loadVocabulary(root = ROOT) {
  const abs = path.join(root, SSOT_PATH);
  if (!fs.existsSync(abs)) return null;
  const vocab = JSON.parse(fs.readFileSync(abs, 'utf8'));
  return normalizeVocabulary(vocab);
}

/** Validate + index a vocabulary object. Throws on structural problems so a bad SSOT fails loud. */
export function normalizeVocabulary(vocab) {
  if (!vocab || typeof vocab !== 'object') throw new Error('vocabulary: not an object');
  if (vocab.schema !== 'completion_vocabulary_ssot_v1') {
    throw new Error(`vocabulary: unexpected schema "${vocab.schema}"`);
  }
  if (!Array.isArray(vocab.ladder) || vocab.ladder.length === 0) {
    throw new Error('vocabulary: ladder must be a non-empty array');
  }
  const byLevel = new Map();
  const byRank = [...vocab.ladder].sort((a, b) => a.rank - b.rank);
  for (const entry of byRank) {
    if (!entry.level || typeof entry.rank !== 'number') {
      throw new Error(`vocabulary: ladder entry missing level/rank: ${JSON.stringify(entry)}`);
    }
    byLevel.set(entry.level.toUpperCase(), entry);
  }
  const aliases = {};
  for (const [k, v] of Object.entries(vocab.aliases || {})) {
    aliases[k.toUpperCase()] = String(v).toUpperCase();
  }
  const honesty = new Set((vocab.honesty_states || []).map((s) => String(s).toUpperCase()));
  return { raw: vocab, byLevel, byRank, aliases, honesty, gates: vocab.gates || {} };
}

/** Map an alias / raw word to a canonical ladder level (or return it unchanged, upper-cased). */
export function normalizeLevel(word, vocab) {
  const upper = String(word || '').trim().toUpperCase();
  if (!upper) return null;
  if (vocab.byLevel.has(upper)) return upper;
  if (vocab.aliases[upper]) return vocab.aliases[upper];
  return upper;
}

/** Cumulative set of gate ids required to legitimately claim `level`. */
export function cumulativeGates(level, vocab) {
  const target = vocab.byLevel.get(String(level).toUpperCase());
  if (!target) return null;
  const gates = new Set();
  for (const entry of vocab.byRank) {
    if (entry.rank <= target.rank) for (const g of entry.gates || []) gates.add(g);
  }
  return gates;
}

/**
 * Evaluate a completion claim against proven gates.
 * @param {object} args
 * @param {string} args.claimedLevel  the level the artifact asserts
 * @param {string[]} args.provenGates gate ids that carry a real receipt
 * @returns {{ ok:boolean, claimed:string|null, isHonestyState:boolean,
 *             highestProvable:string, downgradedTo:string|null, missing:string[] }}
 */
export function evaluateClaim({ claimedLevel, provenGates = [] }, vocab) {
  const claimed = normalizeLevel(claimedLevel, vocab);
  const proven = new Set(provenGates);

  // Honesty / non-claim states never overclaim.
  if (claimed && vocab.honesty.has(claimed)) {
    return { ok: true, claimed, isHonestyState: true, highestProvable: claimed, downgradedTo: null, missing: [] };
  }

  // Highest ladder level whose cumulative gates are all proven.
  let highest = null;
  for (const entry of vocab.byRank) {
    const need = cumulativeGates(entry.level, vocab);
    if ([...need].every((g) => proven.has(g))) highest = entry;
    else break; // ladder is monotonic; stop at first unmet level
  }
  const highestProvable = highest ? highest.level : 'UNVERIFIED';

  const target = claimed ? vocab.byLevel.get(claimed) : null;
  if (!target) {
    // Claim isn't a known ladder level and isn't an honesty state → cannot be trusted.
    return { ok: false, claimed, isHonestyState: false, highestProvable, downgradedTo: 'UNVERIFIED', missing: [] };
  }

  const need = cumulativeGates(claimed, vocab);
  const missing = [...need].filter((g) => !proven.has(g));
  const ok = missing.length === 0;
  return {
    ok,
    claimed,
    isHonestyState: false,
    highestProvable,
    downgradedTo: ok ? null : highestProvable,
    missing,
  };
}

/** Read a dot-path value from an object (returns undefined if any segment is missing). */
export function getByPath(obj, dotPath) {
  return String(dotPath).split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/**
 * Structural check: every gate referenced by the ladder must be defined in `gates`; ranks unique;
 * and every declared claim_source is well-formed — it names a file, a claim path, and each of its
 * `proven_gates` refers to a gate that actually exists in the vocabulary. An unknown gate name in a
 * claim_source would otherwise be silently ignored (never counted), so a typo could let a claim pass
 * unproven; catching it here fails the guard loudly instead.
 */
export function validateVocabularyConsistency(vocab) {
  const problems = [];
  const seenRanks = new Set();
  for (const entry of vocab.byRank) {
    if (seenRanks.has(entry.rank)) problems.push(`duplicate rank ${entry.rank}`);
    seenRanks.add(entry.rank);
    for (const g of entry.gates || []) {
      if (!(g in vocab.gates)) problems.push(`${entry.level} references undefined gate "${g}"`);
    }
  }

  const sources = vocab.raw.claim_sources || [];
  sources.forEach((src, i) => {
    const label = src && src.file ? src.file : `claim_sources[${i}]`;
    if (!src || typeof src !== 'object') { problems.push(`${label}: not an object`); return; }
    if (!src.file) problems.push(`claim_sources[${i}]: missing "file"`);
    if (!src.claim || !src.claim.path) problems.push(`${label}: missing "claim.path"`);
    for (const pg of src.proven_gates || []) {
      if (!pg || !pg.gate) { problems.push(`${label}: a proven_gates entry is missing "gate"`); continue; }
      if (!(pg.gate in vocab.gates)) problems.push(`${label}: proven_gates references undefined gate "${pg.gate}"`);
      if (!pg.file || !pg.path) problems.push(`${label}: proven gate "${pg.gate}" missing file/path`);
    }
  });

  return { ok: problems.length === 0, problems };
}

/**
 * Non-blocking audit of evidence quality in the SSOT's claim_sources. Flags "collapsed evidence" —
 * where two or more DISTINCT gates for a single claim are proven off the identical {file, path, equals}
 * signal. That means one boolean is doing the work of several independent proofs, so the ladder rung it
 * unlocks is weaker than it looks. This never fails CI (the vocabulary lane owns those wiring choices);
 * it surfaces the risk so the room can decide to tighten it. Returns a list of warnings.
 */
export function auditClaimSourceEvidence(vocab) {
  const warnings = [];
  for (const src of vocab.raw.claim_sources || []) {
    const bySignal = new Map();
    for (const pg of src.proven_gates || []) {
      if (!pg || !pg.gate) continue;
      const signal = `${pg.file}::${pg.path}::${JSON.stringify(pg.equals)}`;
      if (!bySignal.has(signal)) bySignal.set(signal, new Set());
      bySignal.get(signal).add(pg.gate);
    }
    for (const [signal, gates] of bySignal) {
      if (gates.size > 1) {
        warnings.push({
          file: src.file,
          collapsed_signal: signal,
          gates: [...gates],
          note: `${gates.size} distinct gates prove off one signal — single point of truth for multiple gates`,
        });
      }
    }
  }
  return warnings;
}

function readJson(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return { missing: true };
  try {
    return { json: JSON.parse(fs.readFileSync(abs, 'utf8')) };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Enforce the SSOT's declared claim_sources against the repo. Returns a list of violations,
 * each already downgraded per the overclaim rule. A source's claim can be either a level string
 * at `path`, or a boolean map at `path` where a `true` value claims `true_means`.
 */
export function scanClaimSources(root, vocab) {
  const sources = vocab.raw.claim_sources || [];
  const violations = [];
  for (const src of sources) {
    const loaded = readJson(root, src.file);
    if (loaded.missing) { violations.push({ file: src.file, reason: 'claim_source_file_missing' }); continue; }
    if (loaded.error) { violations.push({ file: src.file, reason: `invalid_json:${loaded.error}` }); continue; }

    const provenGates = [];
    for (const pg of src.proven_gates || []) {
      const g = readJson(root, pg.file);
      const actual = g.json ? getByPath(g.json, pg.path) : undefined;
      if (JSON.stringify(actual) === JSON.stringify(pg.equals)) provenGates.push(pg.gate);
    }

    const value = getByPath(loaded.json, src.claim.path);
    const claims = [];
    if (value && typeof value === 'object') {
      // boolean map (LEVEL -> bool): every true key claims that level
      for (const [lvl, on] of Object.entries(value)) if (on === true) claims.push(lvl);
    } else if (value === true && src.claim.true_means) {
      // a single boolean flag claims the level named by true_means
      claims.push(src.claim.true_means);
    } else if (typeof value === 'string') {
      claims.push(value);
    }

    for (const claimedLevel of claims) {
      const result = evaluateClaim({ claimedLevel, provenGates }, vocab);
      if (!result.ok) {
        violations.push({
          file: src.file,
          claimed: result.claimed,
          downgraded_to: result.downgradedTo,
          missing_gates: result.missing,
        });
      }
    }
  }
  return violations;
}
