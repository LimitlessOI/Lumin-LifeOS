/**
 * SYNOPSIS: Constitutional Framework CLI — seed, verify, add, promote, demote, challenge, review, render.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_DIR = path.join(ROOT, 'data', 'constitutional-framework');
const REGISTRY_PATH = path.join(REGISTRY_DIR, 'REGISTRY.json');
const RESEARCH_REGISTRY_PATH = path.join(REGISTRY_DIR, 'RESEARCH_REGISTRY.json');
const HISTORY_PATH = path.join(REGISTRY_DIR, 'HISTORY.jsonl');
const NORTH_STAR = path.join(ROOT, 'docs', 'constitution', 'NORTH_STAR_SSOT.md');
const FRAMEWORK = path.join(ROOT, 'docs', 'constitution', 'CONSTITUTIONAL_FRAMEWORK.md');
const PROCESSES = path.join(ROOT, 'docs', 'constitution', 'CONSTITUTIONAL_PROCESSES.md');
const PRODUCT_REGISTRY = path.join(ROOT, 'docs', 'products', 'PRODUCT_REGISTRY.json');

function now() {
  return new Date().toISOString();
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function appendLine(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`);
}

const CANONICAL_LEVELS = {
  'NorthStar': { name: 'North Star — Purpose', order: 0 },
  'Principle': { name: 'Foundational Principle', order: 1 },
  'Law': { name: 'Constitutional Law', order: 2 },
  'Process': { name: 'Constitutional Process', order: 3 },
  'Governance': { name: 'Organizational Governance', order: 4 },
  'Doctrine': { name: 'Operating Doctrine', order: 5 },
  'ProductGovernance': { name: 'Product Governance', order: 6 },
  'Implementation': { name: 'Implementation', order: 7 },
};

function ensureRegistry() {
  let registry = readJson(REGISTRY_PATH);
  if (!registry) {
    registry = {
      schema: 'constitutional_registry_v1',
      authority: {
        domain: 'Constitutional',
        status: 'CANONICAL',
        supreme_law: 'docs/constitution/NORTH_STAR_SSOT.md',
        framework: 'docs/constitution/CONSTITUTIONAL_FRAMEWORK.md',
        processes: 'docs/constitution/CONSTITUTIONAL_PROCESSES.md',
      },
      levels: CANONICAL_LEVELS,
      items: [],
      seeded_at: now(),
      updated_at: now(),
    };
  } else {
    registry.levels = CANONICAL_LEVELS;
  }
  return registry;
}

function ensureResearchRegistry() {
  let registry = readJson(RESEARCH_REGISTRY_PATH);
  if (!registry) {
    registry = {
      schema: 'constitutional_research_registry_v1',
      authority: {
        domain: 'Research',
        status: 'CANONICAL',
        note: 'Candidates and provisional theories — not governing authority until promoted through the amendment process.',
      },
      maturity_states: ['idea', 'observation', 'hypothesis', 'emerging_pattern', 'supported_principle', 'candidate_law'],
      triage_states: ['active', 'stalled', 'abandoned', 'ready_for_proposal'],
      items: [],
      seeded_at: now(),
      updated_at: now(),
    };
  }
  return registry;
}

function normalizeId(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseNorthStarHeadings(text) {
  const items = [];
  const lines = text.split('\n');
  const articleRe = /^## ARTICLE\s+([IVX0-9]+):\s*(.+)$/;
  const sectionRe = /^### (\d+(?:\.\d+[A-Z]?)?)\s+(.+)$/;
  const subSectionRe = /^#### (\d+(?:\.\d+[A-Z]?)?)\s+(.+)$/;

  for (const line of lines) {
    const article = line.match(articleRe);
    if (article) {
      const id = `nssot-article-${article[1].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      items.push({
        id,
        title: article[2].trim(),
        anchor: `## ARTICLE ${article[1]}`,
        level: article[1].trim() === 'I' ? 'NorthStar' : 'Law',
      });
      continue;
    }
    const section = line.match(sectionRe);
    if (section) {
      const anchor = section[1];
      const title = section[2].trim();
      const id = `nssot-${anchor.replace(/\./g, '-').toLowerCase()}`;
      let level = 'Law';
      if (/^1\./.test(anchor) || title.toLowerCase().includes('mission') || title.toLowerCase().includes('purpose')) level = 'NorthStar';
      items.push({ id, title, anchor: `§${anchor}`, level });
      continue;
    }
    const sub = line.match(subSectionRe);
    if (sub) {
      const anchor = sub[1];
      const title = sub[2].trim();
      const id = `nssot-${anchor.replace(/\./g, '-').toLowerCase()}`;
      items.push({ id, title, anchor: `§${anchor}`, level: 'Law' });
    }
  }
  return items;
}

function parseProductGovernance() {
  const products = readJson(PRODUCT_REGISTRY);
  if (!products?.products) return [];
  return products.products.map((prod) => {
    const productId = prod.product_id;
    const home = prod.canonical_home || prod.law_path;
    return {
      id: `product-governance-${normalizeId(productId)}`,
      title: `${prod.name || productId} Product Governance`,
      anchor: home,
      level: 'ProductGovernance',
      source_file: home,
      source_anchor: 'header',
    };
  });
}

function defaultScores(level) {
  const epistemic = {
    NorthStar: 95, Principle: 90, Law: 85, Process: 80,
    Governance: 75, Doctrine: 70, ProductGovernance: 75, Implementation: 0,
  }[level] ?? 60;
  const commitment = {
    NorthStar: 100, Principle: 95, Law: 90, Process: 85,
    Governance: 80, Doctrine: 75, ProductGovernance: 80, Implementation: 0,
  }[level] ?? 50;
  return { epistemic, commitment };
}

function mergeItems(existing, incoming) {
  const byId = new Map(existing.map((i) => [i.id, i]));
  for (const inc of incoming) {
    const cur = byId.get(inc.id);
    const scores = defaultScores(inc.level);
    if (cur) {
      byId.set(inc.id, {
        ...cur,
        ...inc,
        epistemic_confidence_score: inc.epistemic_confidence_score ?? cur.epistemic_confidence_score ?? scores.epistemic,
        constitutional_commitment_score: inc.constitutional_commitment_score ?? cur.constitutional_commitment_score ?? scores.commitment,
        evidence_score: inc.evidence_score ?? cur.evidence_score ?? scores.epistemic - 5,
        evidence_level: inc.evidence_level ?? cur.evidence_level ?? 'ConstitutionalLaw',
        enforcement_status: inc.enforcement_status ?? cur.enforcement_status ?? 'enforced',
        enforcement_method: inc.enforcement_method ?? cur.enforcement_method ?? 'preflight',
        promotion_date: inc.promotion_date ?? cur.promotion_date ?? now().slice(0, 10),
        last_challenge: inc.last_challenge ?? cur.last_challenge ?? null,
        last_review: inc.last_review ?? cur.last_review ?? now().slice(0, 10),
        related_items: inc.related_items ?? cur.related_items ?? [],
        supersedes: inc.supersedes ?? cur.supersedes ?? [],
        superseded_by: inc.superseded_by ?? cur.superseded_by ?? [],
        open_questions: inc.open_questions ?? cur.open_questions ?? [],
        updated_at: now(),
      });
    } else {
      byId.set(inc.id, {
        ...inc,
        purpose: inc.purpose || '',
        epistemic_confidence_score: inc.epistemic_confidence_score ?? scores.epistemic,
        constitutional_commitment_score: inc.constitutional_commitment_score ?? scores.commitment,
        evidence_score: inc.evidence_score ?? Math.max(0, scores.epistemic - 5),
        evidence_level: inc.evidence_level ?? 'ConstitutionalLaw',
        enforcement_status: inc.enforcement_status ?? 'enforced',
        enforcement_method: inc.enforcement_method ?? 'preflight',
        promotion_date: inc.promotion_date ?? now().slice(0, 10),
        last_challenge: inc.last_challenge ?? null,
        last_review: inc.last_review ?? now().slice(0, 10),
        related_items: inc.related_items ?? [],
        supersedes: inc.supersedes ?? [],
        superseded_by: inc.superseded_by ?? [],
        open_questions: inc.open_questions ?? [],
        source_file: inc.source_file || NORTH_STAR,
        source_anchor: inc.source_anchor || inc.anchor || '',
      });
    }
  }
  return Array.from(byId.values());
}

function itemLevelOrder(level) {
  const order = {
    NorthStar: 0, Principle: 1, Law: 2, Process: 3,
    Governance: 4, Doctrine: 5, ProductGovernance: 6, Implementation: 7,
  };
  return order[level] ?? 99;
}

function thresholdFor(level) {
  return {
    NorthStar: 90, Principle: 90, Law: 80, Process: 70,
    Governance: 70, Doctrine: 60, ProductGovernance: 70, Implementation: 0,
  }[level] ?? 0;
}

function cmdSeed() {
  const registry = ensureRegistry();
  const nsText = fs.readFileSync(NORTH_STAR, 'utf8');
  const nsItems = parseNorthStarHeadings(nsText).map((i) => ({
    ...i,
    source_file: 'docs/constitution/NORTH_STAR_SSOT.md',
    source_anchor: i.anchor,
    purpose: i.title,
    evidence_level: i.level === 'NorthStar' ? 'FoundationalPrinciple' : 'ConstitutionalLaw',
    enforcement_status: 'enforced',
    enforcement_method: 'preflight',
  }));
  const prodItems = parseProductGovernance().map((p) => ({ ...p, purpose: p.purpose || `Product governance for ${p.title.replace(/ Product Governance$/, '')}` }));
  registry.items = []; // re-seed from canonical sources; do not accumulate stale levels
  const frameworkItem = {
    id: 'constitutional-framework',
    title: 'BuilderOS Constitutional Framework v1',
    level: 'Process',
    purpose: 'The manufacturing process for law: authority hierarchy, Knowledge Ladder, two-score confidence model, authority registry, research registry, and processes.',
    evidence_score: 85,
    evidence_level: 'ConstitutionalLaw',
    enforcement_status: 'enforced',
    enforcement_method: 'preflight',
    source_file: FRAMEWORK,
    source_anchor: 'The Missing Piece',
  };
  const processesItem = {
    id: 'constitutional-processes',
    title: 'Constitutional Processes (Level 3)',
    level: 'Process',
    purpose: 'Amendment, promotion, demotion, challenge, review, retirement, emergency change, and dispute resolution.',
    evidence_score: 80,
    evidence_level: 'ConstitutionalLaw',
    enforcement_status: 'enforced',
    enforcement_method: 'preflight',
    source_file: PROCESSES,
    source_anchor: 'Amendment Process',
  };
  registry.items = mergeItems(registry.items, [...nsItems, ...prodItems, frameworkItem, processesItem]);
  registry.updated_at = now();
  registry.seeded_at = registry.seeded_at || now();
  writeJson(REGISTRY_PATH, registry);

  const research = ensureResearchRegistry();
  research.updated_at = now();
  writeJson(RESEARCH_REGISTRY_PATH, research);

  console.log(`Seeded ${registry.items.length} authority items into ${REGISTRY_PATH}`);
  console.log(`Seeded ${research.items.length} research items into ${RESEARCH_REGISTRY_PATH}`);
}

function cmdVerify() {
  const registry = readJson(REGISTRY_PATH);
  if (!registry) {
    console.error('Registry not found. Run: node scripts/constitutional-framework.mjs seed');
    process.exit(1);
  }
  const failures = [];
  const warnings = [];

  const nsText = fs.readFileSync(NORTH_STAR, 'utf8');
  const headings = parseNorthStarHeadings(nsText);
  const byId = new Map(registry.items.map((i) => [i.id, i]));
  const validLevels = new Set(Object.keys(registry.levels || {}));

  for (const h of headings) {
    if (!byId.has(h.id)) {
      failures.push({ id: 'MISSING_REGISTRY_ENTRY', detail: `${h.anchor}: ${h.title} not in REGISTRY.json` });
    }
  }

  for (const item of registry.items) {
    const required = ['id', 'title', 'level', 'purpose', 'epistemic_confidence_score', 'constitutional_commitment_score', 'evidence_score', 'evidence_level', 'enforcement_status', 'enforcement_method', 'promotion_date', 'last_review', 'source_file', 'source_anchor'];
    for (const key of required) {
      if (item[key] === undefined || item[key] === null || item[key] === '') {
        if (key === 'promotion_date' && item.level === 'Candidate') continue;
        failures.push({ id: 'INCOMPLETE_ITEM', detail: `${item.id} missing ${key}` });
      }
    }
    if (!validLevels.has(item.level)) {
      failures.push({ id: 'UNKNOWN_LEVEL', detail: `${item.id} has unknown level ${item.level}` });
    }
    const minConfidence = thresholdFor(item.level);
    if (typeof item.epistemic_confidence_score === 'number' && item.epistemic_confidence_score < minConfidence) {
      failures.push({ id: 'CONFIDENCE_BELOW_THRESHOLD', detail: `${item.id} epistemic confidence ${item.epistemic_confidence_score} < ${minConfidence} for ${item.level}` });
    }
    if (item.level === 'Implementation') {
      failures.push({ id: 'LEVEL_7_IN_REGISTRY', detail: `${item.id} is Level 7 Implementation and must not be in the constitutional registry` });
    }
    const reviewDate = item.last_review ? new Date(item.last_review) : null;
    if (reviewDate) {
      const daysSince = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
      const cadence = { NorthStar: 365, Principle: 180, Law: 90, Process: 90, Governance: 90, Doctrine: 90, ProductGovernance: 90 }[item.level] || 90;
      if (daysSince > cadence) {
        warnings.push({ id: 'OVERDUE_REVIEW', detail: `${item.id} last reviewed ${Math.floor(daysSince)} days ago (cadence ${cadence})` });
      }
    }
  }

  console.log(`Registry: ${registry.items.length} items`);
  console.log(`Failures: ${failures.length}`);
  for (const f of failures) console.error(`  [${f.id}] ${f.detail}`);
  console.log(`Warnings: ${warnings.length}`);
  for (const w of warnings) console.warn(`  [${w.id}] ${w.detail}`);

  if (failures.length) {
    process.exit(1);
  }
  console.log('Constitutional framework verification passed.');
}

function cmdAdd({ title, level, purpose, sourceFile, sourceAnchor, confidence, commitment, evidence, evidenceLevel, enforcementStatus, enforcementMethod }) {
  const registry = ensureRegistry();
  const id = normalizeId(title);
  if (registry.items.some((i) => i.id === id)) {
    console.error(`Item ${id} already exists.`);
    process.exit(1);
  }
  const scores = defaultScores(level);
  registry.items.push({
    id,
    title,
    level,
    purpose: purpose || '',
    epistemic_confidence_score: Number(confidence ?? scores.epistemic),
    constitutional_commitment_score: Number(commitment ?? scores.commitment),
    evidence_score: Number(evidence ?? Math.max(0, scores.epistemic - 5)),
    evidence_level: evidenceLevel || 'Observation',
    enforcement_status: enforcementStatus || 'none',
    enforcement_method: enforcementMethod || 'manual',
    promotion_date: now().slice(0, 10),
    last_challenge: null,
    last_review: now().slice(0, 10),
    related_items: [],
    supersedes: [],
    superseded_by: [],
    open_questions: [],
    source_file: sourceFile || '',
    source_anchor: sourceAnchor || '',
  });
  registry.updated_at = now();
  writeJson(REGISTRY_PATH, registry);
  appendLine(HISTORY_PATH, { event: 'added', id, at: now() });
  console.log(`Added ${id}`);
}

function updateItem(id, updates) {
  const registry = readJson(REGISTRY_PATH);
  if (!registry) {
    console.error('Registry not found. Run seed first.');
    process.exit(1);
  }
  const item = registry.items.find((i) => i.id === id);
  if (!item) {
    console.error(`Item ${id} not found.`);
    process.exit(1);
  }
  Object.assign(item, updates, { updated_at: now() });
  writeJson(REGISTRY_PATH, registry);
  return item;
}

function cmdPromote({ id, evidence, confidence, commitment, reason }) {
  const item = updateItem(id, {
    epistemic_confidence_score: Number(confidence),
    constitutional_commitment_score: commitment === undefined ? undefined : Number(commitment),
    evidence_score: Math.min(100, item.evidence_score + 10),
    last_review: now().slice(0, 10),
  });
  appendLine(HISTORY_PATH, { event: 'promoted', id, evidence, reason, at: now(), epistemic_confidence: item.epistemic_confidence_score, constitutional_commitment: item.constitutional_commitment_score });
  console.log(`Promoted ${id}: epistemic ${item.epistemic_confidence_score}, commitment ${item.constitutional_commitment_score}`);
}

function cmdDemote({ id, reason, supersededBy }) {
  const item = updateItem(id, {
    epistemic_confidence_score: Math.max(0, item.epistemic_confidence_score - 15),
    last_challenge: now().slice(0, 10),
  });
  if (supersededBy) {
    item.superseded_by = [...new Set([...(item.superseded_by || []), supersededBy])];
  }
  appendLine(HISTORY_PATH, { event: 'demoted', id, reason, supersededBy, at: now() });
  console.log(`Demoted ${id}: epistemic ${item.epistemic_confidence_score}`);
}

function cmdChallenge({ id, question, evidence }) {
  const item = updateItem(id, {
    last_challenge: now().slice(0, 10),
    open_questions: [...new Set([...(item.open_questions || []), question])],
  });
  appendLine(HISTORY_PATH, { event: 'challenged', id, question, evidence, at: now() });
  console.log(`Challenged ${id}`);
}

function cmdReview({ id }) {
  const item = updateItem(id, { last_review: now().slice(0, 10) });
  appendLine(HISTORY_PATH, { event: 'reviewed', id, at: now() });
  console.log(`Reviewed ${id}: last_review ${item.last_review}`);
}

function cmdRender() {
  const registry = readJson(REGISTRY_PATH);
  if (!registry) {
    console.error('Registry not found.');
    process.exit(1);
  }
  const sorted = [...registry.items].sort((a, b) => itemLevelOrder(a.level) - itemLevelOrder(b.level) || a.title.localeCompare(b.title));
  console.log('# Constitutional Registry Render\n');
  let currentLevel = null;
  for (const item of sorted) {
    if (item.level !== currentLevel) {
      currentLevel = item.level;
      console.log(`\n## ${registry.levels[currentLevel]?.name || currentLevel}\n`);
    }
    console.log(`### ${item.title} (${item.id})`);
    console.log(`- **Level:** ${item.level}`);
    console.log(`- **Purpose:** ${item.purpose}`);
    console.log(`- **Epistemic confidence:** ${item.epistemic_confidence_score} | **Constitutional commitment:** ${item.constitutional_commitment_score} | **Evidence:** ${item.evidence_score} (${item.evidence_level})`);
    console.log(`- **Enforcement:** ${item.enforcement_status} (${item.enforcement_method})`);
    console.log(`- **Source:** ${item.source_file}${item.source_anchor ? ` — ${item.source_anchor}` : ''}`);
    console.log(`- **Promotion:** ${item.promotion_date || 'n/a'} | **Last review:** ${item.last_review || 'n/a'} | **Last challenge:** ${item.last_challenge || 'n/a'}`);
    if (item.open_questions?.length) console.log(`- **Open questions:** ${item.open_questions.join('; ')}`);
    if (item.superseded_by?.length) console.log(`- **Superseded by:** ${item.superseded_by.join(', ')}`);
    console.log('');
  }
}

function cmdResearchAdd({ title, state, triage, evidence, priority }) {
  const registry = ensureResearchRegistry();
  const id = normalizeId(title);
  if (registry.items.some((i) => i.id === id)) {
    console.error(`Research item ${id} already exists.`);
    process.exit(1);
  }
  registry.items.push({
    id,
    title,
    maturity_state: state || 'idea',
    triage_state: triage || 'active',
    evidence_score: Number(evidence ?? 0),
    research_priority: Number(priority ?? 50),
    added_at: now(),
    updated_at: now(),
    notes: [],
  });
  registry.updated_at = now();
  writeJson(RESEARCH_REGISTRY_PATH, registry);
  console.log(`Added research candidate ${id}`);
}

function cmdResearchList() {
  const registry = readJson(RESEARCH_REGISTRY_PATH);
  if (!registry) {
    console.error('Research registry not found. Run seed first.');
    process.exit(1);
  }
  for (const item of registry.items) {
    console.log(`${item.id}: ${item.title} [${item.maturity_state}] [${item.triage_state}] evidence=${item.evidence_score} priority=${item.research_priority}`);
  }
}

function showHelp() {
  console.log(`Usage:
  node scripts/constitutional-framework.mjs seed
  node scripts/constitutional-framework.mjs verify
  node scripts/constitutional-framework.mjs add --title "..." --level Law --purpose "..."
  node scripts/constitutional-framework.mjs promote --id <id> --confidence 85 [--commitment 90] --evidence "..."
  node scripts/constitutional-framework.mjs demote --id <id> --reason "..." [--superseded-by <id>]
  node scripts/constitutional-framework.mjs challenge --id <id> --question "..." [--evidence "..."]
  node scripts/constitutional-framework.mjs review --id <id>
  node scripts/constitutional-framework.mjs render
  node scripts/constitutional-framework.mjs research-add --title "..." [--state idea] [--triage active] [--evidence 0] [--priority 50]
  node scripts/constitutional-framework.mjs research-list
`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title') out.title = argv[++i];
    else if (a === '--level') out.level = argv[++i];
    else if (a === '--purpose') out.purpose = argv[++i];
    else if (a === '--source-file') out.sourceFile = argv[++i];
    else if (a === '--source-anchor') out.sourceAnchor = argv[++i];
    else if (a === '--confidence') out.confidence = Number(argv[++i]);
    else if (a === '--commitment') out.commitment = Number(argv[++i]);
    else if (a === '--evidence') out.evidence = argv[++i];
    else if (a === '--evidence-level') out.evidenceLevel = argv[++i];
    else if (a === '--enforcement-status') out.enforcementStatus = argv[++i];
    else if (a === '--enforcement-method') out.enforcementMethod = argv[++i];
    else if (a === '--id') out.id = argv[++i];
    else if (a === '--reason') out.reason = argv[++i];
    else if (a === '--superseded-by') out.supersededBy = argv[++i];
    else if (a === '--question') out.question = argv[++i];
    else if (a === '--state') out.state = argv[++i];
    else if (a === '--triage') out.triage = argv[++i];
    else if (a === '--priority') out.priority = Number(argv[++i]);
    else if (!out._command && !a.startsWith('-')) out._command = a;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const command = args._command;

switch (command) {
  case 'seed':
    cmdSeed();
    break;
  case 'verify':
    cmdVerify();
    break;
  case 'add':
    cmdAdd(args);
    break;
  case 'promote':
    cmdPromote(args);
    break;
  case 'demote':
    cmdDemote(args);
    break;
  case 'challenge':
    cmdChallenge(args);
    break;
  case 'review':
    cmdReview(args);
    break;
  case 'render':
    cmdRender();
    break;
  case 'research-add':
    cmdResearchAdd(args);
    break;
  case 'research-list':
    cmdResearchList();
    break;
  default:
    showHelp();
    process.exit(command ? 1 : 0);
}
