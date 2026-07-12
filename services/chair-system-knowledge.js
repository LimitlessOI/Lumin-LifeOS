/**
 * SYNOPSIS: Chair system knowledge — SSOT, repo synopsis, program context for Lumin counsel.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadKnowledgeContext, getKnowledgeContext } from './knowledge-context.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = path.join(ROOT, 'builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json');
const AMENDMENTS_DIR = path.join(ROOT, 'docs/projects');

const SMOS_CANONICAL = {
  program: 'Social Media OS (MarketingOS)',
  authority: 'docs/products/marketingos/PRODUCT_HOME.md',
  // Phase 1 LIVE: /api/v1/marketing/* (legacy /api/v1/socialmediaos/* not mounted)
  workflow_order: ['consent', 'session', 'coach', 'extract', 'generate', 'approve', 'export'],
  brief_gate: 'Consent + coaching session required before extract/generate (authenticity principle)',
  founder_chat_executor: 'chair-direct-agent + /api/v1/marketing/* session pipeline',
  api_prefix: '/api/v1/marketing/',
  overlay: 'public/overlay/lifeos-app.html',
};

const PROGRAM_REGISTRY = [
  {
    id: 'smos',
    match: /\b(smos|social media os|socialmediaos|content brief|relocation content|marketing os)\b/i,
    amendment: 'docs/products/marketingos/PRODUCT_HOME.md',
    services: [
      'routes/marketing-session-routes.js',
      'services/chair-program-direct-answer.js',
      'services/chair-direct-agent.js',
    ],
    canonical: SMOS_CANONICAL,
  },
  {
    id: 'builderos',
    match: /\b(builderos|builder os|builder pipeline|council builder|system-build|gap-fill)\b/i,
    amendment: 'docs/products/builderos/PRODUCT_HOME.md',
    services: [
      'routes/lifeos-council-builder-routes.js',
      'services/builderos-command-control-service.js',
    ],
  },
  {
    id: 'lumin_chair',
    // Do NOT match bare "Lumin" / "Chair" — those are how users address the
    // product in ordinary chat. Match only when they ask about the interface/
    // system itself.
    match: /\b(founder interface|command[-\s]?control|lumin chair orchestrator|how (?:does|do) (?:lumin|the chair)\b|what (?:is|does) (?:lumin|the chair)\b)\b/i,
    amendment: 'docs/products/lifeos/PRODUCT_HOME.md',
    services: [
      'services/lumin-chair-orchestrator.js',
      'services/chair-lumin-unified.js',
      'routes/lifeos-builderos-command-control-routes.js',
    ],
  },
  {
    id: 'lifere',
    match: /\b(lifere|life-?re alpha|real estate os)\b/i,
    amendment: 'docs/products/lifere/PRODUCT_HOME.md',
    services: ['services/lifere-alpha-readiness-surface.js', 'public/overlay/lifeos-lifere.html'],
  },
  {
    id: 'ssot',
    match: /\b(ssot|north star|amendment|companion|continuity)\b/i,
    amendment: 'docs/constitution/NORTH_STAR_SSOT.md',
    services: ['docs/SSOT_COMPANION.md', 'scripts/ssot-check.js'],
  },
];

let indexCache = null;
let indexCacheAt = 0;
const INDEX_TTL_MS = 10 * 60 * 1000;

function tokenize(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function loadSynopsisIndex() {
  const now = Date.now();
  if (indexCache && (now - indexCacheAt) < INDEX_TTL_MS) return indexCache;
  try {
    const raw = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    indexCache = raw.files || [];
    indexCacheAt = now;
    return indexCache;
  } catch {
    return indexCache || [];
  }
}

function scoreFileEntry(entry, tokens) {
  const hay = `${entry.path} ${entry.synopsis || ''}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += t.length > 5 ? 3 : 1;
  }
  if (/docs\/projects\/AMENDMENT_/.test(entry.path)) score += 2;
  if (/services\/lifere-socialmediaos/.test(entry.path)) score += 4;
  return score;
}

export function searchRepoSynopsis(query = '', { limit = 10 } = {}) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const files = loadSynopsisIndex();
  return files
    .map((entry) => ({ ...entry, score: scoreFileEntry(entry, tokens) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function readExcerpt(relPath, maxChars = 2800) {
  const fp = path.join(ROOT, relPath);
  if (!fs.existsSync(fp)) return null;
  try {
    const content = fs.readFileSync(fp, 'utf8');
    return content.slice(0, maxChars);
  } catch {
    return null;
  }
}

function extractAmendmentSnippets(content = '', query = '', maxSnippets = 4) {
  const tokens = tokenize(query);
  const lines = String(content).split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (tokens.some((t) => lower.includes(t)) || /\b(workflow|process|brief|coach|publish|build)\b/i.test(line)) {
      const chunk = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 4)).join('\n').trim();
      if (chunk.length > 24) hits.push(chunk);
    }
    if (hits.length >= maxSnippets) break;
  }
  return hits;
}

function formatProgramBlock(program) {
  const lines = [`Program: ${program.id}`];
  if (program.canonical) {
    const c = program.canonical;
    lines.push(`Authority: ${c.authority || program.amendment}`);
    if (c.workflow_order) lines.push(`Workflow: ${c.workflow_order.join(' → ')}`);
    if (c.brief_gate) lines.push(`Gate: ${c.brief_gate}`);
    if (c.founder_chat_executor) lines.push(`Founder chat: ${c.founder_chat_executor}`);
    if (c.api_prefix) lines.push(`API: ${c.api_prefix}`);
  }
  if (program.amendment) lines.push(`SSOT: ${program.amendment}`);
  if (program.services?.length) lines.push(`Code: ${program.services.join(', ')}`);
  return lines.join('\n');
}

export async function gatherChairSystemKnowledge(query = '') {
  const text = String(query || '').trim();
  const result = {
    programs: [],
    repo_matches: [],
    ssot_excerpts: [],
    static_kernel: null,
    builder: {
      lumin_is_chair: true,
      founder_message_api: '/api/v1/lifeos/builderos/command-control/founder-interface/message',
      builder_build_api: 'POST /api/v1/lifeos/builder/build',
      build_async: 'Founder UI/code orders → build_async job → council commit via BuilderOS',
      work_executors: 'SMOS content, system actions — routed before counsel when intent is clear',
    },
    formatted: '',
  };

  if (!getKnowledgeContext()) {
    await loadKnowledgeContext().catch(() => null);
  }
  const kc = getKnowledgeContext();
  if (kc?.staticKernel) result.static_kernel = kc.staticKernel;

  for (const program of PROGRAM_REGISTRY) {
    if (program.match.test(text)) {
      result.programs.push({
        id: program.id,
        amendment: program.amendment,
        services: program.services,
        canonical: program.canonical || null,
      });
      const excerpt = readExcerpt(program.amendment, 12000);
      if (excerpt) {
        const snippets = extractAmendmentSnippets(excerpt, text);
        if (snippets.length) {
          result.ssot_excerpts.push({ path: program.amendment, snippets });
        } else {
          result.ssot_excerpts.push({ path: program.amendment, snippets: [excerpt.slice(0, 1200)] });
        }
      }
      for (const svc of program.services || []) {
        const syn = loadSynopsisIndex().find((f) => f.path === svc);
        if (syn) result.repo_matches.push(syn);
      }
    }
  }

  const synopsisHits = searchRepoSynopsis(text, { limit: 8 });
  for (const hit of synopsisHits) {
    if (!result.repo_matches.some((r) => r.path === hit.path)) {
      result.repo_matches.push({ path: hit.path, synopsis: hit.synopsis, score: hit.score });
    }
  }

  const parts = [];
  parts.push('Lumin IS the Chair — connected to LifeOS files, SSOT amendments, BuilderOS, and founder thread.');
  parts.push(`Build path: ${result.builder.build_async}`);
  if (result.static_kernel) parts.push(result.static_kernel);
  for (const p of result.programs) {
    const reg = PROGRAM_REGISTRY.find((r) => r.id === p.id);
    if (reg) parts.push(formatProgramBlock(reg));
  }
  for (const ex of result.ssot_excerpts) {
    parts.push(`── ${ex.path} ──`);
    for (const sn of ex.snippets.slice(0, 3)) {
      parts.push(sn.slice(0, 900));
    }
  }
  if (result.repo_matches.length) {
    parts.push('── Repo files (synopsis index) ──');
    for (const m of result.repo_matches.slice(0, 8)) {
      parts.push(`• ${m.path}: ${(m.synopsis || '').slice(0, 160)}`);
    }
  }

  result.formatted = parts.filter(Boolean).join('\n\n').slice(0, 12000);
  return result;
}

export function needsSystemKnowledge(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/^\s*(do|execute|run)\s*:/i.test(t)) return true;
  return PROGRAM_REGISTRY.some((p) => p.match.test(t))
    || /\b(how does|what is our|explain our|workflow|process|ssot|amendment|where is|what file)\b/i.test(t);
}
