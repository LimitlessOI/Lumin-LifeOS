/**
 * SYNOPSIS: Fan-out founder memory writes to governance, ideavault, continuity, index.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo-root.js';

const INDEX_PATH = path.join(REPO_ROOT, 'Lumin-Memory/01_INDEX/founder_memory_index.jsonl');
const GOVERNANCE_DIR = path.join(REPO_ROOT, 'builderos-reboot/governance/decisions');
const IDEAVAULT_DIR = path.join(REPO_ROOT, 'docs/products/ideavault/conversations');
const CONTINUITY_PATH = path.join(REPO_ROOT, 'docs/CONTINUITY_LOG_LIFEOS.md');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function dateSlug(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function buildFanoutPaths(entry) {
  const slug = `${dateSlug(new Date(entry.occurred_at || Date.now()))}-${entry.receipt_id}`;
  return {
    index: INDEX_PATH,
    governance: path.join(GOVERNANCE_DIR, `${slug}.json`),
    ideavault: path.join(IDEAVAULT_DIR, `${slug}.md`),
    continuity: CONTINUITY_PATH,
  };
}

export function fanOutFounderMemoryEntry(entry, { logger = console } = {}) {
  const paths = buildFanoutPaths(entry);
  const indexLine = JSON.stringify({
    receipt_id: entry.receipt_id,
    session_id: entry.session_id,
    product_ids: entry.product_ids,
    classification: entry.classification,
    role: entry.role,
    occurred_at: entry.occurred_at,
    content_preview: String(entry.content || '').slice(0, 240),
  });

  ensureDir(path.dirname(paths.index));
  fs.appendFileSync(paths.index, `${indexLine}\n`, 'utf8');

  if (entry.classification === 'decision') {
    ensureDir(GOVERNANCE_DIR);
    fs.writeFileSync(
      paths.governance,
      `${JSON.stringify({
        schema: 'founder_memory_decision_v1',
        receipt_id: entry.receipt_id,
        session_id: entry.session_id,
        product_ids: entry.product_ids,
        occurred_at: entry.occurred_at,
        role: entry.role,
        content: entry.content,
        metadata: entry.metadata || {},
      }, null, 2)}\n`,
      'utf8'
    );
  }

  if (entry.classification === 'idea') {
    ensureDir(IDEAVAULT_DIR);
    fs.writeFileSync(
      paths.ideavault,
      `<!-- receipt_id: ${entry.receipt_id} -->\n\n# Founder idea · ${entry.product_ids?.join(', ') || 'general'}\n\n**At:** ${entry.occurred_at}\n**Session:** ${entry.session_id}\n\n${entry.content}\n`,
      'utf8'
    );
  }

  const continuityLine = [
    '',
    `## [FOUNDER-MEMORY] ${entry.occurred_at} · ${entry.classification} · receipt \`${entry.receipt_id}\``,
    '',
    `- **Products:** ${(entry.product_ids || []).join(', ') || 'general'}`,
    `- **Role:** ${entry.role}`,
    `- **Session:** ${entry.session_id}`,
    '',
    String(entry.content || '').slice(0, 2000),
    '',
  ].join('\n');

  if (fs.existsSync(paths.continuity)) {
    fs.appendFileSync(paths.continuity, continuityLine, 'utf8');
  } else {
    fs.writeFileSync(
      paths.continuity,
      `<!-- SYNOPSIS: LifeOS continuity — founder memory fan-out -->\n\n# Continuity Log — LifeOS Core Lane\n${continuityLine}`,
      'utf8'
    );
  }

  logger.info?.('[FOUNDER-MEMORY] fan-out complete', {
    receipt_id: entry.receipt_id,
    classification: entry.classification,
  });

  return { ok: true, paths };
}
