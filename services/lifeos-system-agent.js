/**
 * SYNOPSIS: LifeOS System Agent — repo-aware answers from actual filesystem + git, not canned BP text.
 * LifeOS System Agent — repo-aware answers from actual filesystem + git, not canned BP text.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadBpPriority, BP_PRIORITY_REL } from './bp-priority-queue.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.cache']);
const SEARCH_EXT = new Set(['.md', '.json', '.js', '.html', '.txt', '.sql']);

export function checkRepoAccess({ root = REPO_ROOT } = {}) {
  try {
    fs.accessSync(root, fs.constants.R_OK);
  } catch (err) {
    return {
      ok: false,
      status: 'BLOCKED',
      blocker: 'repo_root_not_readable',
      detail: err.message,
      repo_root: root,
    };
  }
  const bpPath = path.join(root, BP_PRIORITY_REL);
  if (!fs.existsSync(bpPath)) {
    return {
      ok: false,
      status: 'BLOCKED',
      blocker: 'bp_priority_missing',
      detail: `${BP_PRIORITY_REL} not found under ${root}`,
      repo_root: root,
    };
  }
  return { ok: true, repo_root: root };
}

export function readRepoFile(relPath, { root = REPO_ROOT, maxChars = 12000 } = {}) {
  const normalized = String(relPath || '').replace(/^\/+/, '');
  const full = path.join(root, normalized);
  if (!fs.existsSync(full)) {
    return { ok: false, error: 'file_not_found', path: normalized };
  }
  const stat = fs.statSync(full);
  const text = fs.readFileSync(full, 'utf8');
  return {
    ok: true,
    path: normalized,
    size_bytes: stat.size,
    mtime: stat.mtime.toISOString(),
    content: text.length > maxChars ? `${text.slice(0, maxChars)}\n…[truncated]` : text,
    source: 'filesystem',
  };
}

async function readFromGitHub(relPath, { maxChars = 12000 } = {}) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo) {
    return {
      ok: false,
      error: 'github_fallback_unavailable',
      path: relPath,
      missing: !token ? 'GITHUB_TOKEN' : 'GITHUB_REPO',
    };
  }
  const url = `https://api.github.com/repos/${repo}/contents/${relPath.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    return { ok: false, error: `github_http_${res.status}`, path: relPath };
  }
  const data = await res.json();
  if (data.type !== 'file' || !data.content) {
    return { ok: false, error: 'not_a_file', path: relPath };
  }
  const text = Buffer.from(String(data.content).replace(/\n/g, ''), 'base64').toString('utf8');
  return {
    ok: true,
    path: relPath,
    source: 'github_api',
    sha: data.sha,
    github_url: data.html_url,
    content: text.length > maxChars ? `${text.slice(0, maxChars)}\n…[truncated]` : text,
  };
}

/** Local filesystem first; GitHub Contents API when deploy image omits docs (Railway .dockerignore). */
export async function readRepoFileAsync(relPath, opts = {}) {
  const local = readRepoFile(relPath, opts);
  if (local.ok) return local;
  return readFromGitHub(relPath, opts);
}

async function searchGitHubByTerms(terms, { maxResults = 10 } = {}) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo) return [];
  const q = encodeURIComponent(`${terms.join(' ')} repo:${repo}`);
  const res = await fetch(`https://api.github.com/search/code?q=${q}&per_page=${maxResults}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map((item) => ({
    path: item.path,
    matched_terms: terms,
    snippet: item.name || '',
    source: 'github_code_search',
    github_url: item.html_url,
  }));
}

export async function searchRepoByTerms(terms, { root = REPO_ROOT, maxResults = 25, scanRoots = null } = {}) {
  const needles = (Array.isArray(terms) ? terms : [terms])
    .map((t) => String(t || '').toLowerCase())
    .filter(Boolean);
  if (!needles.length) return [];

  const hits = [];
  const roots = scanRoots?.length
    ? scanRoots.map((r) => path.join(root, r))
    : [root];

  async function walk(dir) {
    if (hits.length >= maxResults) return;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (hits.length >= maxResults) break;
      const full = path.join(dir, ent.name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name) || ent.name.startsWith('_hist')) continue;
        if (rel.includes('/_hist/')) continue;
        await walk(full);
        continue;
      }
      const ext = path.extname(ent.name).toLowerCase();
      if (!SEARCH_EXT.has(ext)) continue;
      let text;
      try {
        const buf = await fsp.readFile(full, 'utf8');
        if (buf.length > 500_000) continue;
        text = buf;
      } catch {
        continue;
      }
      const lower = text.toLowerCase();
      const matched = needles.filter((n) => lower.includes(n));
      if (!matched.length) continue;
      const idx = lower.indexOf(matched[0]);
      const snippetStart = Math.max(0, idx - 80);
      const snippet = text.slice(snippetStart, snippetStart + 220).replace(/\s+/g, ' ').trim();
      hits.push({
        path: rel,
        matched_terms: matched,
        snippet,
        mtime: fs.statSync(full).mtime.toISOString(),
      });
    }
  }

  for (const start of roots) {
    if (fs.existsSync(start)) await walk(start);
  }
  let sorted = hits.sort((a, b) => b.matched_terms.length - a.matched_terms.length);
  if (sorted.length < 3) {
    const ghHits = await searchGitHubByTerms(needles.slice(0, 3), { maxResults: maxResults - sorted.length });
    sorted = [...sorted, ...ghHits].slice(0, maxResults);
  }
  return sorted;
}

export function listBpPriorityRanking({ root = REPO_ROOT } = {}) {
  const data = loadBpPriority({ root });
  return [...data.items]
    .sort((a, b) => (a.rank || 0) - (b.rank || 0))
    .map((item) => ({
      rank: item.rank,
      mission_id: item.mission_id,
      blueprint_path: item.blueprint_path || null,
      blueprint_status: item.blueprint_status || null,
      verdict: item.verdict || item.receipt_verdict || null,
      git_sha: item.git_sha || null,
      production_base: item.production_base || null,
    }));
}

export async function findAllBlueprintPaths({ root = REPO_ROOT } = {}) {
  const paths = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        await walk(full);
      } else if (ent.name === 'BLUEPRINT.json') {
        paths.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  }
  await walk(root);
  return paths.sort();
}

export function compareBpPriorityToBlueprints({ root = REPO_ROOT, discoveredPaths = null } = {}) {
  const ranking = listBpPriorityRanking({ root });
  const listed = new Set(ranking.map((r) => r.blueprint_path).filter(Boolean));
  const discovered = discoveredPaths || [];
  const onDiskNotInPriority = discovered.filter(
    (p) => p.startsWith('builderos-reboot/MISSIONS/') && !listed.has(p),
  );
  const inPriorityMissingOnDisk = [...listed].filter((p) => !fs.existsSync(path.join(root, p)));
  return {
    priority_ranking_count: ranking.length,
    blueprint_files_on_disk: discovered.length,
    product_blueprints_not_in_priority: onDiskNotInPriority,
    priority_entries_missing_blueprint_file: inPriorityMissingOnDisk,
  };
}

function gitFileInfo(relPath, { root = REPO_ROOT } = {}) {
  const info = { path: relPath, mtime: null, last_commit_sha: null, last_commit_at: null };
  try {
    info.mtime = fs.statSync(path.join(root, relPath)).mtime.toISOString();
  } catch {
    return info;
  }
  try {
    const out = execSync(`git log -1 --format=%H|%cI -- "${relPath}"`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [sha, at] = out.split('|');
    if (sha) info.last_commit_sha = sha;
    if (at) info.last_commit_at = at;
  } catch {
    /* no git or no history */
  }
  return info;
}

function gitHeadSha({ root = REPO_ROOT } = {}) {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export async function findOriginalLifeOSBlueprint({ root = REPO_ROOT } = {}) {
  const searchTerms = [
    'original lifeos blueprint',
    'lifeos blueprint',
    'lifeos core',
    'amendment_21',
    'docs/products/lifeos.md',
  ];
  const locationsSearched = [
    'docs/projects/',
    'docs/architecture/',
    'docs/products/',
    'builderos-reboot/MISSIONS/',
    'products/',
  ];

  const knownCandidates = [
    {
      path: 'docs/projects/AMENDMENT_21_LIFEOS_CORE.md',
      why: 'Constitutional LifeOS amendment — Mission, scope, backlog; voice-rail product brief reads this file (docs/products/LIFEOS.md was removed in doc restructure).',
    },
    {
      path: 'docs/products/LIFEOS.md',
      why: 'Historical product SSOT referenced in continuity logs and objective handoffs; may be deleted.',
    },
    {
      path: 'builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/BLUEPRINT.json',
      why: 'Rank-1 product BP in BP_PRIORITY — LifeOS primary interface mission.',
    },
  ];

  const candidateResults = [];
  for (const c of knownCandidates) {
    const read = await readRepoFileAsync(c.path, { root, maxChars: 1500 });
    if (read.ok) {
      candidateResults.push({
        path: c.path,
        why: c.why,
        exists: true,
        read_source: read.source,
        github_url: read.github_url || null,
        ...gitFileInfo(c.path, { root }),
        evidence_snippet: read.content.slice(0, 400),
      });
    } else {
      candidateResults.push({
        path: c.path,
        why: c.why,
        exists: false,
        read_error: read.error,
        github_missing: read.missing || null,
      });
    }
  }

  const searchHits = await searchRepoByTerms(searchTerms, {
    root,
    maxResults: 15,
    scanRoots: locationsSearched,
  });

  let deletedLifeosMd = null;
  try {
    const log = execSync('git log -1 --format=%H|%cI -- docs/products/LIFEOS.md', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [sha, at] = log.split('|');
    deletedLifeosMd = { last_commit_sha: sha, last_commit_at: at, note: 'File absent on disk; git history exists.' };
  } catch {
    deletedLifeosMd = { note: 'No git history for docs/products/LIFEOS.md (or git unavailable).' };
  }

  const primary = candidateResults.find(
    (c) => c.path === 'docs/projects/AMENDMENT_21_LIFEOS_CORE.md' && c.exists,
  );
  if (!primary) {
    const ghToken = process.env.GITHUB_TOKEN?.trim();
    const ghRepo = process.env.GITHUB_REPO?.trim();
    if (!ghToken || !ghRepo) {
      return {
        status: 'BLOCKED',
        question: 'where is the original LifeOS blueprint?',
        blocker: 'lifeos_ssot_not_on_deployed_filesystem',
        detail: `${'docs/projects/AMENDMENT_21_LIFEOS_CORE.md'} excluded from Railway image (.dockerignore docs/*). GitHub fallback needs GITHUB_TOKEN + GITHUB_REPO.`,
        missing: [!ghToken && 'GITHUB_TOKEN', !ghRepo && 'GITHUB_REPO'].filter(Boolean),
        methods_used: ['readRepoFileAsync', 'searchRepoByTerms'],
        search_terms: searchTerms,
        locations_searched: locationsSearched,
        closest_candidates: candidateResults,
        search_hits: searchHits.slice(0, 10),
      };
    }
  }
  if (primary) {
    return {
      status: 'FOUND',
      question: 'where is the original LifeOS blueprint?',
      methods_used: ['readRepoFile', 'readRepoFileAsync', 'searchRepoByTerms', 'searchGitHubByTerms', 'listBpPriorityRanking'],
      file_path: primary.path,
      read_source: primary.read_source || 'filesystem',
      why: primary.why,
      evidence_snippet: primary.evidence_snippet,
      last_modified: primary.mtime,
      last_commit_sha: primary.last_commit_sha,
      last_commit_at: primary.last_commit_at,
      historical_note: deletedLifeosMd,
      search_terms: searchTerms,
      locations_searched: locationsSearched,
      closest_candidates: candidateResults,
      search_hits: searchHits.slice(0, 8),
      repo_head_sha: gitHeadSha({ root }),
    };
  }

  return {
    status: 'NOT_FOUND',
    question: 'where is the original LifeOS blueprint?',
    methods_used: ['readRepoFile', 'searchRepoByTerms', 'git log'],
    search_terms: searchTerms,
    locations_searched: locationsSearched,
    closest_candidates: candidateResults,
    search_hits: searchHits.slice(0, 10),
    historical_note: deletedLifeosMd,
  };
}

export function findNextIncompleteBpStep({ root = REPO_ROOT } = {}) {
  const ranking = listBpPriorityRanking({ root });
  for (const row of ranking) {
    if (!row.blueprint_path) continue;
    const read = readRepoFile(row.blueprint_path, { root, maxChars: 200_000 });
    if (!read.ok) {
      return {
        status: 'FOUND',
        incomplete: true,
        rank: row.rank,
        mission_id: row.mission_id,
        blueprint_path: row.blueprint_path,
        error: 'blueprint_unreadable',
      };
    }
    let bp;
    try {
      bp = JSON.parse(read.content);
    } catch {
      return { status: 'FOUND', incomplete: true, blueprint_path: row.blueprint_path, error: 'blueprint_invalid_json' };
    }
    const pending = (bp.steps || []).find((s) => String(s.status || '').toLowerCase() !== 'complete');
    if (pending) {
      return {
        status: 'FOUND',
        incomplete: true,
        rank: row.rank,
        mission_id: row.mission_id,
        blueprint_path: row.blueprint_path,
        step: {
          step_id: pending.step_id,
          title: pending.title,
          status: pending.status,
          target_file: pending.target_file || null,
          action_type: pending.action_type || null,
          command: pending.command || null,
        },
        evidence_snippet: JSON.stringify(pending, null, 2).slice(0, 500),
      };
    }
  }
  return {
    status: 'FOUND',
    incomplete: false,
    message: 'Every BLUEPRINT.json step under BP_PRIORITY ranking is complete.',
    priority_ranking: ranking.map((r) => ({ rank: r.rank, mission_id: r.mission_id, blueprint_path: r.blueprint_path })),
  };
}

async function fetchDeployCommitSha(baseUrl, commandKey) {
  if (!baseUrl || !commandKey) return null;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/lifeos/builder/ready`, {
      headers: { 'x-command-key': commandKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.codegen?.deploy_commit_sha || data?.builder?.deploy_commit_sha || null;
  } catch {
    return null;
  }
}

export async function answerDeployVsCommit({ topic, root = REPO_ROOT, baseUrl, commandKey } = {}) {
  const head = gitHeadSha({ root });
  const deploySha = await fetchDeployCommitSha(baseUrl, commandKey);
  const ranking = listBpPriorityRanking({ root });
  return {
    status: 'FOUND',
    repo_head_sha: head,
    deploy_commit_sha: deploySha,
    deployed_matches_head: Boolean(head && deploySha && head.startsWith(deploySha.slice(0, 12))),
    deploy_sha_source: deploySha ? 'GET /api/v1/lifeos/builder/ready' : 'unavailable (no baseUrl/key or endpoint failed)',
    bp_priority_git_shas: ranking.map((r) => ({
      rank: r.rank,
      mission_id: r.mission_id,
      git_sha: r.git_sha,
      production_base: r.production_base,
    })),
    interpretation: deploySha
      ? (head && deploySha.startsWith(head.slice(0, 7)) || head?.startsWith(deploySha.slice(0, 7))
        ? 'Deploy SHA aligns with repo HEAD — likely deployed.'
        : 'Deploy SHA differs from local repo HEAD — may be committed but not yet deployed, or local is ahead/behind.')
      : 'Cannot compare deploy vs commit without live deploy SHA.',
    topic,
  };
}

export async function answerFeatureProof({ topic, root = REPO_ROOT } = {}) {
  const terms = String(topic || '')
    .replace(/what files prove|this feature|exists\??/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);
  const hits = await searchRepoByTerms(terms.length ? terms : ['receipt', 'acceptance'], {
    root,
    maxResults: 20,
    scanRoots: ['services/', 'routes/', 'products/receipts/', 'scripts/', 'public/overlay/'],
  });
  return {
    status: hits.length ? 'FOUND' : 'NOT_FOUND',
    search_terms: terms,
    files: hits,
  };
}

export async function answerWhichBpDefines({ topic, root = REPO_ROOT } = {}) {
  const terms = String(topic || '')
    .replace(/which bp defines|which blueprint defines|this work/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const blueprints = await findAllBlueprintPaths({ root });
  const productBps = blueprints.filter((p) => p.includes('/MISSIONS/PRODUCT-'));
  const matches = [];
  for (const bpPath of productBps) {
    const read = readRepoFile(bpPath, { root, maxChars: 8000 });
    if (!read.ok) continue;
    const lower = read.content.toLowerCase();
    const matched = terms.filter((t) => lower.includes(t.toLowerCase()));
    if (matched.length) {
      matches.push({ blueprint_path: bpPath, matched_terms: matched, snippet: read.content.slice(0, 300) });
    }
  }
  const ranking = listBpPriorityRanking({ root });
  return {
    status: matches.length ? 'FOUND' : 'NOT_FOUND',
    search_terms: terms,
    matches,
    priority_ranking: ranking,
  };
}

export function detectSystemAgentQuestion(utterance) {
  const q = String(utterance || '').trim();
  if (!q) return null;
  if (/where is the original lifeos blueprint/i.test(q)) return { kind: 'lifeos_blueprint_origin' };
  if (/next incomplete.*bp step|incomplete.*blueprint step|next incomplete.*step/i.test(q)) {
    return { kind: 'next_incomplete_bp_step' };
  }
  if (/which bp defines|which blueprint defines/i.test(q)) return { kind: 'which_bp_defines', topic: q };
  if (/what files prove|files prove this feature/i.test(q)) return { kind: 'feature_proof', topic: q };
  if (/deployed.*only committed|was this deployed|committed but not deployed|deployed or only committed/i.test(q)) {
    return { kind: 'deploy_vs_commit', topic: q };
  }
  return null;
}

export async function answerSystemAgentQuestion(utterance, opts = {}) {
  const access = checkRepoAccess(opts);
  if (!access.ok) {
    return {
      status: 'BLOCKED',
      blocker: access.blocker,
      detail: access.detail,
      repo_root: access.repo_root,
      methods_used: ['checkRepoAccess'],
    };
  }

  const detected = detectSystemAgentQuestion(utterance);
  if (!detected) return null;

  const root = access.repo_root;
  switch (detected.kind) {
    case 'lifeos_blueprint_origin':
      return await findOriginalLifeOSBlueprint({ root });
    case 'next_incomplete_bp_step':
      return findNextIncompleteBpStep({ root });
    case 'which_bp_defines':
      return await answerWhichBpDefines({ topic: detected.topic, root });
    case 'feature_proof':
      return await answerFeatureProof({ topic: detected.topic, root });
    case 'deploy_vs_commit':
      return await answerDeployVsCommit({
        topic: detected.topic,
        root,
        baseUrl: opts.baseUrl,
        commandKey: opts.commandKey,
      });
    default:
      return null;
  }
}

export function formatSystemAgentReply(result) {
  if (!result) return 'lifeos_system_agent: no result';
  const lines = ['LIFEOS SYSTEM AGENT', `status: ${result.status}`];

  if (result.status === 'BLOCKED') {
    lines.push(`blocker: ${result.blocker}`);
    lines.push(`detail: ${result.detail || '—'}`);
    lines.push(`repo_root: ${result.repo_root || '—'}`);
    return lines.join('\n');
  }

  if (result.question) lines.push(`question: ${result.question}`);
  if (result.methods_used?.length) lines.push(`methods: ${result.methods_used.join(', ')}`);

  if (result.file_path) {
    lines.push('');
    lines.push('FOUND');
    lines.push(`file_path: ${result.file_path}`);
    if (result.read_source) lines.push(`read_source: ${result.read_source}`);
    lines.push(`why: ${result.why || '—'}`);
    if (result.last_modified) lines.push(`last_modified: ${result.last_modified}`);
    if (result.last_commit_sha) lines.push(`last_commit_sha: ${result.last_commit_sha}`);
    if (result.last_commit_at) lines.push(`last_commit_at: ${result.last_commit_at}`);
    if (result.evidence_snippet) {
      lines.push('');
      lines.push('evidence_snippet:');
      lines.push(result.evidence_snippet);
    }
    if (result.historical_note) {
      lines.push('');
      lines.push(`historical (docs/products/LIFEOS.md): ${JSON.stringify(result.historical_note)}`);
    }
  }

  if (result.incomplete === true && result.step) {
    lines.push('');
    lines.push(`next_incomplete_step: rank ${result.rank} ${result.mission_id}`);
    lines.push(`blueprint_path: ${result.blueprint_path}`);
    lines.push(`step_id: ${result.step.step_id}`);
    lines.push(`title: ${result.step.title}`);
    if (result.step.target_file) lines.push(`target_file: ${result.step.target_file}`);
    if (result.evidence_snippet) {
      lines.push('');
      lines.push('evidence_snippet:');
      lines.push(result.evidence_snippet);
    }
  }

  if (result.incomplete === false) {
    lines.push('');
    lines.push(result.message || 'No incomplete blueprint steps.');
  }

  if (result.deploy_commit_sha !== undefined) {
    lines.push('');
    lines.push(`repo_head_sha: ${result.repo_head_sha || '—'}`);
    lines.push(`deploy_commit_sha: ${result.deploy_commit_sha || '—'}`);
    lines.push(`interpretation: ${result.interpretation || '—'}`);
  }

  if (result.files?.length) {
    lines.push('');
    lines.push('proof_files:');
    for (const f of result.files.slice(0, 10)) {
      lines.push(`  - ${f.path} [${f.matched_terms?.join(', ')}]`);
      if (f.snippet) lines.push(`    ${f.snippet.slice(0, 120)}`);
    }
  }

  if (result.matches?.length) {
    lines.push('');
    lines.push('matching_blueprints:');
    for (const m of result.matches) {
      lines.push(`  - ${m.blueprint_path}`);
    }
  }

  if (result.status === 'NOT_FOUND') {
    lines.push('');
    lines.push('NOT FOUND');
    if (result.search_terms) lines.push(`search_terms: ${result.search_terms.join(', ')}`);
    if (result.locations_searched) lines.push(`locations_searched: ${result.locations_searched.join(', ')}`);
    if (result.closest_candidates?.length) {
      lines.push('closest_candidates:');
      for (const c of result.closest_candidates) {
        lines.push(`  - ${c.path} (exists=${c.exists}) ${c.why || ''}`);
      }
    }
  }

  lines.push('');
  lines.push('raw:');
  lines.push(JSON.stringify(result, null, 2));
  return lines.join('\n');
}
