#!/usr/bin/env node
/**
 * SYNOPSIS: CI overclaim guard — fail if any completion claim exceeds its proven gates.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Wave 0 item 2. Enforces the ONE overclaim rule from the BuilderOS consensus against the
 * single completion-vocabulary SSOT. Behaviour:
 *   - SSOT absent  → INERT (exit 0) with a loud notice. The guard never invents vocabulary;
 *                    it activates the instant the vocabulary lane lands COMPLETION_VOCABULARY_SSOT.json.
 *   - SSOT present → validate its internal consistency, then enforce every declared claim_source.
 *                    Any overclaim (or structural problem) fails CI (exit 1).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SSOT_PATH,
  loadVocabulary,
  validateVocabularyConsistency,
  scanClaimSources,
} from '../services/completion-overclaim-guard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  let vocab;
  try {
    vocab = loadVocabulary(ROOT);
  } catch (err) {
    console.error(`❌ completion-overclaim: SSOT is present but invalid — ${err.message}`);
    process.exit(1);
  }

  if (!vocab) {
    console.log(`⏸️  completion-overclaim: no SSOT at ${SSOT_PATH} yet — guard INERT.`);
    console.log('   Lands live the moment the vocabulary lane commits the LOCKED completion SSOT.');
    process.exit(0);
  }

  const consistency = validateVocabularyConsistency(vocab);
  if (!consistency.ok) {
    console.error('❌ completion-overclaim: SSOT is internally inconsistent:');
    for (const p of consistency.problems) console.error(`   - ${p}`);
    process.exit(1);
  }

  const violations = scanClaimSources(ROOT, vocab);
  if (violations.length > 0) {
    console.error(`❌ completion-overclaim: ${violations.length} overclaim(s) detected:`);
    for (const v of violations) console.error(`   - ${JSON.stringify(v)}`);
    process.exit(1);
  }

  const sources = (vocab.raw.claim_sources || []).length;
  console.log(
    `✅ completion-overclaim: SSOT v${vocab.raw.version} consistent; `
    + `${sources} claim source(s) enforced, no overclaim.`,
  );
  process.exit(0);
}

main();
