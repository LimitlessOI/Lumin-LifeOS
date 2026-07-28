/**
 * SYNOPSIS: Receipt separation-of-duties primitives — make "who verified this" mechanical.
 *
 * docs/products/builderos/PRODUCT_HOME.md line 283 already says one model may fill
 * several roles "only when no safer alternative exists, and the run receipt must
 * say that separation was collapsed." Audited 2026-07-28: zero of 128 receipts
 * contained any such declaration, because nothing ever checked. This module is
 * that check.
 *
 * Grandfathering is deliberate. Applying the rule retroactively would fail every
 * historical receipt and red-light builder:preflight, which is the "correct work
 * blocked by a gate no code could satisfy" failure SELF_REPAIR_DOCTRINE Part 1
 * rule 2 forbids. Receipts written from the cutoff forward carry the contract;
 * older ones are reported as grandfathered rather than silently accepted.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/** Receipts stamped at or after this instant must name producer and verifier. */
export const SEPARATION_CUTOFF_ISO = '2026-07-28T00:00:00.000Z';

const PRODUCER_KEYS = ['produced_by', 'producer', 'built_by', 'author', 'authored_by'];
const VERIFIER_KEYS = ['verified_by', 'verifier', 'checked_by', 'audited_by'];

function firstString(receipt, keys) {
  for (const k of keys) {
    const v = receipt?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function readActors(receipt = {}) {
  return {
    producer: firstString(receipt, PRODUCER_KEYS),
    verifier: firstString(receipt, VERIFIER_KEYS),
    collapsed: receipt?.separation_collapsed === true,
    collapse_reason: firstString(receipt, ['separation_note', 'separation_reason']),
  };
}

/** Same actor if the identities are equal ignoring case and surrounding space. */
export function sameActor(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function isGrandfathered(receipt = {}, { cutoffIso = SEPARATION_CUTOFF_ISO } = {}) {
  if (/_v[2-9]$/.test(String(receipt?.schema || ''))) return false;
  const at = receipt?.at || receipt?.timestamp || receipt?.generated_at;
  if (!at) return true;
  const stamped = Date.parse(at);
  if (Number.isNaN(stamped)) return true;
  return stamped < Date.parse(cutoffIso);
}

/**
 * Judge a receipt's separation of duties.
 *
 * @param {object} receipt
 * @param {boolean} claimsPass - whether the receipt asserts a passing verdict
 * @returns {{violations: string[], advisories: string[], actors: object, grandfathered: boolean}}
 */
export function evaluateSeparation(receipt = {}, claimsPass = false, opts = {}) {
  const actors = readActors(receipt);
  const grandfathered = isGrandfathered(receipt, opts);
  const violations = [];
  const advisories = [];

  if (!claimsPass) return { violations, advisories, actors, grandfathered };

  const problems = [];
  if (actors.collapsed) {
    // Declaring collapse is permitted, but it must carry a real reason.
    if (!actors.collapse_reason || actors.collapse_reason.length < 12) {
      problems.push('SEPARATION_COLLAPSE_WITHOUT_REASON');
    }
  } else if (!actors.verifier) {
    problems.push('PASS_WITHOUT_NAMED_VERIFIER');
  } else if (actors.producer && sameActor(actors.producer, actors.verifier)) {
    problems.push('PASS_SELF_VERIFIED');
  } else if (!actors.producer) {
    problems.push('PASS_WITHOUT_NAMED_PRODUCER');
  }

  for (const p of problems) {
    if (grandfathered) advisories.push(`GRANDFATHERED:${p}`);
    else violations.push(p);
  }

  return { violations, advisories, actors, grandfathered };
}

export function separationSolution(code) {
  switch (code) {
    case 'PASS_WITHOUT_NAMED_VERIFIER':
      return 'Add verified_by naming the independent actor that checked this (must differ from produced_by). '
        + 'If no independent verifier existed, set separation_collapsed: true plus separation_note explaining why '
        + 'no safer alternative existed, per PRODUCT_HOME Separation Of Duties.';
    case 'PASS_SELF_VERIFIED':
      return 'produced_by and verified_by name the same actor. Have a different actor verify, or declare '
        + 'separation_collapsed: true with separation_note giving the reason.';
    case 'PASS_WITHOUT_NAMED_PRODUCER':
      return 'Add produced_by naming the actor that did the work, so the verifier can be proven independent of it.';
    case 'SEPARATION_COLLAPSE_WITHOUT_REASON':
      return 'separation_collapsed: true requires separation_note stating why no independent verifier was available.';
    default:
      return 'Name produced_by and verified_by on this receipt.';
  }
}
