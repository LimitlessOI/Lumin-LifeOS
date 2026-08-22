#!/usr/bin/env node
/**
 * Fail closed when a canonical product blueprint pointer does not preserve a
 * navigable history/provenance chain. History is not executable authority, but
 * a fresh agent must be able to answer: what did this supersede, where was it
 * archived, and where is the evidence explaining why the direction changed?
 *
 * @ssot docs/constitution/FOUNDER_AI_OPERATING_PROTOCOL.md
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function exists(rel) {
  return typeof rel === 'string' && rel.length > 0 && fs.existsSync(path.join(root, rel));
}

function walk(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name === 'CURRENT.json' && full.includes(`${path.sep}blueprint-versions${path.sep}`)) found.push(full);
  }
  return found;
}

for (const pointerPath of walk(path.join(root, 'docs', 'products'))) {
  const relPointer = path.relative(root, pointerPath);
  let pointer;
  try {
    pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
  } catch (error) {
    failures.push(`${relPointer}: invalid JSON (${error.message})`);
    continue;
  }

  if (pointer.status !== 'CURRENT_CANONICAL_PRODUCT_BLUEPRINT') continue;

  if (!exists(pointer.current_blueprint)) {
    failures.push(`${relPointer}: current_blueprint missing or does not exist`);
  }

  if (!Array.isArray(pointer.supersedes)) {
    failures.push(`${relPointer}: supersedes must be an array`);
  }

  const history = pointer.history;
  if (!history || typeof history !== 'object') {
    failures.push(`${relPointer}: missing history object`);
    continue;
  }

  if (!exists(history.archive_root)) failures.push(`${relPointer}: history.archive_root missing or does not exist`);
  if (!Array.isArray(history.decision_provenance) || history.decision_provenance.length === 0) {
    failures.push(`${relPointer}: history.decision_provenance must name at least one provenance source`);
  } else {
    for (const source of history.decision_provenance) {
      if (!exists(source)) failures.push(`${relPointer}: provenance source does not exist: ${source}`);
    }
  }

  if (history.archived_versions_are_executable !== false) {
    failures.push(`${relPointer}: history.archived_versions_are_executable must be false`);
  }

  if (!history.purpose || !String(history.purpose).toLowerCase().includes('why')) {
    failures.push(`${relPointer}: history.purpose must explain why history is preserved`);
  }
}

if (failures.length) {
  console.error('BLUEPRINT HISTORY LINKS: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('BLUEPRINT HISTORY LINKS: PASS');
