#!/usr/bin/env node
/**
 * SYNOPSIS: [^\n]*\n\n?/m, '')
 * One-time migration: docs/projects/AMENDMENT_*.md → docs/products/<id>/PRODUCT_HOME.md
 * Merges manifests, deletes duplicates, updates repo references.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(ROOT, 'docs/projects');
const PRODUCTS = path.join(ROOT, 'docs/products');

const SKIP_FILES = new Set([
  'AMENDMENT_TEMPLATE.md',
  'AMENDMENT_READINESS_CHECKLIST.md',
]);

const PRODUCT_ID_BY_FILE = {
  'AMENDMENT_21_LIFEOS_CORE.md': 'lifeos',
  'AMENDMENT_LIFERE.md': 'lifere',
  'AMENDMENT_05_SITE_BUILDER.md': 'site-builder',
  'AMENDMENT_10_API_COST_SAVINGS.md': 'api-cost-savings',
  'AMENDMENT_11_BOLDTRAIL_REALESTATE.md': 'boldtrail',
  'AMENDMENT_17_TC_SERVICE.md': 'tc-service',
  'AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md': 'clientcare-billing-recovery',
  'AMENDMENT_38_IDEA_VAULT.md': 'ideavault',
  'AMENDMENT_04_AUTO_BUILDER.md': 'builderos',
  'AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md': 'builderos',
  'AMENDMENT_47_MISSION_RUNTIME.md': 'builderos',
  'AMENDMENT_48_BUILDEROS_VOCABULARY.md': 'builderos',
  'AMENDMENT_25_CONFLICT_ARBITRATOR.md': 'conflict-arbitrator',
};

const PRODUCT_DISPLAY_NAME = {
  lifeos: 'LifeOS',
  lifere: 'LifeRE',
  'site-builder': 'Site Builder',
  'api-cost-savings': 'API Cost Savings',
  boldtrail: 'BoldTrail',
  'tc-service': 'TC Service',
  'clientcare-billing-recovery': 'ClientCare Billing Recovery',
  ideavault: 'IdeaVault',
  builderos: 'BuilderOS',
  'conflict-arbitrator': 'Conflict Arbitrator',
  marketingos: 'MarketingOS',
  'ai-council': 'AI Council',
  'memory-system': 'Memory System',
  'financial-revenue': 'Financial Revenue',
  'game-publisher': 'Game Publisher',
  'video-pipeline': 'Video Pipeline',
  'outreach-crm': 'Outreach CRM',
  'life-coaching': 'Life Coaching',
  'command-center': 'Command Center',
  'knowledge-base': 'Knowledge Base',
  'white-label': 'White Label',
  'business-tools': 'Business Tools',
  'word-keeper': 'Word Keeper',
  'project-governance': 'Project Governance',
  'capability-map': 'Capability Map',
  'story-studio': 'Story Studio',
  'creator-media-os': 'Creator Media OS',
  'faith-studio': 'Faith Studio',
  'personal-finance-os': 'Personal Finance OS',
  'productized-sprint': 'Productized Sprint',
  'wellness-studio': 'Wellness Studio',
  'ai-receptionist': 'AI Receptionist',
  'enterprise-ai-governance': 'Enterprise AI Governance',
  'teacher-os': 'Teacher OS',
  'music-talent-studio': 'Music Talent Studio',
  'kingsman-protocol': 'Kingsman Protocol',
  'kids-os': 'Kids OS',
  'lumin-university': 'Lumin University',
  'zero-drift-handoff': 'Zero Drift Handoff Protocol',
  'universal-overlay': 'Universal Overlay',
  'memory-intelligence': 'Memory Intelligence',
  'oil-security-divisions': 'OIL Security Divisions',
  'token-accounting-os': 'Token Accounting OS',
};

const EXCLUDE_REF_DIRS = [
  'node_modules',
  '.git',
  'builderos-reboot/_hist',
  'docs/projects/builderos-remediation',
  'docs/conversation_dumps',
];

const SMOS_OWNED = [
  'routes/socialmediaos-routes.js',
  'services/socialmediaos-service.js',
  'services/lifere-socialmediaos-bridge.js',
  'services/founder-smos-content-executor.js',
  'db/migrations/20260626_socialmediaos.sql',
  'db/migrations/20260629_socialmediaos_schema_align.sql',
  'scripts/verify-socialmediaos.mjs',
  'scripts/run-founder-socialmediaos-chat-a2z.mjs',
  'products/receipts/SOCIALMEDIAOS_FOUNDER_CHAT_A2Z.json',
];

function slugFromAmendmentFile(filename) {
  if (PRODUCT_ID_BY_FILE[filename]) return PRODUCT_ID_BY_FILE[filename];
  const base = filename.replace(/^AMENDMENT_/, '').replace(/\.md$/, '');
  if (base === 'LIFERE') return 'lifere';
  const stripped = base.replace(/^\d+_/, '').toLowerCase();
  return stripped
    .replace(/_core$/, '')
    .replace(/_realestate$/, '')
    .replace(/_billing_recovery$/, '-billing-recovery')
    .replace(/_auto_builder$/, '')
    .replace(/_/g, '-')
    .replace(/^lifeos-core$/, 'lifeos');
}

function parseFormerAmendmentLabel(filename) {
  const m = filename.match(/^AMENDMENT_(\d+)?_?(.*)\.md$/);
  if (!m) return filename.replace('.md', '');
  const num = m[1] ? `Amendment ${m[1]}` : '';
  const rest = (m[2] || '').replace(/_/g, ' ').trim();
  return [num, rest].filter(Boolean).join(' — ');
}

function extractOperationalSections(existingHome) {
  const sections = [];
  const wanted = [
    /^## Mission/m,
    /^## Readiness state/m,
    /^## Active missions/m,
    /^## Owned runtime files/m,
    /^## Shared dependencies/m,
    /^## Shared-with/m,
    /^## What it does/m,
    /^## Runtime files/m,
    /^## Conversations/m,
  ];
  for (const re of wanted) {
    const match = existingHome.match(re);
    if (!match) continue;
    const start = match.index;
    const rest = existingHome.slice(start + 1);
    const nextH2 = rest.search(/\n## /);
    const block = nextH2 >= 0
      ? existingHome.slice(start, start + 1 + nextH2)
      : existingHome.slice(start);
    if (!sections.some((s) => s.trim() === block.trim())) sections.push(block.trim());
  }
  return sections.join('\n\n');
}

function stripAmendmentHeader(amendmentBody) {
  return amendmentBody
    .replace(/^<!-- SYNOPSIS:[^\n]*\n\n?/m, '')
    .replace(/^# AMENDMENT[^\n]*\n\n?/m, '')
    .replace(/^# [^\n]+\n\n?/m, '');
}

function buildProductHomeHeader(productId, displayName, formerLabel, existingHome) {
  const lines = [
    `<!-- SYNOPSIS: Canonical product home — ${displayName} -->`,
    '',
    `# ${displayName} Product Home`,
    '',
    `**Formerly called:** ${formerLabel}`,
    '',
    '| Field | Value |',
    '|---|---|',
    '| **Canonical home** | this file |',
    `| **Product id** | \`${productId}\` |`,
    '| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |',
    `| **Machine manifest** | \`docs/products/${productId}/FILE_MANIFEST.json\` |`,
    '| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |',
    '| **Last Updated** | 2026-06-29 |',
    '',
    '---',
    '',
  ];
  const ops = existingHome ? extractOperationalSections(existingHome) : '';
  if (ops) {
    lines.push('## Product operations (preserved from prior home)', '', ops, '', '---', '');
  }
  return lines.join('\n');
}

function mergeManifest(existingPath, amendmentManifestPath, productId, canonicalHome) {
  let existing = {};
  if (existingPath && fs.existsSync(existingPath)) {
    try { existing = JSON.parse(fs.readFileSync(existingPath, 'utf8')); } catch { /* */ }
  }
  let amendment = {};
  if (amendmentManifestPath && fs.existsSync(amendmentManifestPath)) {
    try { amendment = JSON.parse(fs.readFileSync(amendmentManifestPath, 'utf8')); } catch { /* */ }
  }
  const owned = new Set([
    ...(existing.owned_files || []),
    ...(amendment.owned_files || []),
    `docs/products/${productId}/PRODUCT_HOME.md`,
    `docs/products/${productId}/FILE_MANIFEST.json`,
  ]);
  return {
    schema: 'product_file_manifest_v1',
    product_id: productId,
    project_id: amendment.project_id || existing.project_id || productId.replace(/-/g, '_'),
    name: amendment.name || existing.name || PRODUCT_DISPLAY_NAME[productId] || productId,
    canonical_home: canonicalHome,
    amendment_path: canonicalHome,
    updated_at: '2026-06-29',
    ownership_policy: existing.ownership_policy || 'pointer_not_duplication',
    owned_files: [...owned].filter((f) => !f.includes('docs/projects/AMENDMENT_')),
    shared_dependencies: existing.shared_dependencies || [],
    history_anchors: existing.history_anchors || [],
    ...(amendment.required_routes ? { required_routes: amendment.required_routes } : {}),
    ...(amendment.required_tables ? { required_tables: amendment.required_tables } : {}),
    ...(amendment.required_env ? { required_env: amendment.required_env } : {}),
    ...(amendment.assertions ? { assertions: amendment.assertions } : {}),
    ...(amendment.completion_checks ? { completion_checks: amendment.completion_checks } : {}),
  };
}

function writeRedirectStub(productId, displayName, formerLabel) {
  const stubName = displayName.replace(/\s+/g, '').toUpperCase();
  const stubPath = path.join(PRODUCTS, `${stubName}.md`);
  const content = `<!-- SYNOPSIS: ${displayName} — redirect stub — see PRODUCT_HOME.md -->

# ${displayName} — redirect stub

This file is a **redirect stub**. It is not the canonical product home.

**Canonical product home:** [\`docs/products/${productId}/PRODUCT_HOME.md\`](${productId}/PRODUCT_HOME.md)

**Formerly called:** ${formerLabel}

All product truth, owned files, mission state, and agent read order are in the canonical home above.
`;
  fs.writeFileSync(stubPath, content);
}

function restructureMarketingOs() {
  const smosDir = path.join(PRODUCTS, 'socialmediaos');
  const mosDir = path.join(PRODUCTS, 'marketingos');
  const smosModuleDir = path.join(mosDir, 'socialmediaos');

  if (fs.existsSync(smosDir) && !fs.existsSync(mosDir)) {
    fs.renameSync(smosDir, mosDir);
  }

  fs.mkdirSync(smosModuleDir, { recursive: true });

  const parentHome = path.join(mosDir, 'PRODUCT_HOME.md');
  if (fs.existsSync(parentHome)) {
    let body = fs.readFileSync(parentHome, 'utf8');
    body = body.replace(
      /# SocialMediaOS Product Home/,
      '# MarketingOS Product Home',
    );
    body = body.replace(
      /\*\*Formerly called:\*\* Amendment 41 \(MarketingOS \/ SocialMediaOS\)/,
      '**Formerly called:** Amendment 41 (MarketingOS)',
    );
    body = body.replace(
      /\| \*\*Product id\*\* \| `socialmediaos` \|/,
      '| **Product id** | `marketingos` |',
    );
    body = body.replace(
      /docs\/products\/socialmediaos\//g,
      'docs/products/marketingos/',
    );
    fs.writeFileSync(parentHome, body);
  }

  const parentManifest = path.join(mosDir, 'FILE_MANIFEST.json');
  if (fs.existsSync(parentManifest)) {
    const manifest = JSON.parse(fs.readFileSync(parentManifest, 'utf8'));
    manifest.product_id = 'marketingos';
    manifest.project_id = 'marketingos';
    manifest.name = 'MarketingOS';
    manifest.canonical_home = 'docs/products/marketingos/PRODUCT_HOME.md';
    manifest.amendment_path = 'docs/products/marketingos/PRODUCT_HOME.md';
    manifest.modules = ['socialmediaos'];
    fs.writeFileSync(parentManifest, JSON.stringify(manifest, null, 2) + '\n');
  }

  const smosHome = `# SocialMediaOS Module Home

**Parent product:** [MarketingOS](../PRODUCT_HOME.md)  
**Formerly called:** Amendment 41 — first customer-facing module  
**Product id:** \`socialmediaos\` (module under MarketingOS)  
**Constitutional law:** \`docs/constitution/NORTH_STAR_SSOT.md\`  
**Machine manifest:** \`docs/products/marketingos/socialmediaos/FILE_MANIFEST.json\`  
**Last Updated:** 2026-06-29

---

## Scope

SocialMediaOS is the **first shipped module** inside MarketingOS.

Core loop: founder coaching session → transcript → story extraction → content pack → approval → export.

Platform phases (YouTubeOS, PodcastOS, CampaignOS) live in the parent [MarketingOS product home](../PRODUCT_HOME.md).

## Owned runtime (this module)

See \`FILE_MANIFEST.json\` in this folder.

High-signal surfaces:
- \`/api/v1/socialmediaos/*\` — intake scaffold (sessions, content packs)
- \`/api/v1/lifere/marketing/socialmediaos/*\` — LifeRE adapter bridge
- \`public/overlay/lifeos-lifere.html\` — founder panel
- \`lifeos-app.html?stack=socialmediaos\` — stack launcher

## Verification

\`\`\`bash
node scripts/verify-socialmediaos.mjs
node scripts/run-founder-socialmediaos-chat-a2z.mjs
\`\`\`

## Phase 1 MVP spec

Full Phase 1 technical specification: parent PRODUCT_HOME §5 Phase 1 and §6.
`;

  fs.writeFileSync(path.join(smosModuleDir, 'PRODUCT_HOME.md'), smosHome);

  const smosManifest = {
    schema: 'product_module_manifest_v1',
    product_id: 'socialmediaos',
    parent_product_id: 'marketingos',
    parent_home: 'docs/products/marketingos/PRODUCT_HOME.md',
    canonical_home: 'docs/products/marketingos/socialmediaos/PRODUCT_HOME.md',
    updated_at: '2026-06-29',
    owned_files: [
      'docs/products/marketingos/socialmediaos/PRODUCT_HOME.md',
      'docs/products/marketingos/socialmediaos/FILE_MANIFEST.json',
      ...SMOS_OWNED,
    ],
  };
  fs.writeFileSync(path.join(smosModuleDir, 'FILE_MANIFEST.json'), JSON.stringify(smosManifest, null, 2) + '\n');

  const oldStub = path.join(PRODUCTS, 'SOCIALMEDIAOS.md');
  if (fs.existsSync(oldStub)) fs.unlinkSync(oldStub);
  writeRedirectStub('marketingos', 'MarketingOS', 'Amendment 41 (MarketingOS)');

  const smosStub = path.join(PRODUCTS, 'SOCIALMEDIAOS.md');
  fs.writeFileSync(smosStub, `<!-- SYNOPSIS: SocialMediaOS module — redirect stub -->

# SocialMediaOS — redirect stub

**Module home:** [\`docs/products/marketingos/socialmediaos/PRODUCT_HOME.md\`](marketingos/socialmediaos/PRODUCT_HOME.md)

**Parent product:** [\`docs/products/marketingos/PRODUCT_HOME.md\`](marketingos/PRODUCT_HOME.md)

SocialMediaOS is a module inside MarketingOS, not a standalone top-level product folder.
`);
}

const pathMap = new Map();

function migrateAmendment(amendmentFile) {
  const productId = slugFromAmendmentFile(amendmentFile);
  if (productId === 'socialmediaos') return null;

  const formerLabel = parseFormerAmendmentLabel(amendmentFile);
  const displayName = PRODUCT_DISPLAY_NAME[productId]
    || formerLabel.split('—').pop()?.trim()
    || productId;

  const amendmentPath = path.join(PROJECTS, amendmentFile);
  const manifestPath = path.join(PROJECTS, amendmentFile.replace('.md', '.manifest.json'));
  const productDir = path.join(PRODUCTS, productId);
  const homePath = path.join(productDir, 'PRODUCT_HOME.md');
  const manifestOut = path.join(productDir, 'FILE_MANIFEST.json');

  fs.mkdirSync(productDir, { recursive: true });

  const existingHome = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : null;

  if (productId === 'conflict-arbitrator') {
    const flat = path.join(PRODUCTS, 'conflict-arbitrator.md');
    if (fs.existsSync(flat) && !existingHome) {
      fs.writeFileSync(homePath, fs.readFileSync(flat, 'utf8'));
    }
    if (fs.existsSync(flat)) fs.unlinkSync(flat);
  }

  const amendmentBody = fs.readFileSync(amendmentPath, 'utf8');
  let merged;
  if (existingHome && existingHome.includes('Formerly called:') && productId === 'builderos') {
    merged = `${existingHome.trim()}\n\n---\n\n## Additional spec — ${formerLabel}\n\n${stripAmendmentHeader(amendmentBody)}`;
  } else {
    merged = buildProductHomeHeader(productId, displayName, formerLabel, existingHome)
      + stripAmendmentHeader(amendmentBody);
  }

  fs.writeFileSync(homePath, merged);

  const manifest = mergeManifest(
    fs.existsSync(manifestOut) ? manifestOut : null,
    fs.existsSync(manifestPath) ? manifestPath : null,
    productId,
    `docs/products/${productId}/PRODUCT_HOME.md`,
  );
  if (fs.existsSync(manifestOut)) {
    const prev = JSON.parse(fs.readFileSync(manifestOut, 'utf8'));
    manifest.owned_files = [...new Set([...(prev.owned_files || []), ...(manifest.owned_files || [])])];
  }
  fs.writeFileSync(manifestOut, JSON.stringify(manifest, null, 2) + '\n');

  if (!existingHome || !existingHome.includes('Formerly called:') || productId !== 'builderos') {
    writeRedirectStub(productId, displayName, formerLabel);
  }

  pathMap.set(`docs/projects/${amendmentFile}`, `docs/products/${productId}/PRODUCT_HOME.md`);
  if (fs.existsSync(manifestPath)) {
    pathMap.set(`docs/projects/${amendmentFile.replace('.md', '.manifest.json')}`, `docs/products/${productId}/FILE_MANIFEST.json`);
  }

  fs.unlinkSync(amendmentPath);
  if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);

  return { productId, formerLabel, amendmentFile };
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.relative(ROOT, path.join(dir, ent.name));
    if (EXCLUDE_REF_DIRS.some((ex) => rel.startsWith(ex))) continue;
    if (ent.isDirectory()) walkFiles(path.join(dir, ent.name), out);
    else if (/\.(js|mjs|json|md|html|sql)$/.test(ent.name)) out.push(path.join(dir, ent.name));
  }
  return out;
}

function updateReferences() {
  pathMap.set('docs/products/socialmediaos/PRODUCT_HOME.md', 'docs/products/marketingos/PRODUCT_HOME.md');
  pathMap.set('docs/products/socialmediaos/FILE_MANIFEST.json', 'docs/products/marketingos/FILE_MANIFEST.json');

  const files = walkFiles(ROOT);
  let touched = 0;
  for (const file of files) {
    if (file.includes('migrate-amendments-to-product-homes.mjs')) continue;
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of pathMap) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        changed = true;
      }
    }
    const genericPatterns = [
      [/docs\/projects\/AMENDMENT_21_LIFEOS_CORE\.md/g, 'docs/products/lifeos/PRODUCT_HOME.md'],
      [/docs\/projects\/AMENDMENT_LIFERE\.md/g, 'docs/products/lifere/PRODUCT_HOME.md'],
      [/docs\/projects\/AMENDMENT_04_AUTO_BUILDER\.md/g, 'docs/products/builderos/PRODUCT_HOME.md'],
      [/docs\/projects\/AMENDMENT_38_IDEA_VAULT\.md/g, 'docs/products/ideavault/PRODUCT_HOME.md'],
      [/docs\/projects\/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL\.md/g, 'docs/products/zero-drift-handoff/PRODUCT_HOME.md'],
      [/docs\/projects\/AMENDMENT_19_PROJECT_GOVERNANCE\.md/g, 'docs/products/project-governance/PRODUCT_HOME.md'],
    ];
    for (const [re, repl] of genericPatterns) {
      if (re.test(content)) {
        content = content.replace(re, repl);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      touched += 1;
    }
  }
  return touched;
}

function main() {
  const amendments = fs.readdirSync(PROJECTS)
    .filter((f) => f.startsWith('AMENDMENT_') && f.endsWith('.md') && !SKIP_FILES.has(f));

  const results = [];
  for (const file of amendments) {
    const r = migrateAmendment(file);
    if (r) results.push(r);
  }

  restructureMarketingOs();

  pathMap.set('docs/projects/AMENDMENT_41_MARKETINGOS.md', 'docs/products/marketingos/PRODUCT_HOME.md');
  pathMap.set('docs/projects/AMENDMENT_41_MARKETINGOS.manifest.json', 'docs/products/marketingos/FILE_MANIFEST.json');

  const refCount = updateReferences();

  console.log(JSON.stringify({
    migrated: results.length,
    products: results.map((r) => r.productId).sort(),
    referencesUpdatedInFiles: refCount,
  }, null, 2));
}

main();
