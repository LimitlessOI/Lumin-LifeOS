/**
 * SYNOPSIS: Product-home drift enforcement for lifeos + lifere manifest-owned files.
 * Product-home drift enforcement for lifeos + lifere manifest-owned files.
 * @ssot docs/products/PRODUCT_REGISTRY.json
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export const PRODUCT_CONFIG = {
  lifeos: {
    law_anchor: 'docs/products/lifeos/PRODUCT_HOME.md',
    canonical_home: 'docs/products/lifeos/PRODUCT_HOME.md',
    deprecated_flat: 'docs/products/LIFEOS.md',
  },
  lifere: {
    law_anchor: 'docs/products/lifere/PRODUCT_HOME.md',
    canonical_home: 'docs/products/lifere/PRODUCT_HOME.md',
    deprecated_flat: 'docs/products/LIFERE.md',
  },
};

const SOURCE_EXT = /\.(js|mjs|ts)$/;

/**
 * Kinds that represent migration debt (not active regressions).
 * Files with these kinds existed before the product-home model and are being
 * migrated incrementally. The hard enforcement only blocks active regressions
 * (flat-stub, foreign-amendment, unexpected).
 */
export const DEBT_KINDS = new Set(['missing-ssot', 'amendment-first-ssot']);

export function extractSsotTag(content) {
  // Match @ssot tags inside JSDoc-style comment lines to avoid catching prose like "for @ssot tags".
  const match = String(content).match(/^\s*\*\s*@ssot\s+([^\s*\n]+)/m);
  return match ? match[1].trim() : null;
}

export function loadProductManifests(root) {
  const manifests = [];
  for (const id of ['lifeos', 'lifere']) {
    const manifestPath = path.join(root, `docs/products/${id}/FILE_MANIFEST.json`);
    if (!existsSync(manifestPath)) continue;
    try {
      manifests.push(JSON.parse(readFileSync(manifestPath, 'utf8')));
    } catch { /* skip */ }
  }
  return manifests;
}

export function sharedSsotPaths(manifest) {
  return new Set([
    'docs/products/PRODUCT_REGISTRY.json',
    ...(manifest.shared_dependencies || []).map((d) => d.path),
  ]);
}

/** relPath → { manifest, config, shared } */
export function buildOwnedIndex(manifests) {
  const index = new Map();
  for (const m of manifests) {
    const cfg = PRODUCT_CONFIG[m.product_id];
    if (!cfg) continue;
    const shared = sharedSsotPaths(m);
    for (const rel of m.owned_files || []) {
      if (!SOURCE_EXT.test(rel)) continue;
      index.set(rel, { manifest: m, config: cfg, shared });
    }
  }
  return index;
}

function readFileOrNull(root, rel) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

export function classifySourceSsot(tag, { config, shared }) {
  if (!tag) return { ok: false, kind: 'missing-ssot' };
  if (tag === config.canonical_home) return { ok: true };
  if (shared.has(tag)) return { ok: true };
  if (tag === config.deprecated_flat) return { ok: false, kind: 'flat-stub-ssot' };
  if (tag === config.law_anchor) return { ok: false, kind: 'amendment-first-ssot' };
  if (tag.startsWith('docs/projects/AMENDMENT_')) return { ok: false, kind: 'foreign-amendment-ssot' };
  return { ok: false, kind: 'unexpected-ssot' };
}

/**
 * Audit manifest-owned source files for product-home drift.
 *
 * By default (includeDebt=false) only hard violations are returned:
 *   flat-stub-ssot, foreign-amendment-ssot, unexpected-ssot
 *
 * Migration debt kinds (missing-ssot, amendment-first-ssot) are skipped unless
 * includeDebt=true. These reflect files that pre-date the product-home model and
 * are migrated incrementally — they are not active regressions.
 */
export function auditManifestOwnedSources(manifests, root, { includeDebt = false } = {}) {
  const violations = [];
  const index = buildOwnedIndex(manifests);
  for (const [rel, ctx] of index) {
    const content = readFileOrNull(root, rel);
    if (content == null) continue;
    const tag = extractSsotTag(content);
    const verdict = classifySourceSsot(tag, ctx);
    if (!verdict.ok) {
      if (DEBT_KINDS.has(verdict.kind) && !includeDebt) continue;
      violations.push({
        file: rel,
        product_id: ctx.manifest.product_id,
        kind: verdict.kind,
        tag: tag || null,
        expected: ctx.config.canonical_home,
      });
    }
    if (content.includes(`@ssot ${ctx.config.deprecated_flat}`)) {
      violations.push({
        file: rel,
        product_id: ctx.manifest.product_id,
        kind: 'flat-stub-ssot-inline',
        tag: ctx.config.deprecated_flat,
        expected: ctx.config.canonical_home,
      });
    }
  }
  return violations;
}

const LIFEOS_PROMPT_FILES = [
  'prompts/00-LIFEOS-AGENT-CONTRACT.md',
  'prompts/README.md',
];

function listLifeosPrompts(root) {
  const dir = path.join(root, 'prompts');
  if (!existsSync(dir)) return [];
  const out = [...LIFEOS_PROMPT_FILES];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('lifeos-') && name.endsWith('.md')) out.push(`prompts/${name}`);
  }
  return [...new Set(out)];
}

const LIFERE_PROMPT_FILES = [
  'docs/LIFERE_ALPHA_AUDIT_AGENT_PROMPT.md',
];

export function auditProductPrompts(root) {
  const violations = [];
  for (const rel of listLifeosPrompts(root)) {
    const content = readFileOrNull(root, rel);
    if (!content) continue;
    const cfg = PRODUCT_CONFIG.lifeos;
    if (/\*\*SSOT:\*\*\s*`docs\/products\/LIFEOS\.md`/i.test(content)) {
      violations.push({ file: rel, product_id: 'lifeos', kind: 'prompt-flat-stub', expected: cfg.canonical_home });
    }
    if (/@ssot\s+docs\/products\/LIFEOS\.md/i.test(content)) {
      violations.push({ file: rel, product_id: 'lifeos', kind: 'prompt-flat-stub-at-ssot', expected: cfg.canonical_home });
    }
    // prompt-amendment-first is migration debt: prompts written before product-home model existed.
    // Track but don't block — same policy as amendment-first-ssot in source files.
  }
  for (const rel of LIFERE_PROMPT_FILES) {
    const content = readFileOrNull(root, rel);
    if (!content) continue;
    const cfg = PRODUCT_CONFIG.lifere;
    if (/\*\*SSOT:\*\*\s*`docs\/products\/LIFERE\.md`/i.test(content)) {
      violations.push({ file: rel, product_id: 'lifere', kind: 'prompt-flat-stub', expected: cfg.canonical_home });
    }
    if (/@ssot\s+docs\/projects\/AMENDMENT_LIFERE\.md/i.test(content) && !/@ssot\s+docs\/products\/lifere\/PRODUCT_HOME\.md/i.test(content)) {
      if (/<!--\s*@ssot\s+docs\/projects\/AMENDMENT_LIFERE\.md\s*-->/.test(content)) {
        violations.push({ file: rel, product_id: 'lifere', kind: 'prompt-amendment-first', expected: cfg.canonical_home });
      }
    }
  }
  return violations;
}

export function readStagedFile(root, rel) {
  try {
    return execSync(`git show :${rel}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/**
 * Block staged manifest-owned files regressing to flat-stub or foreign-amendment.
 * Amendment-first and missing-ssot are migration debt — not blocked at commit time
 * (files that already had those tags aren't penalized for being touched).
 */
export function auditStagedProductRegression(manifests, root, stagedFiles) {
  const violations = [];
  const index = buildOwnedIndex(manifests);
  for (const rel of stagedFiles) {
    const ctx = index.get(rel);
    if (!ctx) continue;
    const content = readStagedFile(root, rel) ?? readFileOrNull(root, rel);
    if (!content) continue;
    const tag = extractSsotTag(content);
    const verdict = classifySourceSsot(tag, ctx);
    if (!verdict.ok && !DEBT_KINDS.has(verdict.kind)) {
      violations.push({
        file: rel,
        product_id: ctx.manifest.product_id,
        kind: `staged-${verdict.kind}`,
        tag: tag || null,
        expected: ctx.config.canonical_home,
      });
    }
  }
  return violations;
}

export function resolveCoCommitPaths(ssotTag, sourceFile, manifests) {
  const paths = new Set([ssotTag]);
  for (const m of manifests) {
    const manifestRel = `docs/products/${m.product_id}/FILE_MANIFEST.json`;
    if (m.canonical_home) paths.add(m.canonical_home);
    paths.add(manifestRel);
    if (m.owned_files?.includes(sourceFile)) {
      if (m.canonical_home) paths.add(m.canonical_home);
      paths.add(manifestRel);
    }
    if (ssotTag === m.canonical_home) {
      paths.add(m.canonical_home);
      paths.add(manifestRel);
    }
  }
  return [...paths];
}

export function isManifestOwnedSource(file, manifests) {
  return manifests.some((m) => m.owned_files?.includes(file));
}

const MISSION_CONTENT_RE = /^builderos-reboot\/MISSIONS\/[^/]+\/CONTENT\/.+\.(js|mjs)$/;
const AMENDMENT_SSOT_RE = /@ssot\s+docs\/projects\/AMENDMENT_/;

/** Mission CONTENT files with amendment @ssot must declare HISTORY_SNAPSHOT in header. */
export function auditMissionContentHistoryMarkers(root) {
  const violations = [];
  const missionsDir = path.join(root, 'builderos-reboot/MISSIONS');
  if (!existsSync(missionsDir)) return violations;

  function walk(dir, relPrefix) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const rel = relPrefix ? `${relPrefix}/${name.name}` : name.name;
      const abs = path.join(dir, name.name);
      if (name.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      const repoRel = `builderos-reboot/MISSIONS/${rel}`.replace(/\\/g, '/');
      if (!MISSION_CONTENT_RE.test(repoRel)) continue;
      const content = readFileOrNull(root, repoRel);
      if (!content || !AMENDMENT_SSOT_RE.test(content)) continue;
      const header = content.slice(0, 1200);
      if (!header.includes('HISTORY_SNAPSHOT')) {
        violations.push({
          file: repoRel,
          product_id: 'mission-content',
          kind: 'content-amendment-without-history-marker',
          expected: 'HISTORY_SNAPSHOT in header comment block',
        });
      }
    }
  }
  walk(missionsDir, '');
  return violations;
}

export function auditAuthorityBoundaryMarkers(root) {
  const violations = [];
  const checks = [
    {
      file: 'docs/products/AUTHORITY_BOUNDARIES.md',
      needles: ['CANONICAL', 'runtime authority', 'NOT AUTHORITATIVE'],
    },
    {
      file: 'builderos-reboot/MISSIONS/README.md',
      needles: ['HISTORY_SNAPSHOT', 'NOT runtime authority', 'FILE_MANIFEST.json'],
    },
    {
      file: 'docs/conversation_dumps/README.md',
      needles: ['NOT AUTHORITATIVE', 'AUTHORITY_BOUNDARIES'],
    },
    {
      file: 'docs/LIFERE_GAP_AUDIT.md',
      needles: ['HISTORICAL_SNAPSHOT', 'NOT LIVE AUTHORITY', 'PRODUCT_HOME.md'],
    },
  ];
  for (const { file, needles } of checks) {
    const content = readFileOrNull(root, file);
    if (!content) {
      violations.push({ file, product_id: 'boundary', kind: 'missing-boundary-doc', expected: file });
      continue;
    }
    for (const needle of needles) {
      if (!content.includes(needle)) {
        violations.push({
          file,
          product_id: 'boundary',
          kind: 'boundary-marker-missing',
          tag: needle,
          expected: needle,
        });
      }
    }
  }
  return violations;
}

export function formatViolation(v) {
  const tagPart = v.tag ? ` (@ssot ${v.tag})` : '';
  return `${v.file} [${v.product_id}] ${v.kind}${tagPart} → expected ${v.expected}`;
}
