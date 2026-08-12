#!/usr/bin/env node
/**
 * SYNOPSIS: The deterministic repair pass, extracted so both the lifecycle exam and
 * the resolution-application pass can use the one implementation.
 *
 * It lived inside the exam until the application pass needed it too. Importing it
 * from the exam would have made the two modules import each other, and the version
 * most likely to appear next is a second copy that drifts from this one — which is
 * exactly the duplicate-home failure the MOVE-DON'T-RENAME rule exists to stop.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRIDGE_REL = 'builderos-reboot/governance/TERMINOLOGY_BRIDGE.json';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/**
 * Deterministic resolution. Every rewrite here uses a value the system was ALREADY
 * given — the explicitly-passed product identity, the ratified terminology bridge —
 * so nothing is invented. Where no authoritative value exists, this returns
 * unresolved rather than choosing one.
 */
export function resolveDeterministically(session, defects) {
  const s = session.session || session;
  const working = JSON.parse(JSON.stringify(s));
  const applied = [];
  const unresolved = [];
  const bridge = JSON.parse(read(BRIDGE_REL));

  for (const defect of defects) {
    if (defect.authority !== 'deterministic_repair') {
      unresolved.push(defect);
      continue;
    }

    if (defect.id === 'SSOT_IDENTITY_MISMATCH') {
      const authoritative = defect.expected ?? defect.authoritative_value ?? working.product_name;
      if (!authoritative) {
        unresolved.push({ ...defect, why_unresolved: 'no authoritative identity available to bind to' });
        continue;
      }
      const field = String(defect.field || '');
      if (field === '_meta.product') {
        working.blueprint_json._meta.product = authoritative;
      } else if (field === '_meta.ssot_tag' || field === '_meta.parent_ssot') {
        const key = field.split('.')[1];
        working.blueprint_json._meta[key] = `docs/products/${authoritative}/PRODUCT_HOME.md`;
      }
      applied.push({
        defect_id: defect.id,
        field,
        new_value: field === '_meta.product' ? authoritative : `docs/products/${authoritative}/PRODUCT_HOME.md`,
        basis: 'the authoritative identity was supplied at intake and then ignored — this restores it, it does not choose it',
      });
      continue;
    }

    if (defect.id === 'STALE_RATIFIED_TERMINOLOGY') {
      const term = bridge.terms.find(
        (t) => (t.former || []).some((f) => f.toLowerCase() === String(defect.former_term || '').toLowerCase())
      );
      if (!term) {
        unresolved.push({ ...defect, why_unresolved: 'term not present in the ratified terminology bridge' });
        continue;
      }
      const scope = defect.scope || 'acceptance_criteria';
      const container = working.extracted_intent_json || {};
      const before = JSON.stringify(container[scope] ?? null);
      const after = before ? before.replaceAll(defect.former_term, term.canonical) : before;
      if (before && after !== before) {
        container[scope] = JSON.parse(after);
        working.extracted_intent_json = container;
        applied.push({
          defect_id: defect.id,
          scope,
          from: defect.former_term,
          to: term.canonical,
          basis: `ratified rename, ${BRIDGE_REL} effective ${term.effective_from}`,
        });
      } else {
        unresolved.push({ ...defect, why_unresolved: 'scope text not found or unchanged' });
      }
      continue;
    }

    unresolved.push({ ...defect, why_unresolved: 'no deterministic rule exists for this defect id' });
  }

  return { working, applied, unresolved };
}
