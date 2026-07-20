/**
 * SYNOPSIS: routes/lifeos-council-builder-routes.js
 * routes/lifeos-council-builder-routes.js
 *
 * Council Builder Dispatch Endpoint
 *
 * This is the "coworker" bridge. Claude Code (Cursor) sends a structured task
 * here. The council reads the domain prompt file for context, then generates
 * code, plans, or analysis. Output is returned to Claude Code for review —
 * nothing is auto-committed.
 *
 * Routes:
 *   GET  /api/v1/lifeos/builder/ready           server-side readiness (commit + council + pool + auth); **`Cache-Control: no-store`**; **`codegen`** (policy_revision, max_output_tokens body flag, optional deploy_commit_sha); **`builder.codegen_policy_revision`** mirrors policy for nested-only parsers
 *   GET  /api/v1/lifeos/builder/domains         list available domain prompt files
 *   GET  /api/v1/lifeos/builder/domain/:name    read a specific domain prompt file
 *   GET  /api/v1/lifeos/builder/next-task      cold-start packet excerpts + read order
 *   POST /api/v1/lifeos/builder/task            dispatch a task to the council (body `files[]` = repo-relative paths → server reads and injects file contents** into prompt; optional `target_file` improves HTML full-file hints; code mode passes scaled `maxOutputTokens` to the council; optional **`max_output_tokens`** or **`maxOutputTokens`** clamps completion budget on code mode — same auth as `/build`; use sparingly when estimator lags deploy**)
 *   POST /api/v1/lifeos/builder/review          ask the council to review code/diff
 *   GET  /api/v1/lifeos/builder/model-map       show task-to-model routing table
 *   GET  /api/v1/lifeos/builder/history         recent builder audit trail
 *   GET  /api/v1/lifeos/builder/gaps            recent builder failures / next platform fixes
 *
 * Task body autonomy controls (optional):
 *   autonomy_mode: 'max' | 'normal' (default: 'max')
 *   internet_research: boolean (default: true)
 *   execution_only: boolean (default: false) — when true with mode=code and no explicit `model`, routes to
 *     `council.builder.code_execute` (fast literal codegen). Use only after a frozen spec (see prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md).
 *
 * @authority Legacy production spine — see routes/AGENTS.md. Not canonical factory runtime (factory-staging/).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 *
 * Mounted on the parent express app via createLifeOsCouncilBuilderRoutes(app, …).
 */

import { readdir, readFile, writeFile, unlink, mkdtemp, mkdir } from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { getModelForTask, getCandidateModelsForTask, TASK_MODEL_MAP } from '../config/task-model-routing.js';
import { createMemoryIntelligenceService } from '../services/memory-intelligence-service.js';
import { filterAvailableCouncilMembers } from '../services/council-model-availability.js';
import { BUILDER_MODE, BUILDER_MODE_RULES, DEFAULT_BUILDER_MODE } from '../config/builder-release-modes.js';
import { isSafeTarget } from '../config/builder-safe-scope.js';
import { writeSecurityReceipt, SECURITY_RECEIPT_TYPES } from '../services/oil-security-receipts.js';
import { runPrecommitGovernance } from '../services/builderos-precommit-governance.js';
import { normalizeBuilderCodegenOutput } from '../services/builderos-codegen-normalize.js';
import { classifyBuildTarget, classifyPatchIntent } from '../services/builderos-patch-mode-policy.js';
import { applyBuilderRoutingPolicy } from '../services/builderos-routing-policy.js';
import { looksLikeBuilderProseRefusal } from '../services/builder-instruction-target.js';
import { checkBuildBlueprintGate } from '../services/builder-blueprint-gate.js';
import { createBuilderOSControlPlaneService } from '../services/builderos-control-plane-service.js';
import { evaluateBuildDoneGateAsync } from '../services/builderos-build-done-gate-helper.js';
import { detectGeneratedLayerViolation } from '../services/lifeos-execution-truth.js';
import {
  grantBuildCompletion,
  isCompletionAuthorityEnabled,
  BUILDEROS_COMPLETION_AUTHORITY_FLAG,
} from '../services/builderos-completion-authority.js';
import {
  evaluateModelEscalationGate,
  writeModelEscalationReceipt,
  isCheaperModel,
} from '../services/builderos-model-escalation-gate.js';
import { logShadowRoutingDecision } from '../services/builderos-tsos-routing.js';
import {
  seedBuilderDeliberation,
  finalizeBuilderDeliberation,
} from '../services/builder-deliberation-hook.js';
import {
  enforceBeforeBuilderDispatch,
  formatUnifiedGateBlockSummary,
} from '../services/founder-packet-v2-unified-gate.js';
import { classifyBuilderGap, summarizeGapFamilies } from '../services/builderos-gap-classifier.js';
import { verifyIntakeSessionBuildClearance } from '../services/intake-blueprint-executor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');
const REPO_ROOT = join(__dirname, '..');

/**
 * Zone 3 additive-patch splice: merge an additive code snippet into an existing
 * large file without rewriting it. The existing content is preserved verbatim
 * (byte-for-byte), so there is zero stub/truncation risk to what is already
 * there. The snippet is inserted just before the file's last top-level
 * `export default` / `module.exports` (so new route defs still register), else
 * appended at EOF. New imports the model marked with `//__IMPORT__ ` are hoisted
 * after the last existing import. Returns a clean merged file or a reason.
 */
function spliceAdditiveSnippet(absTargetPath, rawSnippet) {
  let snippet = String(rawSnippet || '').trim();
  if (!snippet) return { ok: false, reason: 'empty additive snippet' };
  const hoistImports = [];
  snippet = snippet
    .split('\n')
    .filter((line) => {
      if (line.trimStart().startsWith('//__IMPORT__ ')) {
        hoistImports.push(line.trimStart().replace('//__IMPORT__ ', '').trim());
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();
  if (!snippet) return { ok: false, reason: 'additive snippet contained only import markers' };
  let existing;
  try {
    existing = readFileSync(absTargetPath, 'utf8');
  } catch (err) {
    return { ok: false, reason: `could not read target file: ${err.message}` };
  }
  // Fail-closed guards: if the model ignored the additive instruction and
  // returned (most of) the existing file, splicing would duplicate it. `node
  // --check` catches most duplicate declarations, but a file of only-redeclarable
  // `function`s could still parse, so reject here before any splice.
  const existingImportLines = new Set(
    existing.split('\n').map((l) => l.trim()).filter((l) => /^import\b/.test(l)),
  );
  if (snippet.split('\n').some((l) => existingImportLines.has(l.trim()))) {
    return { ok: false, reason: 'snippet re-emits an existing import line — model returned the full file instead of an additive-only snippet' };
  }
  if (snippet.length >= existing.length * 0.6) {
    return { ok: false, reason: `additive snippet (${snippet.length}b) is too large vs existing file (${existing.length}b) — looks like a full-file rewrite, not an additive patch` };
  }
  const lines = existing.split('\n');
  let insertIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/^\s*(export\s+default\b|module\.exports\b)/.test(lines[i])) {
      insertIdx = i;
      break;
    }
  }
  const head = lines.slice(0, insertIdx).join('\n').replace(/\s+$/, '');
  const tail = lines.slice(insertIdx).join('\n');
  let merged = tail.trim().length ? `${head}\n\n${snippet}\n\n${tail}` : `${head}\n\n${snippet}\n`;
  const dedupImports = hoistImports.filter((imp) => imp && !merged.includes(imp));
  if (dedupImports.length) {
    const mLines = merged.split('\n');
    let lastImport = -1;
    for (let i = 0; i < mLines.length; i += 1) {
      if (/^\simport\b/.test(mLines[i])) lastImport = i;
    }
    mLines.splice(lastImport >= 0 ? lastImport + 1 : 0, 0, ...dedupImports);
    merged = mLines.join('\n');
  }
  merged = `${merged.replace(/\s+$/, '')}\n`;
  return { ok: true, content: merged, mergedLines: merged.split('\n').length };
}

/**
 * Parse an edit-patch model response into a normalized [{old_string,new_string}]
 * array. The model is asked to emit ONLY a JSON array; be tolerant of a stray
 * markdown fence, a leading prose line, or a trailing ---METADATA--- block.
 */
export function parseTargetedEditsJson(raw) {
  let s = String(raw || '').trim();
  const sepIdx = s.indexOf('---METADATA---');
  if (sepIdx !== -1) s = s.slice(0, sepIdx).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s$/, '').trim();
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    return { ok: false, reason: 'no JSON edit array found in model output' };
  }
  let parsed;
  try {
    parsed = JSON.parse(s.slice(start, end + 1));
  } catch (err) {
    return { ok: false, reason: `edit JSON parse failed (likely truncated): ${err.message}` };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, reason: 'edit output is not a non-empty JSON array' };
  }
  const edits = [];
  for (const e of parsed) {
    if (!e || typeof e !== 'object' || typeof e.old_string !== 'string' || typeof e.new_string !== 'string') {
      return { ok: false, reason: 'each edit must be an object with string old_string and new_string' };
    }
    edits.push({ old_string: e.old_string, new_string: e.new_string });
  }
  return { ok: true, edits };
}

/**
 * Zone 3 edit-patch: apply surgical find-and-replace edits to an existing large
 * file so in-file logic can be MODIFIED (not just added to) without a full-file
 * rewrite. Fail-closed: every old_string must be non-empty and match EXACTLY
 * ONCE (a missing or ambiguous anchor is rejected rather than guessed), so the
 * rest of the file is preserved byte-for-byte. Returns the edited content or a
 * reason. The caller still runs the normal syntax/completeness gate on the
 * result, so a broken edit can never commit.
 */
export function applyTargetedEdits(absTargetPath, rawOutput) {
  const parsed = parseTargetedEditsJson(rawOutput);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  let content;
  try {
    content = readFileSync(absTargetPath, 'utf8');
  } catch (err) {
    return { ok: false, reason: `could not read target file: ${err.message}` };
  }
  let applied = 0;
  for (const { old_string, new_string } of parsed.edits) {
    if (!old_string) {
      return { ok: false, reason: 'edit has an empty old_string — cannot anchor (use additive mode to add brand-new code)' };
    }
    if (old_string === new_string) continue;
    const first = content.indexOf(old_string);
    if (first === -1) {
      return { ok: false, reason: `edit old_string not found in file — the model must copy it verbatim: ${JSON.stringify(old_string.slice(0, 80))}` };
    }
    if (content.indexOf(old_string, first + old_string.length) !== -1) {
      return { ok: false, reason: `edit old_string is ambiguous (matches more than once) — add surrounding context to make it unique: ${JSON.stringify(old_string.slice(0, 80))}` };
    }
    content = content.slice(0, first) + new_string + content.slice(first + old_string.length);
    applied += 1;
  }
  if (applied === 0) return { ok: false, reason: 'no edits applied (all edits were no-ops)' };
  if (!content.endsWith('\n')) content += '\n';
  return { ok: true, content, editsApplied: applied };
}

/** Bumped when builder codegen/token policy semantics change; operators compare GET /builder/ready to git main. */
const BUILDER_CODEGEN_POLICY_REVISION = '2026-05-01a';
const BUILDER_ROUTE_DEFAULT_MODEL = 'openai_builder_mini';
const BUILDER_ROUTE_STANDARD_MODEL = 'openai_builder_standard';
const IS_RAILWAY_RUNTIME = Boolean(
  process.env.RAILWAY_ENVIRONMENT
  || process.env.RAILWAY_SERVICE_ID
  || process.env.RAILWAY_PROJECT_ID
  || process.env.RAILWAY_ENVIRONMENT_ID
);

const METADATA_SEP = '\n---METADATA---\n';
const REMOTE_SYSTEM_TRUTH = 'System truth is remote: GitHub=source, Railway=runtime, Neon=data. Local shell/repo are workbench mirrors only.';

/** Max chars injected per file / total into council prompt (large overlays like lifeos-chat.html). */
const BUILDER_FILE_INJECT_MAX_PER = 120_000;
const BUILDER_FILE_INJECT_MAX_TOTAL = 280_000;

/** Grounding rules — paired with `prompts/00-SSOT-READ-SEQUENCE.md`. */
const BUILDER_EPISTEMIC_LAWS = [
  'EPISTEMIC LAWS (this call):',
  '- Ground outputs in DOMAIN CONTEXT, SPECIFICATION, and injected REPO FILE CONTENTS only; do not invent features, routes, env vars, or DB tables not supported there.',
  '- If the spec is incomplete or contradictory, state that in one line before ---METADATA--- and set a low confidence value in the JSON.',
  '- When both apply, injected file bodies override vague task wording.',
  '- If REPO FILE CONTENTS include a nonempty body for path P, NEVER claim that P is missing from the repository or return ENOENT for P.',
].join('\n');

/**
 * Resolve `files` body paths to repo files and read contents for the council prompt.
 * Previously only path names were listed — models could not see `lifeos-chat.html` etc.
 * @param {unknown} files
 * @param {{ warn: Function }} log
 * @returns {Promise<{ block: string, summaries: Array<{ path: string, chars?: number, truncated?: boolean, omitted?: boolean, error?: string }> }>}
 */
async function loadRepoFilesForBuilder(files, log) {
  if (!Array.isArray(files) || files.length === 0) {
    return { block: '', summaries: [] };
  }
  const summaries = [];
  const parts = [];
  let total = 0;

  for (const raw of files) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const rel = raw.trim().replace(/^[/\\]+/, '');
    if (rel.includes('..') || !/^[\w./\\-]+$/.test(rel)) {
      summaries.push({ path: String(raw), error: 'invalid_path' });
      continue;
    }
    const abs = resolve(REPO_ROOT, rel);
    const relToRoot = relative(REPO_ROOT, abs);
    if (relToRoot.startsWith('..') || relToRoot === '') {
      summaries.push({ path: rel, error: 'outside_repo' });
      continue;
    }
    try {
      const content = await readFile(abs, 'utf8');
      const truncated = content.length > BUILDER_FILE_INJECT_MAX_PER;
      const slice = truncated ? content.slice(0, BUILDER_FILE_INJECT_MAX_PER) : content;
      if (total + slice.length > BUILDER_FILE_INJECT_MAX_TOTAL) {
        parts.push(`\n--- REPO FILE OMITTED: ${rel} (builder prompt size cap; raise BUILDER_FILE_INJECT_MAX_TOTAL if needed) ---\n`);
        summaries.push({ path: rel, chars: content.length, omitted: true });
        break;
      }
      const note = truncated ? ` [TRUNCATED: showing ${BUILDER_FILE_INJECT_MAX_PER} of ${content.length} chars]` : '';
      parts.push(`\n--- REPO FILE: ${rel} (${content.length} chars)${note} ---\n${slice}\n`);
      total += slice.length;
      summaries.push({ path: rel, chars: content.length, truncated });
    } catch (e) {
      const msg = e?.message || String(e);
      parts.push(`\n--- REPO FILE: ${rel} (READ ERROR: ${msg}) ---\n`);
      summaries.push({ path: rel, error: msg });
      log.warn({ path: rel, err: msg }, '[BUILDER] Could not read files[] path');
    }
  }

  return { block: parts.join(''), summaries };
}

/**
 * If the model wrapped the code section in a markdown fence, strip it (keep ---METADATA--- tail intact).
 */
function stripLeadingMarkdownFenceBeforeMetadata(text) {
  const s = String(text || '');
  const metaIdx = s.indexOf(METADATA_SEP);
  const head = metaIdx === -1 ? s : s.slice(0, metaIdx);
  const tail = metaIdx === -1 ? '' : s.slice(metaIdx);
  let h = head.trimStart();
  if (!h.startsWith('```')) return s;
  const firstNl = h.indexOf('\n');
  if (firstNl === -1) return s;
  const closeIdx = h.lastIndexOf('\n```');
  if (closeIdx > firstNl) {
    // Has closing fence — strip both opening and closing
    h = h.slice(firstNl + 1, closeIdx).trim();
  } else {
    // No closing fence (model omitted it) — strip only the opening fence line
    h = h.slice(firstNl + 1).trim();
  }
  return h + tail;
}

/**
 * Builder codegen: estimate output token budget from injected repo files (full-file replacement).
 * @param {string} [targetFile] — When ending in `.html`, uses a higher output cap so large overlays
 *   are not truncated mid-`<head>` (validated as "missing structure" though `<!DOCTYPE` was emitted).
 */
function estimateBuilderMaxOutputTokens(summaries, filesContentBlock, targetFile) {
  let totalChars = 0;
  if (Array.isArray(summaries)) {
    for (const s of summaries) {
      if (typeof s?.chars === 'number' && s.chars > 0) totalChars += s.chars;
    }
  }
  if (totalChars === 0 && filesContentBlock) totalChars = filesContentBlock.length;
  // Return null when no file context injected — let the provider use its own default.
  // Sending a large maxOutputTokens without corresponding input context causes HTTP 413
  // on providers that validate total request token budget (Gemini Flash, Groq).
  if (totalChars === 0) return null;
  // Base heuristic: correlate with injected context size (historically JS/SQL-sized files).
  const linearEstimate = Math.ceil(totalChars / 2.5) + 4096;
  const isHtml = /\.html$/i.test(String(targetFile || ''));
  /** Full `.html` replacement must emit the entire prior document plus edits — chars→tokens≠2.5; use tighter ratio + floor so we do not strand at ~16k when the overlay is tens of kb. */
  const htmlHeuristic =
    Math.ceil(totalChars / 1.85) +
    Math.max(8192, Math.ceil(Math.min(totalChars, 180_000) / 420));
  const estimated = isHtml ? Math.max(linearEstimate, htmlHeuristic) : linearEstimate;
  const htmlCap = Math.min(
    128_000,
    Math.max(4096, parseInt(process.env.BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP || '65536', 10) || 65536),
  );
  const codeCap = Math.min(
    32_768,
    Math.max(4096, parseInt(process.env.BUILDER_CODE_MAX_OUTPUT_TOKENS_CAP || '16384', 10) || 16384),
  );
  const cap = isHtml ? htmlCap : codeCap;
  return Math.min(cap, Math.max(4096, estimated));
}

function builderTargetsHtml(files, targetFile) {
  const paths = Array.isArray(files) ? files : [];
  if (paths.some(p => String(p).toLowerCase().endsWith('.html'))) return true;
  if (String(targetFile || '').toLowerCase().endsWith('.html')) return true;
  return false;
}

function builderTargetsJavaScript(files, targetFile) {
  const paths = Array.isArray(files) ? files : [];
  if (paths.some(p => /\.(js|mjs|cjs)$/i.test(String(p)))) return true;
  if (/\.(js|mjs|cjs)$/i.test(String(targetFile || ''))) return true;
  return false;
}

function parseMissingEvidence({ doneGateReason, doneGateEvidence } = {}) {
  if (Array.isArray(doneGateEvidence?.missing_evidence) && doneGateEvidence.missing_evidence.length) {
    return doneGateEvidence.missing_evidence;
  }
  const reason = String(doneGateReason || doneGateEvidence?.reason || '');
  const marker = 'missing_proof:';
  const idx = reason.indexOf(marker);
  if (idx === -1) return [];
  const raw = reason.slice(idx + marker.length).trim();
  if (!raw) return [];
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
}

export async function evaluateBuildDoneGateForBuildResponse({
  buildResult,
  taskId = null,
  controlPlane = null,
  kernelManaged = false,
}) {
  if (kernelManaged) {
    return {
      ok: true,
      doneGate: {
        ok: false,
        done_gate_required: true,
        done_gate_passed: false,
        reason: 'done_gate_deferred_to_kernel',
        receipt_path: taskId ? `build_task_ledger:${taskId}` : null,
        blocker: null,
      },
      metadata: {
        done_gate_deferred_to_kernel: true,
      },
    };
  }

  let doneGateEvidence = null;
  try {
    if (controlPlane?.canMarkBuildDone && taskId) {
      doneGateEvidence = await controlPlane.canMarkBuildDone({ task_id: taskId, allow_exception: false });
    }
  } catch (error) {
    return {
      ok: false,
      blockedResponse: {
        ok: false,
        blocker: 'BUILDEROS_DONE_BLOCKED',
        reason: `done_gate_evaluation_error:${error.message}`,
        receipt_path: taskId ? `build_task_ledger:${taskId}` : null,
        done_gate_required: true,
        done_gate_passed: false,
      },
    };
  }

  const doneGate = await evaluateBuildDoneGateAsync({
    buildResult,
    task_id: taskId,
    doneGate: doneGateEvidence,
    controlPlane,
    allow_exception: false,
  });

  if (doneGate.done_gate_required === false) {
    return {
      ok: true,
      doneGate,
    };
  }

  if (!doneGate.ok) {
    const missingEvidence = parseMissingEvidence({
      doneGateReason: doneGate.reason,
      doneGateEvidence,
    });
    return {
      ok: false,
      blockedResponse: {
        ok: false,
        blocker: 'BUILDEROS_DONE_BLOCKED',
        reason: doneGate.reason || 'done_gate_required',
        receipt_path: doneGate.receipt_path || null,
        ...(missingEvidence.length ? { missing_evidence: missingEvidence } : {}),
        done_gate_required: true,
        done_gate_passed: false,
      },
    };
  }

  return {
    ok: true,
    doneGate,
  };
}

export async function evaluateBuildCompletionForBuildResponse({
  buildResult,
  taskBody = {},
  readCommit = null,
  kernelManaged = false,
} = {}) {
  if (kernelManaged) {
    return {
      ok: true,
      completion: {
        granted: false,
        completion_required: true,
        blocker: null,
        reason: 'completion_deferred_to_kernel',
        completion_receipt_id: null,
        rollback_bypass: false,
        warning: null,
        outcome_verification: null,
        technical_verification: { ok: true, source: 'builder_precommit' },
      },
      metadata: {
        completion_deferred_to_kernel: true,
      },
    };
  }

  const completion = await grantBuildCompletion({
    buildResult,
    founder_request: taskBody?.task || '',
    required_outcome: taskBody?.required_outcome || null,
    technical: { ok: true, source: 'builder_precommit' },
    featureEnabled: isCompletionAuthorityEnabled(),
    ...(typeof readCommit === 'function' ? { readCommit } : {}),
  });

  if (completion.rollback_bypass) {
    return {
      ok: true,
      completion,
      metadata: {
        completion_authority_warning: completion.warning,
      },
    };
  }

  if (completion.completion_required === false) {
    return {
      ok: true,
      completion,
      metadata: {
        completion_skipped: true,
      },
    };
  }

  if (!completion.granted) {
    return {
      ok: false,
      blockedResponse: {
        ok: false,
        blocker: completion.blocker || 'FAIL_WRONG_OUTCOME',
        reason: completion.reason || 'completion_authority_denied',
        committed: true,
        completion_granted: false,
        completion_receipt_id: null,
      },
    };
  }

  return {
    ok: true,
    completion,
    metadata: {
      completion_granted: true,
      completion_receipt_id: completion.completion_receipt_id,
    },
  };
}

function htmlFullFileCodegenHints() {
  return [
    'HTML FULL FILE — STRICT OUTPUT CONTRACT:',
    '1. Your ENTIRE response must be a complete HTML document. No analysis, no explanation, no markdown prose before or after.',
    '2. Output starts with <!DOCTYPE html> or <html (never with # or text or ```)',
    '3. Output ends with </html> (close the document fully — do not truncate mid-tag or mid-block)',
    '4. Do NOT wrap in markdown fences (no ```html).',
    '5. Do NOT write analysis, implementation notes, section headers, or prose of any kind.',
    '6. Violating this contract makes the output unusable — the build system will reject it.',
  ].join('\n');
}

function jsFullFileCodegenHints() {
  return [
    'JAVASCRIPT FULL FILE — STRICT OUTPUT CONTRACT:',
    '1. Your ENTIRE response must be only JavaScript/ESM source code for the target file.',
    '2. Do NOT write analysis, commentary, implementation notes, apology text, or section headers.',
    '3. Do NOT echo REPO FILE markers, diff markers, filenames, or markdown fences.',
    '4. Do NOT output HTML, JSON, SQL, or mixed-language wrappers unless the target file itself is that format.',
    '5. Start immediately with code or a valid JS comment, and end with valid JS syntax.',
    '6. Violating this contract makes the output unusable — the build system will syntax-check and reject it.',
    '7. SERVER MODULE — NO TOP-LEVEL BROWSER GLOBALS: files under routes/, services/, middleware/, startup/ are imported by Node on the server. They MUST NOT reference document, window, localStorage, navigator, or other browser globals at the top level or in any code that runs at import time — that throws "document is not defined" and fails the Railway deploy healthcheck. The pre-commit gate rejects this.',
    '8. CLIENT-SIDE JS GOES INSIDE RETURNED HTML: if the module renders a page, emit any browser-side JavaScript (event listeners, document/window access) ONLY as string content inside the HTML you return — e.g. within a <script>…</script> tag in a template literal — never as executable module code. Server modules build HTML strings; the browser runs the script, not Node.',
  ].join('\n');
}

function splitBuilderOutput(raw) {
  const text = stripLeadingMarkdownFenceBeforeMetadata(String(raw || ''));

  // Try exact separator first
  const i = text.lastIndexOf(METADATA_SEP);
  if (i !== -1) {
    const main = text.slice(0, i).trim();
    try {
      const placement = JSON.parse(text.slice(i + METADATA_SEP.length).trim());
      return { output: main, placement: typeof placement === 'object' && placement ? placement : null };
    } catch {
      return { output: main, placement: null };
    }
  }

  // Fallback: match ---METADATA--- with any surrounding whitespace + optional ```json fence
  // Model sometimes emits `---METADATA---` without a leading \n or wraps JSON in ```json
  const metaMatch = text.match(/\n?---METADATA---[ \t]*\n?/);
  if (metaMatch) {
    const main = text.slice(0, metaMatch.index).trim();
    const metaTail = text.slice(metaMatch.index + metaMatch[0].length).trim();
    try {
      const jsonStr = metaTail.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
      const placement = JSON.parse(jsonStr);
      return { output: main, placement: typeof placement === 'object' && placement ? placement : null };
    } catch {
      return { output: main, placement: null };
    }
  }

  return { output: text.trim(), placement: null };
}

/**
 * Strip any markdown analysis/preamble a model emits before the HTML document.
 * Models (especially Claude) sometimes write analysis notes, then start the actual HTML.
 * Finds the first <!DOCTYPE html> or <html, trims everything before it.
 * Also strips trailing markdown after </html>.
 * Returns original text unchanged if no HTML start marker is found.
 */
/**
 * Models often paste a full HTML page, markdown fences, or a one-line "*.md" header into `.js` targets.
 * Mirrors the HTML preamble strip path so `node --check` sees real JavaScript.
 */
function extractJavaScriptFromOutput(rawText) {
  let s = String(rawText || '');
  let preambleStripPasses = 0;
  while (preambleStripPasses < 4) {
    preambleStripPasses += 1;
    s = stripLeadingMarkdownFenceBeforeMetadata(s).trim();
    if (!s) break;

    const wholeFence = /^```(?:js|javascript|mjs|cjs)?\s*\r?\n([\s\S]*?)\r?\n```\s$/im;
    const wf = s.match(wholeFence);
    if (wf && wf[1].trim().length > 40) return wf[1].trim();

    if (s.startsWith('```')) {
      const firstNl = s.indexOf('\n');
      if (firstNl !== -1) {
        let inner = s.slice(firstNl + 1);
        const closeIdx = inner.lastIndexOf('\n```');
        if (closeIdx !== -1) inner = inner.slice(0, closeIdx);
        inner = inner.trim();
        if (inner.length > 40) return inner;
      }
    }

    const nl = s.indexOf('\n');
    if (nl > 0 && nl < 220) {
      const head = s.slice(0, nl).trim();
      if (/^[\w./\\-]+\.(md|txt)$/i.test(head)) {
        s = s.slice(nl + 1).trim();
        continue;
      }
    }
    break;
  }

  // Models sometimes leak builder file markers or brief commentary before the actual code.
  // Strip those lines, then start from the first line that looks like real JS/ESM code.
  const rawLines = s
    .split(/\r?\n/)
    .filter((line) => !/^--- REPO FILE(?::| OMITTED:)/.test(line.trim()));
  const codeStartIndex = rawLines.findIndex((line) => {
    const t = line.trim();
    if (!t) return false;
    if (/^(import|export)\s/.test(t)) return true;
    if (/^(const|let|var)\s+[$A-Z_a-z]/.test(t)) return true;
    if (/^(async\s+)?function\s+[$A-Z_a-z]/.test(t)) return true;
    if (/^(class)\s+[$A-Z_a-z]/.test(t)) return true;
    if (/^(if|for|while|switch|try)\s*\(/.test(t)) return true;
    if (/^(\/\/|\/\*|\{|\(|\[)/.test(t)) return true; // */ is never a valid file start — it means /** was dropped
    if (/^[$A-Z_a-z][\w$]*\s*=/.test(t)) return true;
    return false;
  });
  if (codeStartIndex > 0) {
    s = rawLines.slice(codeStartIndex).join('\n').trim();
  } else if (codeStartIndex === -1) {
    s = rawLines.join('\n').trim();
  } else {
    s = rawLines.join('\n').trim();
  }

  // Guard: strip any leading lines that start with a bare `/` (not `//` comment or `/*` block-comment).
  // A lone `/` at line 1 is an unterminated regex literal — Node.js throws
  // "SyntaxError: Invalid regular expression: missing /". This can happen when
  // codeStartIndex === -1 (no recognized JS start found) and the model output
  // begins with a stray `/` or an incomplete regex literal like `/^pattern`.
  // CC TICKET 001 — quarantine evidence: site-builder-pipeline-report-route failure.
  {
    const sLines = s.split(/\r?\n/);
    let stripCount = 0;
    while (stripCount < sLines.length) {
      const tl = sLines[stripCount].trim();
      // Allow empty lines to pass (they'll be trimmed later)
      if (!tl) { stripCount++; continue; }
      // Allow `//` and `/*` — those are valid JS comment openers
      if (/^(\/\/|\/\*)/.test(tl)) break;
      // A line starting with `/` but not `//` or `/*` is an invalid file opener — strip it
      if (tl.startsWith('/')) { stripCount++; continue; }
      break;
    }
    if (stripCount > 0) {
      s = sLines.slice(stripCount).join('\n').trim();
    }
  }

  // Models sometimes wrap pure HTML in a JS target by mistake. Extract the largest
  // inline <script> only when the payload is HTML-shaped AND not already a JS module.
  // SSR route files (e.g. marketing-session-ui-routes.js) embed <!DOCTYPE>/<script>
  // inside template literals — treating those as HTML was stripping the module down
  // to a theme IIFE and failing looksLikeBuilderProseRefusal on execute-batch.
  const trimmedHead = s.trimStart().slice(0, 240);
  const looksLikeJsModule =
    /^(?:\/\/|\/\*+|import\s|export\s|const\s|let\s|var\s|(?:async\s+)?function\s|class\s|#!)/.test(trimmedHead);
  const looksHtml = !looksLikeJsModule && (/<!DOCTYPE\s+html/i.test(s) || /<html[\s>]/i.test(s));
  if (looksHtml) {
    const blocks = [];
    const re = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = re.exec(s)) !== null) {
      const body = sm[1].trim();
      if (body.length > 80) blocks.push(body);
    }
    if (blocks.length) {
      blocks.sort((a, b) => b.length - a.length);
      return blocks[0];
    }
  }

  return s.trim();
}

/**
 * groq_llama hallucinates asterisk-prefixed shorthand like `const rk = requireKey;`
 * which is not valid JS. Strip the * prefix unless it follows `function` (generator syntax).
 */
function fixAsteriskShorthandParams(s) {
  return s.replace(/\*([A-Za-z_$][\w$]*)/g, (match, name, offset) => {
    const before = s.slice(Math.max(0, offset - 9), offset);
    if (/function\s$/.test(before)) return match;
    return name;
  });
}

// Detect a TRUNCATED SQL migration (model cut off mid-generation). There is no
// `node --check` for .sql, so this scanner is the truncation gate: it walks the
// text while skipping delimiters inside string/dollar-quote/comment contexts so
// real migrations (function bodies with `$$`, strings containing parens) never
// false-positive, then flags unterminated literals/comments, unbalanced parens,
// or a body that doesn't end in `;`. Verified zero false-positives across all
// committed migrations.
function checkSqlCompleteness(sqlContent) {
  const s = String(sqlContent || '');
  const n = s.length;
  let i = 0;
  let parenDepth = 0;
  let lastSignificant = '';
  let inLineComment = false;
  let inBlockComment = false;
  let inSingle = false;
  let dollarTag = null;

  while (i < n) {
    const c = s[i];
    const c2 = s[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && c2 === '/') { inBlockComment = false; i += 2; continue; }
      i += 1;
      continue;
    }
    if (inSingle) {
      if (c === "'" && c2 === "'") { i += 2; continue; }
      if (c === "'") { inSingle = false; i += 1; continue; }
      i += 1;
      continue;
    }
    if (dollarTag) {
      if (c === '$' && s.slice(i).startsWith(dollarTag)) { i += dollarTag.length; dollarTag = null; continue; }
      i += 1;
      continue;
    }

    if (c === '-' && c2 === '-') { inLineComment = true; i += 2; continue; }
    if (c === '/' && c2 === '*') { inBlockComment = true; i += 2; continue; }
    if (c === "'") { inSingle = true; i += 1; continue; }
    if (c === '$') {
      const m = s.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) { dollarTag = m[0]; i += m[0].length; continue; }
    }
    if (c === '(') { parenDepth += 1; lastSignificant = c; i += 1; continue; }
    if (c === ')') { parenDepth -= 1; lastSignificant = c; i += 1; continue; }
    if (!/\s/.test(c)) lastSignificant = c;
    i += 1;
  }

  if (inBlockComment) return { ok: false, error: 'SQL migration appears truncated — unterminated block comment (/* …)' };
  if (inSingle) return { ok: false, error: 'SQL migration appears truncated — unterminated string literal' };
  if (dollarTag) return { ok: false, error: `SQL migration appears truncated — unterminated dollar-quoted block (${dollarTag} …)` };
  if (parenDepth > 0) return { ok: false, error: `SQL migration appears truncated — ${parenDepth} unclosed parenthes${parenDepth === 1 ? 'is' : 'es'}` };
  if (parenDepth < 0) return { ok: false, error: 'SQL migration malformed — unbalanced parentheses (extra close)' };
  if (lastSignificant && lastSignificant !== ';') {
    return { ok: false, error: `SQL migration appears truncated — does not end in ';' (ends in '${lastSignificant}')` };
  }
  return { ok: true };
}

function validateSqlMigrationContent(sqlContent) {
  const s = String(sqlContent || '').trim();
  if (!s) return { ok: false, error: 'SQL migration is empty' };

  const jsMarkers = [
    { pattern: /^\s*\/\//m, error: 'JavaScript // comments are invalid in SQL migrations — use -- comments only' },
    { pattern: /\bimport\s+/i, error: 'JavaScript import statements are invalid in .sql migrations' },
    { pattern: /\bexport\s+/i, error: 'JavaScript export statements are invalid in .sql migrations' },
    { pattern: /\bawait\s+/i, error: 'JavaScript await is invalid in .sql migrations' },
    { pattern: /\basync\s+function/i, error: 'JavaScript async function is invalid in .sql migrations' },
    { pattern: /client\.query|pool\.connect|pool\.query\s*\(/i, error: 'JavaScript pool.query wrappers are invalid — emit plain PostgreSQL DDL only' },
    { pattern: /`[\s\S]*?\bCREATE\b/i, error: 'SQL must not be wrapped in JavaScript template literals' },
    { pattern: /\bfunction\s+up\s*\(/i, error: 'Migration runner functions are invalid — emit plain PostgreSQL DDL only' },
  ];

  for (const { pattern, error } of jsMarkers) {
    if (pattern.test(s)) return { ok: false, error };
  }

  const sqlKeywords = /\b(CREATE|ALTER|INSERT|UPDATE|DELETE|SELECT|DROP|GRANT|REVOKE|TRUNCATE|WITH)\b/i;
  if (!sqlKeywords.test(s)) {
    return { ok: false, error: 'No recognizable SQL keywords (CREATE, ALTER, etc.)' };
  }

  const completeness = checkSqlCompleteness(s);
  if (!completeness.ok) return completeness;

  return { ok: true };
}

function looksLikeJsonManifestInsteadOfJs(content, target) {
  if (!/scripts\/verify-.*\.mjs$/i.test(String(target || ''))) return false;
  const t = String(content || '').trimStart();
  return t.startsWith('{') && /"project_id"|"required_files"|"required_routes"/.test(t);
}

// Read the repo's module system once — `node --check` resolves ESM-vs-CommonJS
// from the nearest package.json "type", and a `.js` file parsed in the wrong
// mode silently tolerates ESM-only syntax errors (e.g. a truncated block comment
// at EOF). Resolve from REPO_ROOT (derived from this module's own location via
// import.meta.url), NOT process.cwd() — the server can be launched from a
// different working directory (e.g. a local boot script), which would otherwise
// mis-detect the type and defeat this whole gate. Default 'commonjs' matches
// Node's own default when "type" is absent.
function repoModuleType() {
  try {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    return pkg.type === 'module' ? 'module' : 'commonjs';
  } catch {
    return 'commonjs';
  }
}

async function verifyGeneratedJavaScriptWithNodeCheck(content, resolvedTarget) {
  let tmpFile = null;
  let tmpPkg = null;
  try {
    const tmpDir = await mkdtemp(join(tmpdir(), 'builder-check-'));
    // Give the temp file a real basename (not a bare ".js" dotfile) and, for a
    // .js target, drop a package.json mirroring the repo's "type" so the check
    // runs in the SAME module system the committed file will actually run in.
    // os.tmpdir() has no package.json, so without this a .js file is parsed as
    // CommonJS and ESM-only syntax errors (including truncated output) pass.
    const ext = extname(resolvedTarget) || '.js';
    tmpFile = join(tmpDir, `check${ext}`);
    if (/^\.(js)$/i.test(ext)) {
      tmpPkg = join(tmpDir, 'package.json');
      await writeFile(tmpPkg, JSON.stringify({ type: repoModuleType() }), 'utf8');
    }
    await writeFile(tmpFile, content, 'utf8');
    execSync(`node --check "${tmpFile}"`, { stdio: 'pipe' });
    return { ok: true };
  } catch (checkErr) {
    return {
      ok: false,
      error: (checkErr.stderr?.toString() || checkErr.message || 'syntax error').slice(0, 400),
    };
  } finally {
    if (tmpFile) await unlink(tmpFile).catch(() => {});
    if (tmpPkg) await unlink(tmpPkg).catch(() => {});
  }
}

function extractCssFromOutput(rawText) {
  let s = String(rawText || '');
  // Strip whole ```css ... ``` fence
  const wholeFence = /^```(?:css|scss|sass|less)?\s*\r?\n([\s\S]*?)\r?\n```\s$/im;
  const wf = s.match(wholeFence);
  if (wf && wf[1].trim().length > 10) return wf[1].trim();
  // Strip opening fence if no closing fence (truncated)
  if (s.startsWith('```')) {
    const firstNl = s.indexOf('\n');
    if (firstNl !== -1) {
      let inner = s.slice(firstNl + 1);
      const closeIdx = inner.lastIndexOf('\n```');
      if (closeIdx !== -1) inner = inner.slice(0, closeIdx);
      inner = inner.trim();
      if (inner.length > 10) return inner;
    }
  }
  // Strip prose preamble lines before the first CSS token (selector, comment, @rule, :root)
  const lines = s.split(/\r?\n/);
  const cssStart = lines.findIndex((l) => {
    const t = l.trim();
    return /^(\/\*|:root|html|body|\.|#|@)/.test(t) || /\{/.test(t);
  });
  if (cssStart > 0) return lines.slice(cssStart).join('\n').trim();
  return s.trim();
}

function extractHtmlFromOutput(text) {
  const s = String(text || '');
  // Find earliest HTML document start
  const doctypeRe = /<!DOCTYPE\s+html/i;
  const htmlTagRe = /<html[\s>]/i;
  const dtMatch = doctypeRe.exec(s);
  const htMatch = htmlTagRe.exec(s);
  let startIdx = -1;
  if (dtMatch) startIdx = dtMatch.index;
  if (htMatch && (startIdx === -1 || htMatch.index < startIdx)) startIdx = htMatch.index;
  if (startIdx === -1) return s; // No HTML found — return unchanged
  const trimmed = s.slice(startIdx);
  // Strip any trailing non-HTML content after the closing </html>
  const closeIdx = trimmed.toLowerCase().lastIndexOf('</html>');
  if (closeIdx !== -1) return trimmed.slice(0, closeIdx + 7); // 7 = '</html>'.length
  return trimmed;
}


function validateOverlayNotShrunk(targetFile, output) {
  const rel = String(targetFile || '').replace(/^\//, '');
  const minLines = rel === 'public/overlay/lifeos-app.html' ? 2000
    : rel === 'public/overlay/lifeos-dashboard.html' ? 400
      : 0;
  if (!minLines) return null;
  const full = join(REPO_ROOT, rel);
  if (!existsSync(full)) return null;
  const existingLines = readFileSync(full, 'utf8').split('\n').length;
  const newLines = String(output || '').split('\n').length;
  if (existingLines >= minLines && newLines < minLines) {
    return `refusing overlay shrink: ${rel} is ${existingLines} lines on disk but output is ${newLines} lines — use public/overlay/lifeos-theme-overrides.css for CSS-only UI changes`;
  }
  return null;
}

// Truncation gate for HTML fragments/partials* (a <section>/<div> component with
// no document wrapper). A full-page overlay uses a length floor + document-structure
// check, but a legitimate partial is often far under that floor and has no
// <html>/<head>/<body> — so it needs a structure-based completeness check instead
// (same principle as `node --check` for JS / JSON.parse for JSON): a truncated
// fragment ends mid-tag, leaves an element unclosed, or has an unterminated comment.
// This is NOT a weakening of the full-page gate — only explicit fragment targets
// (partials/components/fragments dirs or *-partial/-fragment/-component.html) that
// do NOT contain a document wrapper take this path; everything else keeps the floor.
const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function validateHtmlFragmentComplete(text) {
  const s = String(text || '').trim();
  if (!s) return 'generated HTML fragment is empty';
  if (!s.endsWith('>')) {
    return 'generated HTML fragment appears truncated (does not end with a closed tag)';
  }
  if ((s.match(/<!--/g) || []).length !== (s.match(/-->/g) || []).length) {
    return 'generated HTML fragment has an unterminated comment (likely truncated)';
  }
  // Strip comments so their contents never register as tags, then walk tags to
  // confirm every opened non-void element is closed and none dangle.
  const withoutComments = s.replace(/<!--[\s\S]*?-->/g, '');
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(withoutComments)) !== null) {
    const name = m[1].toLowerCase();
    const isClosing = m[0].startsWith('</');
    const selfClosed = m[2] === '/';
    if (HTML_VOID_ELEMENTS.has(name)) continue;
    if (isClosing) {
      let idx = -1;
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i] === name) { idx = i; break; }
      }
      if (idx === -1) {
        return `generated HTML fragment has an unexpected closing </${name}> (malformed or truncated)`;
      }
      stack.length = idx;
    } else if (!selfClosed) {
      stack.push(name);
    }
  }
  if (stack.length) {
    return `generated HTML fragment has an unclosed <${stack[stack.length - 1]}> (likely truncated)`;
  }
  return null;
}

export function isHtmlFragmentTarget(target) {
  const t = String(target || '').toLowerCase();
  return /(^|\/)(partials?|components?|fragments?)\//.test(t)
    || /[-_.](partial|fragment|component)s?\.html$/.test(t);
}

function validateGeneratedOutputForTarget(targetFile, output) {
  const target = String(targetFile || '').toLowerCase();
  const text = String(output || '').trim();
  if (!text) return 'generated output is empty';
  const layerViolation = detectGeneratedLayerViolation(targetFile, text);
  if (layerViolation) return layerViolation.detail;
  const shrinkError = validateOverlayNotShrunk(targetFile, text);
  if (shrinkError) return shrinkError;
  if (target.endsWith('.html')) {
    if (!/^[\s]*</.test(text)) return 'generated HTML must start with <!DOCTYPE or <html (no preamble or markdown)';
    // Explicit fragment/partial targets are validated for completeness by tag
    // structure (balanced tags, closed comments, ends on a closed tag) rather
    // than a length floor — a partial component is legitimately small, and a
    // truncated one is caught by structure. This holds even when the model wraps
    // a small partial in a full <!DOCTYPE> document: that is complete, not
    // truncated, so it should commit. Non-fragment targets keep the strict floor
    // + document-structure gate so a truncated live overlay can never commit.
    if (isHtmlFragmentTarget(target)) {
      const fragmentError = validateHtmlFragmentComplete(text);
      if (fragmentError) return fragmentError;
    } else {
      if (text.length < 1000) return 'generated HTML is too short; refusing to commit likely truncated output';
      // Accept either: classic <html>...</html> wrapper OR HTML5 <!DOCTYPE html> + <head> + <body>
      const hasHtmlWrapper = /<html[\s>]/i.test(text) && /<\/html>/i.test(text);
      const hasHtml5Structure = /<!DOCTYPE\s+html/i.test(text) && /<head[\s>]/i.test(text) && /<body[\s>]/i.test(text);
      if (!hasHtmlWrapper && !hasHtml5Structure) {
        const truncatedInHead =
          /<!DOCTYPE\s+html/i.test(text) &&
          /<html[\s>]/i.test(text) &&
          /<head[\s>]/i.test(text) &&
          !/<body[\s>]/i.test(text);
        if (truncatedInHead) {
          return 'generated HTML appears truncated before <body> (output token budget too small for full-file regeneration, or provider cut off). Retry with BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP or split CSS/markup into a smaller target file.';
        }
        return 'generated HTML is missing required document structure (<html> wrapper OR <!DOCTYPE html> + <head> + <body>)';
      }
    }
  }
  // JS absolute floor — catches 1-line truncated stubs; legitimate short files (helpers, re-exports) pass through to node --check
  if (target.endsWith('.js') || target.endsWith('.mjs') || target.endsWith('.cjs')) {
    if (looksLikeBuilderProseRefusal(text, targetFile)) {
      return 'generated output is prose refusal, not code — inject target_file + files[] or retry with full file in spec';
    }
    const lineCount = text.split('\n').length;
    if (lineCount < 3) {
      return `generated JS is too short (${lineCount} lines); likely token-limit truncation — refusing to commit; retry with a smaller spec or explicit target_file`;
    }
  }
  // JSON targets have no `node --check`; a truncated config/manifest would only
  // fail loudly at boot-parse. JSON.parse IS the completeness gate — it rejects
  // any truncation (unterminated string/object/array, trailing comma from a cut
  // mid-write). Covers /build, /execute, and executeBatch (all call this).
  if (target.endsWith('.json')) {
    try {
      JSON.parse(text);
    } catch (e) {
      return `generated JSON is invalid (likely truncated): ${e.message}`;
    }
  }
  return null;
}

function buildAutonomyInstructions({ autonomyMode, internetResearch }) {
  if (autonomyMode !== 'max') return '';
  const webLine = internetResearch
    ? 'If needed, infer missing implementation details from established patterns and web-known standards, then proceed.'
    : 'Infer missing implementation details from established repo patterns, then proceed.';
  return [
    'AUTONOMY MODE: MAX.',
    'Do not ask clarifying questions back to the operator for routine ambiguity.',
    'Make the best reasonable assumptions and continue execution.',
    webLine,
    'If assumptions are required, include a short "ASSUMPTIONS" section before ---METADATA---.',
    'Only stop when blocked by unavailable credentials, missing external systems, or irreversible/high-risk action requiring human authorization.',
  ].join(' ');
}

export function createLifeOSCouncilBuilderRoutes({
  pool,
  requireKey,
  callCouncilMember,
  lclMonitor,
  logger,
  getCachedResponse,
  cacheResponse,
  commitToGitHub,
  commitManyToGitHub,
  platformKernel,
}) {
  const log = logger || console;
  const cacheGet = typeof getCachedResponse === 'function' ? getCachedResponse : null;
  const cacheSet = typeof cacheResponse === 'function' ? cacheResponse : null;
  const memorySvc = pool?.query ? createMemoryIntelligenceService(pool, log) : null;
  const builderControlPlane = pool?.query
    ? createBuilderOSControlPlaneService({ pool, logger: log })
    : null;

  // Fire-and-forget: tag the commit SHA so we can roll back a bad autonomous night with
  // `git checkout refs/tags/autonomy/golden-<sha>` without bisecting hundreds of commits.
  async function createAutonomyGoldenTag(sha) {
    const token = process.env.GITHUB_TOKEN?.trim();
    const repoEnv = process.env.GITHUB_REPO;
    if (!token || !repoEnv || !sha) return;
    const [owner, repo] = repoEnv.split('/');
    const tagName = `autonomy/golden-${sha.slice(0, 7)}`;
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/tags/${tagName}`, sha }),
    }).catch(() => {});
  }

  // ── GET /ready — machine-readable "can the system build & commit?" (for preflight + operators)

  function getBuilderReady(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    const anyAuthKey = Boolean(
      process.env.API_KEY || process.env.LIFEOS_KEY || process.env.COMMAND_CENTER_KEY
    );
    const builderEnvPath = join(REPO_ROOT, '.env.builderos');
    const builderEnvPresent = existsSync(builderEnvPath);
    const builderEnvBytes = builderEnvPresent ? readFileSync(builderEnvPath, 'utf8').length : 0;
    const builderEnvNonEmpty = builderEnvBytes > 0;
    const localMirrorCommitReady = !IS_RAILWAY_RUNTIME;
    const commitPathReady = typeof commitToGitHub === 'function' && (Boolean(process.env.GITHUB_TOKEN) || localMirrorCommitReady);
    const deployCommitShaRaw =
      process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
    const deployCommitSha =
      typeof deployCommitShaRaw === 'string' && /^[a-fA-F0-9]{7,40}$/.test(deployCommitShaRaw.trim())
        ? deployCommitShaRaw.trim().slice(0, 40)
        : null;
    const codegen = {
      policy_revision: BUILDER_CODEGEN_POLICY_REVISION,
      supports_max_output_tokens_body: true,
      html_output_estimator: 'v2_linear_chars_1_85',
      ...(deployCommitSha ? { deploy_commit_sha: deployCommitSha } : {}),
    };
    res.json({
      ok: true,
      runtime_profile: process.env.LIFEOS_RUNTIME_PROFILE || 'founder_builder',
      codegen,
      builder: {
        commitToGitHub: typeof commitToGitHub === 'function',
        commit_path_ready: commitPathReady,
        local_mirror_commit: localMirrorCommitReady,
        /** Token present on the server; without it, commitToGitHub usually throws on use. */
        github_token: Boolean(process.env.GITHUB_TOKEN),
        callCouncilMember: typeof callCouncilMember === 'function',
        pool: Boolean(pool?.query),
        lclMonitor: Boolean(lclMonitor),
        /** Same string as codegen.policy_revision — nested for clients that only read `builder`. */
        codegen_policy_revision: BUILDER_CODEGEN_POLICY_REVISION,
      },
      server: {
        auth: anyAuthKey ? 'key_required' : 'open',
        // When open, requireKey still allows requests; when key_required, client must send matching header.
        auth_keys: anyAuthKey
          ? { API_KEY: Boolean(process.env.API_KEY), LIFEOS_KEY: Boolean(process.env.LIFEOS_KEY), COMMAND_CENTER_KEY: Boolean(process.env.COMMAND_CENTER_KEY) }
          : null,
        local_builder_env: {
          file_present: builderEnvPresent,
          file_nonempty: builderEnvNonEmpty,
          openai_key_loaded: Boolean(process.env.OPENAI_API_KEY),
        },
      },
      next_steps: (() => {
        const s = [];
        if (typeof commitToGitHub !== 'function') s.push('Wire deployment-service commitToGitHub into createLifeOSCouncilBuilderRoutes (startup).');
        if (typeof commitToGitHub === 'function' && !process.env.GITHUB_TOKEN && IS_RAILWAY_RUNTIME)
          s.push('Set GITHUB_TOKEN on the server — Railway runtime cannot commit builder output without a GitHub PAT.');
        if (typeof commitToGitHub === 'function' && !process.env.GITHUB_TOKEN && !IS_RAILWAY_RUNTIME)
          s.push('Local founder-builder runtime will mirror commits to disk without GitHub. Add GITHUB_TOKEN if you want local /build to push remote commits too.');
        if (typeof callCouncilMember !== 'function') s.push('Wiring: callCouncilMember missing from createLifeOSCouncilBuilderRoutes (startup).');
        if (!pool?.query) s.push('Set DATABASE_URL — builder audit + some paths need pool.');
        if (anyAuthKey)
          s.push('Send x-command-key (or x-lifeos-key) equal to the configured COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY on each builder request from your machine.');
        if (builderEnvPresent && !builderEnvNonEmpty) {
          s.push('Local BuilderOS worker file .env.builderos exists but is empty — local builder lanes will stay unavailable until OPENAI_API_KEY (or other provider keys) are actually saved into that file.');
        } else if (!process.env.OPENAI_API_KEY && !IS_RAILWAY_RUNTIME) {
          s.push('Local builder runtime has no OPENAI_API_KEY loaded — save the BuilderOS worker key into .env.builderos or export OPENAI_API_KEY before local build tests.');
        }
        return s;
      })(),
    });
  }

  // ── GET /domains ─────────────────────────────────────────────────────────────

  async function getDomains(req, res) {
    try {
      const files = await readdir(PROMPTS_DIR);
      const domains = files
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .map(f => ({
          name: f.replace('.md', ''),
          file: f,
          path: `prompts/${f}`,
        }));
      res.json({ ok: true, domains });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] Failed to list domains');
      res.status(500).json({ ok: false, error: 'Failed to list domain prompt files' });
    }
  }

  // ── GET /domain/:name ────────────────────────────────────────────────────────

  async function getDomain(req, res) {
    try {
      const { name } = req.params;
      if (!/^[\w-]+$/.test(name)) {
        return res.status(400).json({ ok: false, error: 'Invalid domain name' });
      }
      const filePath = join(PROMPTS_DIR, `${name}.md`);
      const content = await readFile(filePath, 'utf8');
      res.json({ ok: true, domain: name, content });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ ok: false, error: 'Domain prompt file not found' });
      }
      res.status(500).json({ ok: false, error: 'Failed to read domain file' });
    }
  }

  // ── GET /next-task ───────────────────────────────────────────────────────────
  // Machine-readable cold-start: same snippets as `npm run cold-start:gen` sources.

  async function getNextTask(req, res) {
    const paths = [
      ['continuity_index', join(REPO_ROOT, 'docs/CONTINUITY_INDEX.md')],
      ['continuity_main', join(REPO_ROOT, 'docs/CONTINUITY_LOG.md')],
      ['continuity_lifeos', join(REPO_ROOT, 'docs/CONTINUITY_LOG_LIFEOS.md')],
      ['continuity_council', join(REPO_ROOT, 'docs/CONTINUITY_LOG_COUNCIL.md')],
      ['ai_cold_start', join(REPO_ROOT, 'docs/AI_COLD_START.md')],
      ['prompt_ssot_sequence', join(PROMPTS_DIR, '00-SSOT-READ-SEQUENCE.md')],
      ['prompt_model_tiers', join(PROMPTS_DIR, '00-MODEL-TIERS-THINK-VS-EXECUTE.md')],
    ];
    const snippets = {};
    for (const [key, p] of paths) {
      try {
        const t = await readFile(p, 'utf8');
        snippets[key] = t.slice(0, 8000);
      } catch {
        snippets[key] = `(missing: ${key})`;
      }
    }
    res.json({
      ok: true,
      read_order: [
        'prompts/00-LIFEOS-AGENT-CONTRACT.md',
        'prompts/00-SSOT-READ-SEQUENCE.md',
        'prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md',
        'docs/CONTINUITY_INDEX.md',
        'docs/AI_COLD_START.md',
        'docs/CONTINUITY_LOG*.md (lane)',
        'docs/projects/manifest.json',
        'prompts/<domain>.md',
      ],
      snippets,
      generated_at: new Date().toISOString(),
    });
  }

  function buildGapRecommendation({ stage, reason, targetFile = null, routingKey = null, mode = null, domain = null }) {
    const fixes = {
      routing: 'Inspect task-to-model authority and unblock or remap the builder route for this task type.',
      dispatch: 'Fix council dispatch on the Railway runtime: provider keys, routing, remote reachability, or server-side council path.',
      placement: 'Tighten builder metadata so target_file is emitted deterministically for commit-capable slices.',
      validation: 'Harden output validation rules or the domain prompt so builder output conforms before commit.',
      syntax: 'Improve code-generation prompt/contracts and keep the syntax gate red until generated JS passes node --check.',
      sql: 'Strengthen SQL generation/validation so migrations contain real executable SQL before commit.',
      html: 'Require full-document HTML output with the required root tags before commit.',
      commit: 'Repair the GitHub commit path on the remote system: token, branch permissions, or commit transport.',
      safe_scope:
        'Add the path prefix to config/builder-safe-scope.js SAFE_WRITE_PATHS, or retry with an alternate target_file under an allowed prefix (scripts/, routes/, etc.).',
    };
    return {
      stage,
      reason,
      target_file: targetFile,
      routing_key: routingKey,
      mode,
      domain,
      next_platform_fix: fixes[stage] || 'Repair the builder/platform path before retrying product work.',
      remote_system_truth: REMOTE_SYSTEM_TRUTH,
      ...classifyBuilderGap({
        failure_stage: stage,
        failure_reason: reason,
        target_file: targetFile,
      }),
    };
  }

  async function insertBuilderAudit({
    domain,
    task,
    model_used,
    rawOutput,
    cache_hit,
    placement,
    status = 'generated',
    failureStage = null,
    failureReason = null,
    gapRecommendation = null,
    committed = null,
    routingKey = null,
    mode = null,
    executionOnly = null,
  }) {
    if (!pool?.query) return;
    const preview = String(task || '').slice(0, 500);
    const placementJson = {
      ...(placement || {}),
      status,
      failure_stage: failureStage,
      failure_reason: failureReason,
      gap_recommendation: gapRecommendation,
      committed,
      routing_key: routingKey,
      mode,
      execution_only: executionOnly,
    };
    await pool
      .query(
        `INSERT INTO conductor_builder_audit (domain, task_preview, model_used, output_chars, cache_hit, placement_json)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          domain || null,
          preview,
          model_used,
          rawOutput?.length || 0,
          !!cache_hit,
          JSON.stringify(placementJson),
        ]
      )
      .catch(() => {});
    await import('../services/autonomous-telemetry-instrumentation.js')
      .then(({ emitBuilderTelemetry }) =>
        emitBuilderTelemetry(pool, {
          domain,
          task,
          model_used,
          rawOutput,
          placement,
          status,
          failureStage,
          failureReason,
          committed,
        })
      )
      .catch(() => {});
  }

  /** GitHub commits do not update the Railway container FS — files[] injection reads disk. Mirror so chained /build steps see newest content without redeploy between tasks. */
  async function mirrorCommittedContentToRepoRoot(relPath, content) {
    if (!relPath || typeof content !== 'string') return { ok: false, reason: 'bad_args' };
    const sanitized = String(relPath).replace(/^[/\\]+/, '');
    if (sanitized.includes('..') || !/^[\w./\\-]+$/.test(sanitized)) {
      return { ok: false, reason: 'invalid_path' };
    }
    const abs = resolve(REPO_ROOT, sanitized);
    const relToRoot = relative(REPO_ROOT, abs);
    if (relToRoot.startsWith('..') || relToRoot === '') return { ok: false, reason: 'outside_repo' };
    try {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, 'utf8');
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e?.message || String(e) };
    }
  }

  function isMissingGitHubCommitCapability(error) {
    const message = String(error?.message || error || '');
    return /GITHUB_TOKEN not configured|commitManyToGitHub not available/i.test(message);
  }

  async function mirrorEntriesLocally(fileEntries, commitMessage) {
    const committed_files = [];
    for (const entry of fileEntries) {
      const mirrorExec = await mirrorCommittedContentToRepoRoot(entry.path, entry.content);
      if (!mirrorExec.ok) {
        throw new Error(`local mirror failed for ${entry.path}: ${mirrorExec.reason}`);
      }
      committed_files.push(entry.path);
    }
    const sha = createHash('sha1')
      .update(JSON.stringify({
        commit_message: commitMessage || '[system-build] local mirror',
        files: fileEntries.map((entry) => ({
          path: entry.path,
          content: entry.content,
        })),
      }))
      .digest('hex');
    return {
      ok: true,
      sha,
      commit_sha: sha,
      committed_files,
      commit_mode: 'local_mirror',
      local_only: true,
      warning: 'GitHub remote commit unavailable; mirrored locally for founder alpha runtime.',
    };
  }

  async function commitOrMirrorFiles(fileEntries, commitMessage, branch) {
    if (typeof commitManyToGitHub === 'function') {
      try {
        const commitResult = await commitManyToGitHub(fileEntries, commitMessage, branch || undefined);
        const requested = fileEntries.map((entry) => entry.path);
        // changed_files is the git-verified truth of what the commit changed (null =
        // detection unavailable, treat as unknown, never as "all changed"). unchanged_files
        // are requested targets that did NOT change — the honesty signal for the caller.
        const changed = Array.isArray(commitResult?.changed_files) ? commitResult.changed_files : null;
        const norm = (p) => String(p || '').replace(/^\.\//, '').replace(/\\/g, '/');
        const changedNorm = changed ? changed.map(norm) : null;
        const unchanged = changedNorm
          ? requested.filter((p) => !changedNorm.includes(norm(p)))
          : null;
        return {
          ok: true,
          sha: commitResult?.sha || null,
          commit_sha: commitResult?.sha || null,
          committed_files: requested,
          changed_files: changed,
          unchanged_files: unchanged,
          commit_mode: 'github',
          local_only: false,
        };
      } catch (err) {
        if (IS_RAILWAY_RUNTIME || !isMissingGitHubCommitCapability(err)) {
          throw err;
        }
      }
    } else if (IS_RAILWAY_RUNTIME) {
      throw new Error('commitManyToGitHub not available — GITHUB_TOKEN may be missing');
    }

    return mirrorEntriesLocally(fileEntries, commitMessage);
  }

  async function recordBuilderGap({
    domain,
    task,
    modelUsed = 'system',
    rawOutput = '',
    cacheHit = false,
    placement = null,
    status = 'failed',
    stage,
    reason,
    targetFile = null,
    routingKey = null,
    mode = null,
    executionOnly = null,
  }) {
    const gapRecommendation = buildGapRecommendation({
      stage,
      reason,
      targetFile: targetFile || placement?.target_file || null,
      routingKey,
      mode,
      domain,
    });
    const gapClass = classifyBuilderGap({
      failure_stage: stage,
      failure_reason: reason,
      target_file: targetFile || placement?.target_file || null,
      gap_recommendation: gapRecommendation,
      status,
    });
    await insertBuilderAudit({
      domain,
      task,
      model_used: modelUsed,
      rawOutput,
      cache_hit: cacheHit,
      placement: {
        ...(placement || {}),
        target_file: targetFile || placement?.target_file || null,
        failure_family: gapClass.failure_family,
        playbook: gapClass.playbook,
        repairable: gapClass.repairable,
      },
      status,
      failureStage: stage,
      failureReason: reason,
      gapRecommendation,
      committed: false,
      routingKey,
      mode,
      executionOnly,
    });
    return gapRecommendation;
  }

  async function respondSafeScopeBlocked(res, { resolvedTarget, taskBody, attempted_action = 'POST /api/v1/lifeos/builder/build' }) {
    const gapRecommendation = await recordBuilderGap({
      domain: taskBody.domain || null,
      task: taskBody.task,
      status: 'blocked',
      stage: 'safe_scope',
      reason: `Target file is outside the Builder safe-scope policy: ${resolvedTarget}`,
      targetFile: resolvedTarget,
      routingKey: 'council.builder.code',
      mode: taskBody.mode || 'code',
      executionOnly: taskBody.execution_only === true,
    });
    const blockedReturn = {
      status: 'BLOCKED_RETURN_TO_BPB',
      mission_id: taskBody.mission_id || null,
      blueprint_id: taskBody.blueprint_id || null,
      step_id: taskBody.step_id || 'BUILD_SCOPE',
      gap_type: 'out_of_scope_request',
      summary: `Builder cannot commit to ${resolvedTarget} — path outside supervised safe-scope`,
      attempted_action,
      missing_information: [
        'safe_scope_path_in_config/builder-safe-scope.js',
        'or alternate target_file under SAFE_WRITE_PATHS',
      ],
      evidence: {
        target_file: resolvedTarget,
        gap_recommendation: gapRecommendation,
      },
    };
    return res.status(422).json({
      ok: false,
      error: 'Target file is outside the Builder safe-scope policy',
      target_file: resolvedTarget,
      committed: false,
      gap_recommendation: gapRecommendation,
      blocked_return: blockedReturn,
    });
  }

  // ── POST /task ───────────────────────────────────────────────────────────────

  async function dispatchTask(req, res) {
    const {
      domain,
      task,
      spec,
      files,
      target_file: bodyTargetFile,
      model,
      mode = 'code',
      useCache = true,
      autonomy_mode = 'max',
      internet_research = true,
      execution_only = false,
      additive_patch = false,
      edit_patch = false,
    } = req.body || {};

    if (!task) {
      return res.status(400).json({ ok: false, error: 'task is required' });
    }

    const executionOnly = execution_only === true;
    if (mode === 'code' && !executionOnly) {
      let intakeSessionClearance = null;
      if (req.body?.blueprint_intake_session_id && bodyTargetFile) {
        intakeSessionClearance = await verifyIntakeSessionBuildClearance(
          pool,
          req.body.blueprint_intake_session_id,
          bodyTargetFile,
          req.body.blueprint_step_id || null,
        );
      }
      const fpV2Gate = await enforceBeforeBuilderDispatch({
        task,
        missionId: req.body?.mission_id,
        pool,
        callAI: callCouncilMember,
        confirmIntent: req.body?.confirm_intent === true,
        platformGapFill: req.body?.platform_gap_fill === true,
        platformGapFillReason: req.body?.platform_gap_fill_reason,
        intakeSessionClearance,
      });
      if (!fpV2Gate.execute_cleared) {
        return res.status(422).json({
          ok: false,
          error: 'BLOCKED_FOUNDER_PACKET_V2',
          violations: fpV2Gate.violations,
          detail: formatUnifiedGateBlockSummary(fpV2Gate),
        });
      }
    }

    let domainContext = '';
    let domainLoaded = false;
    if (domain) {
      try {
        if (!/^[\w-]+$/.test(domain)) throw new Error('Invalid domain name');
        const filePath = join(PROMPTS_DIR, `${domain}.md`);
        domainContext = await readFile(filePath, 'utf8');
        domainLoaded = true;
      } catch {
        log.warn({ domain }, '[BUILDER] Domain prompt file not found — proceeding without context');
      }
    }

    // When building against an existing target file, always inject its current
    // content so the model extends the real file instead of refusing with
    // "existing exports were not provided" (or blindly rebuilding what exists).
    // Only auto-added when the file actually exists on disk (new-file builds
    // have no prior content and must not inject a spurious READ ERROR block).
    const contextFiles = (() => {
      const base = Array.isArray(files)
        ? files.filter((f) => typeof f === 'string' && f.trim())
        : [];
      const normalize = (f) => f.trim().replace(/^[/\\]+/, '');
      const tf = typeof bodyTargetFile === 'string' ? bodyTargetFile.trim() : '';
      if (
        mode === 'code'
        && tf
        && !base.some((f) => normalize(f) === normalize(tf))
        && existsSync(resolve(REPO_ROOT, normalize(tf)))
      ) {
        return [...base, tf];
      }
      return base;
    })();

    const { block: filesContentBlock, summaries: filesInjectSummaries } = await loadRepoFilesForBuilder(contextFiles, log);
    if (filesInjectSummaries.length) {
      log.info({ count: filesInjectSummaries.length, paths: filesInjectSummaries.map(s => s.path) }, '[BUILDER] Injected repo file bodies for files[]');
    }

    const routingKey =
      mode === 'code' && executionOnly && !model
        ? 'council.builder.code_execute'
        : `council.builder.${mode}`;

    // Model Escalation Gate — prompts/00-MODEL-ESCALATION-GATE.md
    const bodyEsc = req.body || {};
    const escalationRequested = Boolean(
      bodyEsc.escalate_to_model ||
      (model && !isCheaperModel(model) && (bodyEsc.cheaper_attempt_count >= 1 || bodyEsc.escalate_from_model)),
    );
    if (escalationRequested && pool?.query) {
      const escalationVerdict = evaluateModelEscalationGate({
        task_id: bodyEsc.task_id || task || routingKey,
        mission_id: bodyEsc.mission_id || bodyEsc.metadata_json?.mission_id || null,
        cheaper_model_used: bodyEsc.escalate_from_model || bodyEsc.cheaper_model_used || BUILDER_ROUTE_DEFAULT_MODEL,
        stronger_model_requested: bodyEsc.escalate_to_model || model || null,
        failure_reason: bodyEsc.escalation_failure_reason || bodyEsc.failure_reason || bodyEsc.blocker || 'reasoning_failure',
        value_categories: bodyEsc.value_categories || (bodyEsc.value_category ? [bodyEsc.value_category] : []),
        cheaper_attempt_count: Number(bodyEsc.cheaper_attempt_count) || (bodyEsc.escalate_from_model ? 1 : 0),
        http_status: bodyEsc.http_status || null,
        expected_outcome: bodyEsc.expected_outcome || null,
      });
      await writeModelEscalationReceipt(pool, escalationVerdict, {
        expected_outcome: bodyEsc.expected_outcome,
        actor: 'builder_dispatch',
      });
      if (!escalationVerdict.allowed) {
        return res.status(409).json({
          ok: false,
          error: 'model_escalation_denied',
          blocked_reason: escalationVerdict.blocked_reason,
          checks: escalationVerdict.checks,
          law: 'prompts/00-MODEL-ESCALATION-GATE.md',
        });
      }
    }

    const requestedModel = model || getModelForTask(routingKey) || BUILDER_ROUTE_DEFAULT_MODEL;
    const strictModelSelection =
      req.body?.strict_model === true ||
      req.body?.strictModel === true ||
      req.body?.allow_model_fallback === false;
    const rawCandidateModels = model ? [model] : getCandidateModelsForTask(routingKey);
    const routingPolicy = applyBuilderRoutingPolicy({
      candidateModels: rawCandidateModels,
      requestedModel,
      routingKey,
      mode,
      executionOnly,
      targetFile: bodyTargetFile || null,
    });
    const availability = filterAvailableCouncilMembers(routingPolicy.filteredCandidateModels);
    const candidateModels = availability.available;
    const unavailableCandidates = [
      ...availability.unavailable,
      ...routingPolicy.blockedCandidates.map((candidate) => ({ model: candidate, reason: 'builderos_policy_blocked' })),
    ];
    const preferredModel = availability.availabilityByModel[requestedModel]?.available
      ? requestedModel
      : (candidateModels[0] || null);

    if (pool?.query) {
      logShadowRoutingDecision(pool, {
        routingKey,
        targetFile: bodyTargetFile || null,
        taskClassBaseline: routingPolicy.taskClass,
        baselineModel: preferredModel || requestedModel || BUILDER_ROUTE_DEFAULT_MODEL,
        routingPolicy,
        operatorOverride: Boolean(model),
      }).catch((shadowErr) => {
        log.warn({ err: shadowErr?.message || shadowErr, routingKey }, '[BUILDER] TSOS shadow routing log failed (fail-open)');
      });
    }

    let routingRecommendation = {
      selectedModel: preferredModel,
      blockedCandidates: unavailableCandidates.map((row) => row.model),
      reason: preferredModel
        ? 'Using runtime-available routing map'
        : 'No runtime-available model is currently configured for this builder task',
    };
    if (model) {
      if (routingPolicy.requestedModelBlocked) {
        routingRecommendation = strictModelSelection || !preferredModel
          ? {
              selectedModel: null,
              blockedCandidates: unavailableCandidates.map((row) => row.model),
              reason: routingPolicy.reason,
            }
          : {
              selectedModel: preferredModel,
              blockedCandidates: unavailableCandidates.map((row) => row.model),
              reason: `${routingPolicy.reason}; fell back to runtime-available ${preferredModel}`,
            };
      } else if (availability.availabilityByModel[model]?.available) {
        routingRecommendation = {
          selectedModel: model,
          blockedCandidates: unavailableCandidates.map((row) => row.model),
          reason: `Using explicit model override: ${model}`,
        };
      } else {
        const unavailableReason = availability.availabilityByModel[model]?.reason || 'unknown_reason';
        routingRecommendation = strictModelSelection || !preferredModel
          ? {
              selectedModel: null,
              blockedCandidates: unavailableCandidates.map((row) => row.model),
              reason: `Explicit model override ${model} unavailable (${unavailableReason})`,
            }
          : {
              selectedModel: preferredModel,
              blockedCandidates: unavailableCandidates.map((row) => row.model),
              reason: `Explicit model override ${model} unavailable (${unavailableReason}); fell back to runtime-available ${preferredModel}`,
            };
      }
    } else if (memorySvc) {
      try {
        routingRecommendation = await memorySvc.getRoutingRecommendation({
          taskType: routingKey,
          proposedModel: preferredModel,
          candidateModels,
        });
        routingRecommendation.blockedCandidates = [
          ...(routingRecommendation.blockedCandidates || []),
          ...unavailableCandidates.map((row) => row.model),
        ];
        if (!routingRecommendation.selectedModel && unavailableCandidates.length) {
          routingRecommendation.reason = `No runtime-available authorized model for ${routingKey}; unavailable: ${unavailableCandidates.map((row) => `${row.model}(${row.reason})`).join(', ')}`;
        } else if (
          routingRecommendation.selectedModel &&
          requestedModel &&
          !availability.availabilityByModel[requestedModel]?.available
        ) {
          routingRecommendation.reason = `Static/requested model ${requestedModel} unavailable (${availability.availabilityByModel[requestedModel]?.reason}); selected ${routingRecommendation.selectedModel} instead`;
        }
      } catch (memoryErr) {
        log.warn({ err: memoryErr.message, routingKey }, '[BUILDER] Memory routing unavailable — falling back to static map');
        routingRecommendation.reason = preferredModel
          ? 'Memory routing unavailable; using runtime-available static routing map'
          : 'Memory routing unavailable and no runtime-available static model exists';
      }
    }
    if (
      routingRecommendation.selectedModel &&
      !candidateModels.includes(routingRecommendation.selectedModel)
    ) {
      const rejectedModel = routingRecommendation.selectedModel;
      const rejectedReason = availability.availabilityByModel[rejectedModel]?.reason || 'not_runtime_available';
      routingRecommendation = {
        ...routingRecommendation,
        selectedModel: preferredModel,
        blockedCandidates: [
          ...(routingRecommendation.blockedCandidates || []),
          rejectedModel,
        ],
        reason: preferredModel
          ? `Memory routing selected unavailable model ${rejectedModel} (${rejectedReason}); clamped to runtime-available ${preferredModel}`
          : `Memory routing selected unavailable model ${rejectedModel} (${rejectedReason}); no runtime-available authorized model remains`,
      };
    }
    const memberKey = routingRecommendation.selectedModel;
    if (!memberKey) {
      const gapRecommendation = await recordBuilderGap({
        domain,
        task,
        status: 'blocked',
        stage: 'routing',
        reason: routingRecommendation.reason || 'No authorized model is currently allowed for this builder task',
        targetFile: bodyTargetFile || null,
        routingKey,
        mode,
        executionOnly,
      });
      return res.status(409).json({
        ok: false,
        error: 'No authorized model is currently allowed for this builder task',
        routing_key: routingKey,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
        detail: routingRecommendation.reason,
        gap_recommendation: gapRecommendation,
      });
    }
    const cacheMember = `council_builder:${memberKey}`;

    const modeInstructions = {
      code:
        'Generate the complete implementation code. Output ONLY the code first — no explanation before the code block.\n' +
        'Then append a line containing exactly ---METADATA--- on its own line, followed by a single JSON object with keys: ' +
        '"target_file" (string or null), "insert_after_line" (number or null), "confidence" (0-1). No markdown fences around the JSON.',
      plan:
        'Generate a step-by-step implementation plan. Be specific about file names, function signatures, DB schema changes, and route endpoints. No code yet.\n' +
        'End with ---METADATA--- then JSON: {"target_file":null,"insert_after_line":null,"confidence":0.9}',
      review:
        'Review the provided code or diff. Identify bugs, missing edge cases, drift from the domain conventions, and anything that contradicts what the domain context says already exists.\n' +
        'End with ---METADATA--- then JSON: {"target_file":null,"insert_after_line":null,"confidence":0.9}',
    }[mode] || 'Generate the complete implementation code.';

    // Zone 3 additive-patch: request ONLY the new code, never a full-file rewrite.
    const additivePatch = additive_patch === true && mode === 'code';
    // Zone 3 edit-patch: request surgical find-and-replace edits so EXISTING
    // in-file logic can be modified without a full-file rewrite. Mutually
    // exclusive with additive (additive is forbidden from touching existing code).
    const editPatch = edit_patch === true && !additivePatch && mode === 'code';
    const effectiveModeInstructions = editPatch
      ? [
          'EDIT-PATCH MODE. The target file already exists and is too large to safely rewrite in full.',
          'Return ONLY a JSON array of surgical find-and-replace edits to the existing file.',
          'Format: [{"old_string":"<exact snippet copied VERBATIM from the file above, with enough surrounding context that it appears EXACTLY ONCE>","new_string":"<the replacement text>"}]',
          'Rules: copy old_string character-for-character from the file (same indentation and whitespace); each old_string MUST match exactly once; to delete code set new_string to "".',
          'Do NOT output the whole file. Do NOT include line numbers. Do NOT use markdown fences.',
          'Then append a line containing exactly ---METADATA--- followed by a single JSON object: {"target_file":null,"insert_after_line":null,"confidence":0.9}.',
        ].join('\n')
      : additivePatch
        ? [
          'ADDITIVE-PATCH MODE. The target file already exists and is too large to safely rewrite in full.',
          'Output ONLY the NEW code to ADD to it — new functions, exported helpers, or route handlers.',
          'Do NOT reproduce, restate, or modify ANY existing content of the file. Do NOT output the whole file.',
          'Do NOT repeat imports that already exist. If a NEW import is unavoidable, put it on its own line at the very top of your output prefixed with the exact marker: //__IMPORT__ ',
          'Then append a line containing exactly ---METADATA--- followed by a single JSON object: {"target_file":null,"insert_after_line":null,"confidence":0.9}. No markdown fences.',
        ].join('\n')
      : modeInstructions;

    const systemPrompt = [
      'You are a senior engineer working on the LifeOS platform.',
      'You write clean, production-quality Node.js/ESM code that follows existing patterns.',
      'You never rebuild what already exists. You extend what is there.',
      BUILDER_EPISTEMIC_LAWS,
      domainContext ? `\n--- DOMAIN CONTEXT (read this before writing anything) ---\n${domainContext}\n---` : '',
    ].filter(Boolean).join('\n');

    const autonomyInstructions = buildAutonomyInstructions({
      autonomyMode: String(autonomy_mode || 'max').toLowerCase(),
      internetResearch: internet_research !== false,
    });

    const htmlCodegenExtra =
      mode === 'code' && builderTargetsHtml(contextFiles, bodyTargetFile) ? `\n${htmlFullFileCodegenHints()}` : '';
    const jsCodegenExtra =
      mode === 'code' && !additivePatch && !editPatch && !builderTargetsHtml(contextFiles, bodyTargetFile) && builderTargetsJavaScript(contextFiles, bodyTargetFile)
        ? `\n${jsFullFileCodegenHints()}`
        : '';

    const executionModeBlock =
      mode === 'code' && executionOnly
        ? '\nEXECUTION MODE: The architecture is already decided. Implement the SPECIFICATION and file context literally; do not expand scope or redesign.'
        : '';

    const userPrompt = [
      `TASK: ${task}`,
      spec ? `\nSPECIFICATION:\n${spec}` : '',
      contextFiles?.length ? `\nRELEVANT FILE PATHS (also embedded below when readable): ${contextFiles.join(', ')}` : '',
      filesContentBlock
        ? `\nREPO FILE CONTENTS — authoritative; ${editPatch ? 'this is the EXISTING file you are EDITING — copy old_string excerpts VERBATIM from it and output only the JSON edit array' : additivePatch ? 'this is the EXISTING file you are ADDING to — do NOT reproduce or modify it, output only the new code to append' : 'produce a single full replacement for target_file when mode is code'}:\n${filesContentBlock}`
        : '',
      htmlCodegenExtra,
      jsCodegenExtra,
      executionModeBlock,
      `\nINSTRUCTION: ${effectiveModeInstructions}`,
      autonomyInstructions ? `\nAUTONOMY: ${autonomyInstructions}` : '',
    ].filter(Boolean).join('\n');

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    try {
      let cacheHit = false;
      if (useCache !== false && cacheGet) {
        const cached = await cacheGet(fullPrompt, cacheMember);
        if (cached) {
          cacheHit = true;
          const { output, placement } = splitBuilderOutput(cached);
          await insertBuilderAudit({
            domain,
            task,
            model_used: memberKey,
            rawOutput: cached,
            cache_hit: true,
            placement,
            status: 'generated',
            committed: false,
            routingKey,
            mode,
            executionOnly,
          });
          return res.json({
            ok: true,
            output,
            placement,
            model_used: memberKey,
            routing_key: routingKey,
            routing_task_class: routingPolicy.taskClass,
            routing_reason: routingRecommendation.reason,
            blocked_candidates: routingRecommendation.blockedCandidates || [],
            execution_only: executionOnly,
            domain_context_loaded: domainLoaded,
            domain,
            mode,
            cache_hit: true,
            ...(filesInjectSummaries.length ? { files_injected: filesInjectSummaries } : {}),
          });
        }
      }

      // For code/chat modes the default task-type caps (800 for chat, 1500 for codegen)
      // are too low for any real code generation. Builder tasks always need more room.
      // Use estimateBuilderMaxOutputTokens for code mode (file-context aware); for chat
      // mode targeting a source file, floor at 4096 so the model can complete functions.
      const estimatedMax = mode === 'code'
        ? estimateBuilderMaxOutputTokens(filesInjectSummaries, filesContentBlock, bodyTargetFile)
        : null;
      // Fallback when estimator returns null (no file context): HTML overlays still need enough room for real pages.
      const isHtmlTarget = /\.html$/i.test(String(bodyTargetFile || ''));
      const htmlFloor = Math.min(
        128_000,
        Math.max(8192, parseInt(process.env.BUILDER_HTML_MAX_OUTPUT_TOKENS_CAP || '65536', 10) || 65536),
      );
      const computedTokens =
        estimatedMax || (isHtmlTarget ? htmlFloor : bodyTargetFile || filesContentBlock ? 4096 : 2048);

      /** Supervisor knob: raises/lowers council completion budget without waiting for estimator deploy (same key auth as `/build`). */
      const rawSupervisorCap = req.body?.max_output_tokens ?? req.body?.maxOutputTokens;
      const supervisorCapParsed = typeof rawSupervisorCap === 'string' ? parseInt(rawSupervisorCap, 10) : Number(rawSupervisorCap);
      const maxOutputTokens =
        mode === 'code' &&
        typeof supervisorCapParsed === 'number' &&
        Number.isFinite(supervisorCapParsed) &&
        supervisorCapParsed > 0
          ? Math.min(128_000, Math.max(256, Math.floor(supervisorCapParsed)))
          : computedTokens;
      const result = await callCouncilMember(memberKey, fullPrompt, {
        useCache: false,
        allowModelDowngrade: false,
        taskType: mode === 'code' ? 'codegen' : mode,
        maxOutputTokens,
        requestId: req.body?.task_id || undefined,
        task_id: req.body?.task_id || undefined,
        product_lane: domain || 'builderos',
        source_route: '/api/v1/lifeos/builder/task',
      });
      const raw = typeof result === 'string' ? result : result?.content || result?.text || '';
      const { output, placement } = splitBuilderOutput(raw);

      if (useCache !== false && cacheSet && raw) {
        cacheSet(fullPrompt, cacheMember, raw, routingKey);
      }

      await insertBuilderAudit({
        domain,
        task,
        model_used: memberKey,
        rawOutput: raw,
        cache_hit: false,
        placement,
        status: 'generated',
        committed: false,
        routingKey,
        mode,
        executionOnly,
      });

      log.info({ domain, mode, memberKey, taskLength: task.length }, '[BUILDER] Task dispatched and completed');

      res.json({
        ok: true,
        output,
        placement,
        model_used: memberKey,
        routing_key: routingKey,
        routing_task_class: routingPolicy.taskClass,
        routing_reason: routingRecommendation.reason,
        blocked_candidates: routingRecommendation.blockedCandidates || [],
        execution_only: executionOnly,
        domain_context_loaded: domainLoaded,
        domain,
        mode,
        cache_hit: false,
        ...(filesInjectSummaries.length ? { files_injected: filesInjectSummaries } : {}),
        ...(mode === 'code'
          ? {
              max_output_tokens_requested: maxOutputTokens,
              ...(mode === 'code' &&
              typeof supervisorCapParsed === 'number' &&
              Number.isFinite(supervisorCapParsed) &&
              supervisorCapParsed > 0 &&
              maxOutputTokens === Math.min(128_000, Math.max(256, Math.floor(supervisorCapParsed)))
                ? { max_output_tokens_supervisor_override: true }
                : {}),
            }
          : {}),
      });
    } catch (err) {
      log.error({ err: err.message, domain, mode }, '[BUILDER] Task dispatch failed');
      if (err.code === 'PROMPT_TOO_LARGE') {
        await recordBuilderGap({
          domain,
          task,
          modelUsed: memberKey || 'system',
          status: 'failed',
          stage: 'dispatch',
          reason: err.message,
          targetFile: bodyTargetFile || null,
          routingKey,
          mode,
          executionOnly,
        });
        return res.status(413).json({
          ok: false,
          error: 'prompt_too_large',
          detail: err.message,
          hint: 'Remove files[] injection or shorten spec. This error is non-retryable with the same payload.',
        });
      }
      const gapRecommendation = await recordBuilderGap({
        domain,
        task,
        modelUsed: memberKey || 'system',
        status: 'failed',
        stage: 'dispatch',
        reason: err.message,
        targetFile: bodyTargetFile || null,
        routingKey,
        mode,
        executionOnly,
      });
      res.status(500).json({
        ok: false,
        error: 'Council call failed',
        detail: err.message,
        gap_recommendation: gapRecommendation,
      });
    }
  }

  async function reviewCode(req, res) {
    const { domain, code, question } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: 'code is required' });

    return dispatchTask(
      {
        body: {
          domain,
          task: question || 'Review this code for correctness, consistency with the domain, and any missing edge cases.',
          spec: code,
          mode: 'review',
        },
      },
      res
    );
  }

  function getModelMap(req, res) {
    const annotated = Object.entries(TASK_MODEL_MAP).map(([task, member]) => ({
      task,
      model: member || '(no AI needed)',
      is_free: true,
    }));
    res.json({ ok: true, routing: annotated, default_model: BUILDER_ROUTE_DEFAULT_MODEL });
  }

  function getLCLStats(req, res) {
    if (!lclMonitor) {
      return res.json({ ok: true, message: 'LCL monitor not initialized', stats: null });
    }
    const stats = lclMonitor.getStats();
    res.json({ ok: true, stats });
  }

  // ── POST /execute ─────────────────────────────────────────────────────────────
  // Apply pre-generated code to a file in the repo.
  // The Conductor (or system) reviewed the output from /task; this commits it.
  // Body: { output, target_file, commit_message?, branch? }
  // §2.11: This is the step that makes the SYSTEM the author, not the Conductor.

  async function executeOutput(req, res) {
    const { output, target_file, commit_message, branch, task: bodyTask, mission_id: bodyMissionId, additive_patch: additivePatchReq, edit_patch: editPatchReq } = req.body || {};
    if (!output) return res.status(400).json({ ok: false, error: 'output is required' });
    if (!target_file) return res.status(400).json({ ok: false, error: 'target_file is required' });

    const fpV2Gate = await enforceBeforeBuilderDispatch({
      task: bodyTask || `commit ${target_file}`,
      missionId: bodyMissionId,
      pool,
      callAI: callCouncilMember,
      confirmIntent: req.body?.confirm_intent === true,
      platformGapFill: req.body?.platform_gap_fill === true,
      platformGapFillReason: req.body?.platform_gap_fill_reason,
    });
    if (!fpV2Gate.execute_cleared) {
      return res.status(422).json({
        ok: false,
        error: 'BLOCKED_FOUNDER_PACKET_V2',
        violations: fpV2Gate.violations,
        detail: formatUnifiedGateBlockSummary(fpV2Gate),
        committed: false,
      });
    }

    if (typeof commitToGitHub !== 'function') {
      const gapRecommendation = await recordBuilderGap({
        domain: null,
        task: `execute: ${target_file}`,
        status: 'blocked',
        stage: 'commit',
        reason: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        targetFile: target_file,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      return res.status(503).json({
        ok: false,
        error: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        gap_recommendation: gapRecommendation,
      });
    }

    // Zone 3 edit-patch: the caller asked /task for surgical find-and-replace
    // edits (JSON array) so EXISTING in-file logic can be modified without a
    // full-file rewrite. Apply them deterministically here — BEFORE any JS
    // extraction (which would mangle the JSON) and before validation/commit — so
    // the rest of the file is preserved byte-for-byte. Mirrors the /build route.
    let cleanedOutput = output;
    const editPatchActive =
      editPatchReq === true
      && additivePatchReq !== true
      && /\.(js|mjs)$/i.test(target_file)
      && (() => {
        const abs = resolve(REPO_ROOT, target_file);
        return existsSync(abs) && classifyBuildTarget(abs).zone === 3;
      })();
    if (editPatchActive) {
      const absEditTarget = resolve(REPO_ROOT, target_file);
      const applied = applyTargetedEdits(absEditTarget, output);
      if (!applied.ok) {
        const gapRecommendation = await recordBuilderGap({
          domain: null,
          task: `execute: ${target_file}`,
          modelUsed: 'system',
          rawOutput: output,
          status: 'failed',
          stage: 'edit_patch',
          reason: `edit-patch failed — ${applied.reason}`,
          targetFile: target_file,
          routingKey: 'council.builder.execute',
          mode: 'execute',
        });
        return res.status(422).json({
          ok: false,
          committed: false,
          error: `Zone 3 edit-patch failed — ${applied.reason}`,
          target_file,
          gap_recommendation: gapRecommendation,
        });
      }
      log.info(
        { target_file, editsApplied: applied.editsApplied },
        '[BUILDER] /execute Zone 3 edit-patch: applied surgical edits to existing file',
      );
      cleanedOutput = applied.content;
    } else if (/\.html$/i.test(target_file)) {
      // For HTML targets: strip any markdown preamble the model wrote before <!DOCTYPE / <html
      const extracted = extractHtmlFromOutput(output);
      if (extracted !== output) {
        log.info({ target_file, stripped: output.length - extracted.length }, '[BUILDER] /execute: Stripped markdown preamble from HTML output');
        cleanedOutput = extracted;
      }
    } else if (/\.(js|mjs|cjs)$/i.test(target_file)) {
      const extracted = extractJavaScriptFromOutput(output);
      const fixed = fixAsteriskShorthandParams(extracted);
      if (fixed !== output) {
        log.info(
          { target_file, stripped: output.length - fixed.length },
          '[BUILDER] /execute: Stripped HTML/markdown wrapper and asterisk params from JS output',
        );
        cleanedOutput = fixed;
      }
    } else if (/\.(css|scss|sass|less)$/i.test(target_file)) {
      // Strip markdown fences and prose preamble — models wrap CSS in ```css blocks
      const stripped = extractCssFromOutput(output);
      if (stripped !== output) {
        log.info({ target_file, stripped: output.length - stripped.length }, '[BUILDER] /execute: Stripped markdown fence from CSS output');
        cleanedOutput = stripped;
      }
    }
    // Zone 3 additive-patch: the caller (e.g. the founder chat build loop) asked
    // /task for an additive-only snippet; splice it into the existing large file
    // here — BEFORE validation/syntax/commit — so a >150-line file is never
    // full-file rewritten through this path. Mirrors the governed /build route.
    if (additivePatchReq === true && /\.(js|mjs)$/i.test(target_file)) {
      const absAdditiveTarget = resolve(REPO_ROOT, target_file);
      const zoneMeta = classifyBuildTarget(absAdditiveTarget);
      if (zoneMeta.zone === 3 && existsSync(absAdditiveTarget)) {
        const spliced = spliceAdditiveSnippet(absAdditiveTarget, cleanedOutput);
        if (!spliced.ok) {
          const gapRecommendation = await recordBuilderGap({
            domain: null,
            task: `execute: ${target_file}`,
            modelUsed: 'system',
            rawOutput: output,
            status: 'failed',
            stage: 'additive_patch',
            reason: `additive-patch splice failed — ${spliced.reason}`,
            targetFile: target_file,
            routingKey: 'council.builder.execute',
            mode: 'execute',
          });
          return res.status(422).json({
            ok: false,
            committed: false,
            error: `Zone 3 additive-patch failed — ${spliced.reason}`,
            target_file,
            gap_recommendation: gapRecommendation,
          });
        }
        log.info(
          { target_file, originalLines: zoneMeta.lineCount, mergedLines: spliced.mergedLines },
          '[BUILDER] /execute Zone 3 additive-patch: spliced new code into existing file',
        );
        cleanedOutput = spliced.content;
      }
    }

    const validationError = validateGeneratedOutputForTarget(target_file, cleanedOutput);
    if (validationError) {
      const gapRecommendation = await recordBuilderGap({
        domain: null,
        task: `execute: ${target_file}`,
        modelUsed: 'system',
        rawOutput: output,
        status: 'failed',
        stage: 'validation',
        reason: validationError,
        targetFile: target_file,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      return res.status(422).json({ ok: false, error: validationError, committed: false, target_file, gap_recommendation: gapRecommendation });
    }

    if (/\.(js|mjs|cjs)$/i.test(target_file)) {
      const chk = await verifyGeneratedJavaScriptWithNodeCheck(cleanedOutput, target_file);
      if (!chk.ok) {
        const syntaxError = chk.error || 'syntax error';
        const gapRecommendation = await recordBuilderGap({
          domain: null,
          task: `execute: ${target_file}`,
          modelUsed: 'system',
          rawOutput: output,
          status: 'failed',
          stage: 'syntax',
          reason: syntaxError,
          targetFile: target_file,
          routingKey: 'council.builder.execute',
          mode: 'execute',
        });
        return res.status(422).json({
          ok: false,
          error: 'Pre-commit syntax check failed — commit blocked',
          syntax_error: syntaxError,
          committed: false,
          target_file,
          gap_recommendation: gapRecommendation,
        });
      }
    } else if (/\.sql$/i.test(target_file)) {
      // The founder chat build loop reaches commit through this single /execute
      // path, so it needs the same .sql truncation gate that /build and
      // executeBatch run — otherwise a chat-driven truncated migration commits
      // unchecked (it would only fail loudly at boot-apply).
      const sqlCheck = validateSqlMigrationContent(cleanedOutput);
      if (!sqlCheck.ok) {
        const gapRecommendation = await recordBuilderGap({
          domain: null,
          task: `execute: ${target_file}`,
          modelUsed: 'system',
          rawOutput: output,
          status: 'failed',
          stage: 'sql_validation',
          reason: sqlCheck.error,
          targetFile: target_file,
          routingKey: 'council.builder.execute',
          mode: 'execute',
        });
        return res.status(422).json({
          ok: false,
          error: `SQL migration validation failed: ${sqlCheck.error}`,
          committed: false,
          target_file,
          gap_recommendation: gapRecommendation,
        });
      }
    }

    const msg = commit_message || `[system-build] ${target_file}`;
    try {
      const commitResult = await commitOrMirrorFiles(
        [{ path: target_file, content: cleanedOutput }],
        msg,
        branch,
      );
      const commitSha = commitResult?.sha || null;
      log.info(
        { target_file, msg, sha: commitSha, commit_mode: commitResult?.commit_mode || 'github' },
        '[BUILDER] /execute committed file',
      );
      await insertBuilderAudit({
        domain: null,
        task: `execute: ${target_file}`,
        model_used: 'system',
        rawOutput: cleanedOutput,
        cache_hit: false,
        placement: { target_file },
        status: 'committed',
        committed: true,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      res.json({
        ok: true,
        committed: true,
        target_file,
        commit_message: msg,
        sha: commitSha,
        commit_sha: commitSha,
        commit_mode: commitResult?.commit_mode || 'github',
        local_only: commitResult?.local_only === true,
        warning: commitResult?.warning || null,
      });
    } catch (err) {
      log.error({ err: err.message, target_file }, '[BUILDER] /execute commit failed');
      const gapRecommendation = await recordBuilderGap({
        domain: null,
        task: `execute: ${target_file}`,
        modelUsed: 'system',
        rawOutput: output,
        status: 'failed',
        stage: 'commit',
        reason: err.message,
        targetFile: target_file,
        routingKey: 'council.builder.execute',
        mode: 'execute',
      });
      res.status(500).json({ ok: false, error: err.message, gap_recommendation: gapRecommendation });
    }
  }

  async function executeBatch(req, res) {
    const { files, commit_message, branch } = req.body || {};
    if (!Array.isArray(files) || !files.length) {
      return res.status(400).json({ ok: false, error: 'files[] is required' });
    }
    const cleaned = [];
    for (const file of files) {
      const target_file = String(file?.target_file || file?.path || '').trim();
      let output = file?.output ?? file?.content ?? '';
      if (!target_file || !output) {
        return res.status(400).json({ ok: false, error: 'Each file requires target_file and output' });
      }

      if (/\.html$/i.test(target_file)) {
        const extracted = extractHtmlFromOutput(output);
        if (extracted !== output) output = extracted;
      } else if (/\.(js|mjs|cjs)$/i.test(target_file)) {
        output = fixAsteriskShorthandParams(extractJavaScriptFromOutput(output));
      } else if (/\.(css|scss|sass|less)$/i.test(target_file)) {
        output = extractCssFromOutput(output);
      }

      const validationError = validateGeneratedOutputForTarget(target_file, output);
      if (validationError) {
        return res.status(422).json({
          ok: false,
          error: validationError,
          committed: false,
          target_file,
          failed_file: target_file,
        });
      }

      // Truncation gates — the batch path must be as strict as single-file
      // /execute: run the real syntax/completeness check per target type so a
      // truncated JS or SQL file can never slip through a batch commit (in
      // local-mirror mode nothing downstream re-checks, and commitManyToGitHub
      // only node --checks JS, never SQL).
      if (/\.(js|mjs|cjs)$/i.test(target_file)) {
        const chk = await verifyGeneratedJavaScriptWithNodeCheck(output, target_file);
        if (!chk.ok) {
          return res.status(422).json({
            ok: false,
            committed: false,
            error: `Pre-commit syntax check failed: ${chk.error}`,
            target_file,
            failed_file: target_file,
          });
        }
      } else if (/\.sql$/i.test(target_file)) {
        const sqlCheck = validateSqlMigrationContent(output);
        if (!sqlCheck.ok) {
          return res.status(422).json({
            ok: false,
            committed: false,
            error: `SQL migration validation failed: ${sqlCheck.error}`,
            target_file,
            failed_file: target_file,
          });
        }
      }
      cleaned.push({ target_file, output });
    }

    const msg = commit_message || `[system-build] batch ${cleaned.length} files`;
    try {
      const commitResult = await commitOrMirrorFiles(
        cleaned.map((f) => ({ path: f.target_file, content: f.output })),
        msg,
        branch,
      );
      const commitSha = commitResult?.sha || null;
      const committed_files = cleaned.map((f) => f.target_file);
      for (const file of cleaned) {
        await insertBuilderAudit({
          domain: null,
          task: `execute-batch: ${file.target_file}`,
          model_used: 'system',
          rawOutput: file.output,
          cache_hit: false,
          placement: { target_file: file.target_file },
          status: 'committed',
          committed: true,
          routingKey: 'council.builder.execute_batch',
          mode: 'execute',
        });
      }
      return res.json({
        ok: true,
        committed: true,
        batch: true,
        target_file: committed_files.join(', '),
        committed_files,
        // Honesty signal: git-verified list of files this commit ACTUALLY changed,
        // and any requested targets that did NOT change (a no-op false claim risk).
        changed_files: commitResult?.changed_files ?? null,
        unchanged_files: commitResult?.unchanged_files ?? null,
        commit_message: msg,
        sha: commitSha,
        commit_sha: commitSha,
        commit_mode: commitResult?.commit_mode || 'github',
        local_only: commitResult?.local_only === true,
        warning: commitResult?.warning || null,
      });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] /execute-batch commit failed');
      return res.status(500).json({ ok: false, error: err.message, committed: false });
    }
  }

  // ── Route auto-wiring ─────────────────────────────────────────────────────────
  // Called after /build successfully commits a routes/lifeos-*-routes.js file.
  // Reads startup/register-runtime-routes.js from GitHub, adds import + app.use(), commits.
  // This makes the builder self-sufficient — no Conductor needed to wire routes manually.
function deriveRouteMountPath(routeFilePath, override = null) {
  if (override) return override;
  const base = String(routeFilePath || '')
    .replace(/^routes\//, '')
    .replace(/-routes\.js$/, '');
  if (base.startsWith('lifeos-')) {
    return `/api/v1/lifeos/${base.replace(/^lifeos-/, '')}`;
  }
  return `/api/v1/${base}`;
}

function isProductRoutesFile(routeFilePath) {
  return /^routes\/[a-z0-9-]+-routes\.js$/i.test(String(routeFilePath || ''));
}

function buildRouteMountCall(exportName, routeFileContent, mountPath) {
  const returnsRouter = /return\s+router\s*;/.test(routeFileContent);
  const usesAppCtx = /export\s+(?:async\s+)?function\s+\w+\s*\(\sapp\s*,\sctx\s*\)/.test(routeFileContent);
  const isMountStyle = exportName.startsWith('mount');
  const label = mountPath.split('/').filter(Boolean).pop()?.replace(/-/g, '_').toUpperCase() || 'ROUTES';

  if (isMountStyle) {
    return `  ${exportName}(app, { pool });\n  logger.info('✅ [${label}] Routes mounted at ${mountPath}');\n`;
  }
  if (usesAppCtx && returnsRouter) {
    return `  app.use("${mountPath}", ${exportName}(app, { pool, requireKey: requireUserOrKey, rk: requireUserOrKey, logger }));\n  logger.info('✅ [${label}] Routes mounted at ${mountPath}');\n`;
  }
  if (usesAppCtx) {
    return `  ${exportName}(app, { pool, requireKey: requireUserOrKey, callCouncilMember, logger });\n  logger.info('✅ [${label}] Routes registered via ${exportName}');\n`;
  }
  return `  app.use("${mountPath}", ${exportName}({ pool, requireKey: requireUserOrKey, logger }));\n  logger.info('✅ [${label}] Routes mounted at ${mountPath}');\n`;
}

async function fetchGitHubFileContent(filePath, { token, owner, repoName, branch }) {
  const getRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, 'Cache-Control': 'no-cache' } },
  );
  if (!getRes.ok) return { ok: false, reason: `could not read ${filePath}: HTTP ${getRes.status}` };
  const fileData = await getRes.json();
  return { ok: true, content: Buffer.from(fileData.content, 'base64').toString('utf8') };
}

  async function autoWireRoute(routeFilePath, routeFileContent, mountPathOverride) {
    const REGISTER_PATH = 'startup/register-runtime-routes.js';
    const token = process.env.GITHUB_TOKEN?.trim();
    const repo = process.env.GITHUB_REPO;
    if (!token || !repo) return { ok: false, reason: 'GITHUB_TOKEN or GITHUB_REPO not set' };
    const [owner, repoName] = repo.split('/');
    const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';

    // Extract export name from the committed route file content
    const exportMatch = routeFileContent.match(/export\s+(?:async\s+)?function\s+(create\w+|mount\w+)\s*\(/);
    if (!exportMatch) return { ok: false, reason: 'no export function found in route file' };
    const exportName = exportMatch[1];

    // Read current register-runtime-routes.js from GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/${REGISTER_PATH}?ref=${branch}`,
      { headers: { Authorization: `token ${token}`, 'Cache-Control': 'no-cache' } }
    );
    if (!getRes.ok) return { ok: false, reason: `could not read ${REGISTER_PATH}: HTTP ${getRes.status}` };
    const fileData = await getRes.json();
    let current = Buffer.from(fileData.content, 'base64').toString('utf8');

    const mountPath = deriveRouteMountPath(routeFilePath, mountPathOverride);
    const mountCall = buildRouteMountCall(exportName, routeFileContent, mountPath);
    const mountLine = mountCall.split('\n')[0].trim();
    const mountLineRe = new RegExp(
      `app\\.use\\("${mountPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}",[^;]+;\\)`,
    );

    // Already wired — refresh mount call if route factory signature changed
    if (current.includes(exportName)) {
      const existingMount = current.match(mountLineRe);
      if (existingMount && existingMount[0] !== mountLine) {
        current = current.replace(mountLineRe, mountLine);
        await commitToGitHub(
          REGISTER_PATH,
          current,
          `[system-build] remount ${exportName} at ${mountPath}`,
          branch,
          { allowRouteRegistration: true },
        );
        const mirrorReg = await mirrorCommittedContentToRepoRoot(REGISTER_PATH, current);
        if (!mirrorReg.ok) {
          log.warn(
            { path: REGISTER_PATH, reason: mirrorReg.reason },
            '[BUILDER] Runtime repo mirror failed after autoWireRoute remount',
          );
        }
        return { ok: true, exportName, mountPath, committed: true, remounted: true };
      }
      return { ok: true, reason: 'already wired', skipped: true };
    }

    const label = mountPath.split('/').filter(Boolean).pop()?.replace(/-/g, '_').toUpperCase() || 'ROUTES';

    // Build import line
    const importLine = `import { ${exportName} } from "../${routeFilePath}";\n`;

    // Insert import: before `export async function registerRuntimeRoutes`
    const fnStart = current.indexOf('export async function registerRuntimeRoutes');
    if (fnStart === -1) return { ok: false, reason: 'could not find registerRuntimeRoutes in file' };
    current = current.slice(0, fnStart) + importLine + current.slice(fnStart);

    // Insert mount: just before the Memory Intelligence mount (last reliable anchor before return)
    const memAnchor = "  // Memory Intelligence";
    const anchorIdx = current.indexOf(memAnchor);
    const insertAt = anchorIdx !== -1 ? anchorIdx : current.lastIndexOf('  return {');
    if (insertAt === -1) return { ok: false, reason: 'could not find insertion anchor in file' };
    current = current.slice(0, insertAt) + mountCall + '\n' + current.slice(insertAt);

    // Commit updated file
    await commitToGitHub(
      REGISTER_PATH,
      current,
      `[system-build] wire ${exportName} to register-runtime-routes.js`,
      branch,
      { allowRouteRegistration: true },
    );
    const mirrorReg = await mirrorCommittedContentToRepoRoot(REGISTER_PATH, current);
    if (!mirrorReg.ok) {
      log.warn(
        { path: REGISTER_PATH, reason: mirrorReg.reason },
        '[BUILDER] Runtime repo mirror failed after autoWireRoute — chained files[] seeing register-runtime-routes.js may lag until redeploy',
      );
    }
    return { ok: true, exportName, mountPath, committed: true };
  }

  async function wireRouteFromGitHub(req, res) {
    const { target_file: targetFile, mount_path: mountPathOverride } = req.body || {};
    if (!targetFile) {
      return res.status(400).json({ ok: false, error: 'target_file is required' });
    }
    if (!isProductRoutesFile(targetFile)) {
      return res.status(422).json({ ok: false, error: 'target_file must match routes/*-routes.js' });
    }
    const token = process.env.GITHUB_TOKEN?.trim();
    const repo = process.env.GITHUB_REPO;
    if (!token || !repo) {
      return res.status(503).json({ ok: false, error: 'GITHUB_TOKEN or GITHUB_REPO not set' });
    }
    const [owner, repoName] = repo.split('/');
    const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
    const fetched = await fetchGitHubFileContent(targetFile, { token, owner, repoName, branch });
    if (!fetched.ok) {
      return res.status(422).json({ ok: false, error: fetched.reason });
    }
    try {
      const routeWired = await autoWireRoute(targetFile, fetched.content, mountPathOverride || null);
      return res.json({ ok: routeWired?.ok === true, route_wired: routeWired, target_file: targetFile });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message, target_file: targetFile });
    }
  }

  // ── POST /build ───────────────────────────────────────────────────────────────
  // Full §2.11-compliant autonomous flow: generate code → commit to GitHub → Railway deploys.
  // Body: same as /task PLUS target_file (required if not in placement metadata) + commit_message?
  //       mount_path? — override auto-detected mount path for route auto-wiring
  // Returns: { ok, output, target_file, committed, model_used, route_wired? }

  async function buildAndCommit(req, res) {
    const { target_file, commit_message, branch, mount_path, release_mode, ...taskBody } = req.body || {};
    const releaseMode = release_mode || DEFAULT_BUILDER_MODE;

    if (!taskBody.task) {
      return res.status(400).json({ ok: false, error: 'task is required' });
    }

    let intakeClearance = null;
    if (taskBody.blueprint_intake_session_id && target_file) {
      intakeClearance = await verifyIntakeSessionBuildClearance(
        pool,
        taskBody.blueprint_intake_session_id,
        target_file,
        taskBody.blueprint_step_id || null,
      );
      if (!intakeClearance.ok) {
        return res.status(422).json({
          ok: false,
          error: 'INTAKE_BLUEPRINT_CLEARANCE_DENIED',
          detail: intakeClearance,
          committed: false,
        });
      }
    }

    const fpV2Gate = await enforceBeforeBuilderDispatch({
      task: taskBody.task,
      missionId: taskBody.mission_id,
      pool,
      callAI: callCouncilMember,
      confirmIntent: taskBody.confirm_intent === true,
      platformGapFill: taskBody.platform_gap_fill === true,
      platformGapFillReason: taskBody.platform_gap_fill_reason,
      intakeSessionClearance: intakeClearance,
    });
    if (!fpV2Gate.execute_cleared) {
      return res.status(422).json({
        ok: false,
        error: 'BLOCKED_FOUNDER_PACKET_V2',
        violations: fpV2Gate.violations,
        detail: formatUnifiedGateBlockSummary(fpV2Gate),
        committed: false,
      });
    }

    // Spec contamination gate — reject specs that contain raw HTML/code from a prior build output.
    // Root cause: operators copy a previous /build response body and paste it into spec, causing the
    // council to "re-generate" its own output rather than fresh code from requirements.
    const specRaw = String(taskBody.spec || '');
    if (specRaw.length > 200) {
      const specTrim = specRaw.trimStart();
      const hasHtmlDoc = /<!doctype\s+html/i.test(specRaw) || (/<html[\s>]/i.test(specRaw) && /<\/html>/i.test(specRaw));
      const isCodeDump = /^(?:import |export |const |function |\{\s*\n)/.test(specTrim) && specRaw.length > 1200;
      if (hasHtmlDoc || (specTrim.startsWith('<') && specRaw.length > 800) || isCodeDump) {
        return res.status(400).json({
          ok: false,
          error: 'spec_contamination: spec field contains raw HTML or generated code rather than plain-language requirements',
          hint: 'The spec field should describe WHAT to build (requirements + constraints), not contain generated code. Previous build output was likely pasted into spec — strip it down to the requirements text.',
          committed: false,
        });
      }
    }

    const executionTier = String(
      taskBody.metadata?.execution_tier || taskBody.execution_tier || 'LOAD_BEARING',
    ).toUpperCase();

    if (typeof commitToGitHub !== 'function') {
      const gapRecommendation = await recordBuilderGap({
        domain: taskBody.domain || null,
        task: taskBody.task,
        status: 'blocked',
        stage: 'commit',
        reason: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        targetFile: target_file || null,
        routingKey: 'council.builder.code',
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      return res.status(503).json({
        ok: false,
        error: 'commitToGitHub not available — GITHUB_TOKEN may be missing',
        gap_recommendation: gapRecommendation,
      });
    }

    if (!target_file || !String(target_file).trim()) {
      const gapRecommendation = await recordBuilderGap({
        domain: taskBody.domain || null,
        task: taskBody.task,
        status: 'needs_target',
        stage: 'placement',
        reason: 'target_file is required for POST /build — pass explicit target_file before generation',
        routingKey: 'council.builder.code',
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      return res.status(422).json({
        ok: false,
        error: 'target_file is required for POST /build',
        committed: false,
        gap_recommendation: gapRecommendation,
      });
    }

    if (!isSafeTarget(target_file)) {
      return respondSafeScopeBlocked(res, { resolvedTarget: target_file, taskBody });
    }

    let deliberationSessionId = null;
    if (executionTier !== 'MECHANICAL') {
      try {
        const delibSeed = await seedBuilderDeliberation(pool, taskBody, log);
        if (!delibSeed.ok && !delibSeed.skipped) {
          return res.status(422).json({
            ok: false,
            error: 'deliberation_gate_fail',
            violations: delibSeed.violations || delibSeed.errors,
            deliberation_session_id: delibSeed.session_id,
            committed: false,
          });
        }
        deliberationSessionId = delibSeed.session_id || null;
      } catch (delibErr) {
        log.error({ err: delibErr.message }, '[BUILDER] deliberation seed failed — fail-closed');
        return res.status(422).json({
          ok: false,
          error: 'deliberation_seed_failed',
          detail: delibErr.message,
          committed: false,
        });
      }
    }

    // ── Zone 3 additive-patch mode ──────────────────────────────────────────
    // Files above the Zone 3 line threshold cannot be safely full-file rewritten
    // (a truncated model output silently stubs the file). Rather than hard-block
    // every large target — which left almost every real production file
    // un-buildable — request ONLY the new code and deterministically splice it
    // into the existing file. Existing content is preserved verbatim (no stub
    // risk) and the SAME in-scope target is committed, so the blueprint scope
    // gate still applies. Covers "add a new export/function/route"; modifying
    // existing in-file logic still requires full-file mode.
    const zoneEarly = classifyBuildTarget(resolve(REPO_ROOT, target_file));
    const isZone3ExistingJs =
      (taskBody.mode || 'code') === 'code'
      && /\.(js|mjs)$/.test(target_file)
      && zoneEarly.zone === 3
      && !taskBody.blueprint_intake_session_id
      && existsSync(resolve(REPO_ROOT, target_file));
    // A Zone 3 request that wants to MODIFY existing in-file logic (change /
    // replace / rename / remove) can't be served by additive mode (which is
    // forbidden from touching existing content) — route it to surgical
    // edit-patch instead. Pure "add new code" requests stay on additive.
    const editPatchActive = isZone3ExistingJs && classifyPatchIntent(taskBody.task) === 'edit';
    const additivePatchActive = isZone3ExistingJs && !editPatchActive;
    if (editPatchActive) {
      log.info({ target_file, lineCount: zoneEarly.lineCount }, '[BUILDER] Zone 3 target — using edit-patch mode (surgical find-and-replace, preserve rest of file)');
    } else if (additivePatchActive) {
      log.info({ target_file, lineCount: zoneEarly.lineCount }, '[BUILDER] Zone 3 target — using additive-patch mode (splice new code, preserve existing)');
    }

    // Step 1: Generate via council (reuse dispatchTask logic inline)
    let generatedOutput, placement, model_used, domain_context_loaded, domain, routing_key;
    try {
      // Capture the response by calling dispatchTask via a mock response collector
      let captured = null;
      const mockRes = {
        status(code) { return { json(data) { captured = { code, data }; } }; },
        json(data) { captured = { code: 200, data }; },
      };
      // /build must NEVER use cache — every build call needs fresh generation for its spec.
      await dispatchTask({ body: { ...taskBody, target_file, mode: taskBody.mode || 'code', useCache: false, additive_patch: additivePatchActive, edit_patch: editPatchActive } }, mockRes);

      if (!captured || captured.code !== 200 || !captured.data?.ok) {
        const errMsg = captured?.data?.error || 'Council call failed';
        const detail = captured?.data?.detail;
        const httpStatus = typeof captured?.code === 'number' && captured.code >= 400 && captured.code < 600 ? captured.code : 500;
        return res.status(httpStatus).json({
          ok: false,
          error: errMsg,
          ...(detail ? { detail } : {}),
          ...(captured?.data?.gap_recommendation ? { gap_recommendation: captured.data.gap_recommendation } : {}),
        });
      }
      generatedOutput = captured.data.output;
      placement = captured.data.placement;
      model_used = captured.data.model_used;
      routing_key = captured.data.routing_key;
      domain_context_loaded = captured.data.domain_context_loaded;
      domain = captured.data.domain;

      if (!String(generatedOutput || '').trim() && taskBody.execution_only === true) {
        log.warn({ target_file }, '[BUILDER] code_execute returned empty — retry with openai_builder_standard');
        captured = null;
        await dispatchTask({
          body: {
            ...taskBody,
            target_file,
            mode: taskBody.mode || 'code',
            useCache: false,
            execution_only: false,
            model: BUILDER_ROUTE_STANDARD_MODEL,
          },
        }, mockRes);
        if (captured?.code === 200 && captured.data?.ok && captured.data.output) {
          generatedOutput = captured.data.output;
          placement = captured.data.placement;
          model_used = captured.data.model_used;
          routing_key = captured.data.routing_key;
          domain_context_loaded = captured.data.domain_context_loaded;
          domain = captured.data.domain;
        }
      }
    } catch (err) {
      const gapRecommendation = await recordBuilderGap({
        domain: taskBody.domain || null,
        task: taskBody.task,
        status: 'failed',
        stage: 'dispatch',
        reason: err.message,
        targetFile: target_file || null,
        routingKey: 'council.builder.code',
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      return res.status(500).json({
        ok: false,
        error: `Generation failed: ${err.message}`,
        gap_recommendation: gapRecommendation,
      });
    }

    // Step 2: Resolve target file
    const resolvedTarget = target_file || placement?.target_file;
    if (!resolvedTarget) {
      const gapRecommendation = await recordBuilderGap({
        domain,
        task: taskBody.task,
        modelUsed: model_used,
        rawOutput: generatedOutput,
        status: 'needs_target',
        stage: 'placement',
        reason: 'target_file not in placement metadata and not provided',
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
        placement,
      });
      // Return output without committing — caller must supply target_file
      return res.status(422).json({
        ok: false,
        error: 'target_file not in placement metadata and not provided',
        output: generatedOutput,
        placement,
        model_used,
        domain_context_loaded,
        domain,
        committed: false,
        note: 'target_file not in placement metadata and not provided — pass target_file to commit',
        gap_recommendation: gapRecommendation,
      });
    }

    const blueprintGate = checkBuildBlueprintGate({
      target_file: resolvedTarget,
      blueprint_path: taskBody.blueprint_path,
      blueprint_id: taskBody.blueprint_id,
      mission_id: taskBody.mission_id,
      platform_gap_fill: taskBody.platform_gap_fill === true,
      platform_gap_fill_reason: taskBody.platform_gap_fill_reason,
      blueprint_json: intakeClearance?.blueprint || null,
      intake_session_id: taskBody.blueprint_intake_session_id || null,
    });
    if (!blueprintGate.ok) {
      return res.status(422).json({
        ok: false,
        error: blueprintGate.error,
        hint: blueprintGate.hint,
        blueprint_path: blueprintGate.blueprint_path || null,
        target_file: resolvedTarget,
        committed: false,
      });
    }

    // Step 3: Commit
    // For HTML targets: strip any markdown preamble the model wrote before <!DOCTYPE / <html
    if (/\.html$/i.test(resolvedTarget)) {
      const extracted = extractHtmlFromOutput(generatedOutput);
      if (extracted !== generatedOutput) {
        log.info({ resolvedTarget, stripped: generatedOutput.length - extracted.length }, '[BUILDER] Stripped markdown preamble from HTML output');
        generatedOutput = extracted;
      }
    }
    if (!editPatchActive && /\.(js|mjs|cjs)$/i.test(resolvedTarget)) {
      const extractedJs = normalizeBuilderCodegenOutput(extractJavaScriptFromOutput(generatedOutput));
      if (extractedJs !== generatedOutput) {
        log.info(
          { resolvedTarget, stripped: generatedOutput.length - extractedJs.length },
          '[BUILDER] Stripped HTML/markdown wrapper and asterisk params from JS output before syntax gate',
        );
        generatedOutput = extractedJs;
      }
    }
    if (/\.(css|scss|sass|less)$/i.test(resolvedTarget)) {
      const extractedCss = extractCssFromOutput(generatedOutput);
      if (extractedCss !== generatedOutput) {
        log.info({ resolvedTarget, stripped: generatedOutput.length - extractedCss.length }, '[BUILDER] Stripped markdown fence from CSS output before commit');
        generatedOutput = extractedCss;
      }
    }
    // Zone 3 edit-patch: apply the model's surgical find-and-replace edits to the
    // existing file BEFORE any validation/syntax/governance gate, so every gate
    // runs on the full edited file (the rest preserved byte-for-byte).
    if (editPatchActive) {
      const applied = applyTargetedEdits(resolve(REPO_ROOT, resolvedTarget), generatedOutput);
      if (!applied.ok) {
        const gapRecommendation = await recordBuilderGap({
          domain, task: taskBody.task, modelUsed: model_used, rawOutput: generatedOutput,
          status: 'failed', stage: 'edit_patch', reason: `edit-patch failed — ${applied.reason}`,
          targetFile: resolvedTarget, routingKey: routing_key, mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true, placement,
        });
        return res.status(422).json({
          ok: false, committed: false, error: `Zone 3 edit-patch failed — ${applied.reason}`,
          target_file: resolvedTarget, output: generatedOutput, gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget, editsApplied: applied.editsApplied }, '[BUILDER] Zone 3 edit-patch: applied surgical edits to existing file');
      generatedOutput = applied.content;
    }
    // Zone 3 additive-patch: splice the generated snippet into the existing file
    // BEFORE any validation/syntax/governance gate, so every gate runs on the
    // full merged file (existing content preserved verbatim).
    if (additivePatchActive) {
      const spliced = spliceAdditiveSnippet(resolve(REPO_ROOT, resolvedTarget), generatedOutput);
      if (!spliced.ok) {
        const gapRecommendation = await recordBuilderGap({
          domain, task: taskBody.task, modelUsed: model_used, rawOutput: generatedOutput,
          status: 'failed', stage: 'additive_patch', reason: `additive-patch splice failed — ${spliced.reason}`,
          targetFile: resolvedTarget, routingKey: routing_key, mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true, placement,
        });
        return res.status(422).json({
          ok: false, committed: false, error: `Zone 3 additive-patch failed — ${spliced.reason}`,
          target_file: resolvedTarget, output: generatedOutput, gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget, originalLines: zoneEarly.lineCount, mergedLines: spliced.mergedLines }, '[BUILDER] Zone 3 additive-patch: spliced new code into existing file');
      generatedOutput = spliced.content;
    }

    const validationError = validateGeneratedOutputForTarget(resolvedTarget, generatedOutput);
    if (validationError) {
      const gapRecommendation = await recordBuilderGap({
        domain,
        task: taskBody.task,
        modelUsed: model_used,
        rawOutput: generatedOutput,
        status: 'failed',
        stage: 'validation',
        reason: validationError,
        targetFile: resolvedTarget,
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
        placement,
      });
      if (memorySvc && model_used) {
        try {
          await memorySvc.recordProtocolViolation({
            agentId: model_used,
            taskType: routing_key || 'council.builder.code',
            violationType: 'unverifiable_output',
            severity: 'medium',
            details: validationError,
            evidenceText: `Target file ${resolvedTarget} failed build validation before commit`,
            detectedBy: 'builder_validation',
            sourceRoute: '/api/v1/lifeos/builder/build',
            autoAction: 'watch',
          });
          await memorySvc.recordAgentPerformance({
            agentId: model_used,
            taskType: routing_key || 'council.builder.code',
            outcome: 'incorrect',
            notes: validationError,
          });
        } catch (memoryErr) {
          log.warn({ err: memoryErr.message, model_used }, '[BUILDER] could not persist protocol violation');
        }
      }
      return res.status(422).json({
        ok: false,
        error: validationError,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: false,
        gap_recommendation: gapRecommendation,
      });
    }

    // ── Pre-commit syntax gate (JS/MJS only) ──────────────────────────────────
    // Prevents the builder from committing syntactically broken code.
    // A model is never trusted because it's smart — it must be checked.
    const isJsFile = /\.(js|mjs|cjs)$/.test(resolvedTarget);
    if (isJsFile) {
      if (looksLikeJsonManifestInsteadOfJs(generatedOutput, resolvedTarget)) {
        log.warn({ resolvedTarget }, '[BUILDER] verify script returned JSON manifest — retry as executable .mjs');
        let manifestRetryCapture = null;
        const manifestRetryRes = {
          status(code) { return { json(d) { manifestRetryCapture = { code, data: d }; } }; },
          json(d) { manifestRetryCapture = { code: 200, data: d }; },
        };
        await dispatchTask({
          body: {
            ...taskBody,
            target_file: resolvedTarget || target_file,
            mode: taskBody.mode || 'code',
            useCache: false,
            execution_only: false,
            model: BUILDER_ROUTE_STANDARD_MODEL,
            max_output_tokens: 16384,
            spec: [
              taskBody.spec,
              'CRITICAL: Output executable JavaScript .mjs file — NOT a JSON manifest, NOT verify-project.json.',
              'Use fetch() + process.env.PUBLIC_BASE_URL + process.env.COMMAND_CENTER_KEY to probe HTTP routes.',
            ].filter(Boolean).join('\n'),
          },
        }, manifestRetryRes);
        if (manifestRetryCapture?.code === 200 && manifestRetryCapture.data?.ok && manifestRetryCapture.data.output) {
          generatedOutput = manifestRetryCapture.data.output;
          model_used = manifestRetryCapture.data.model_used;
        }
      }
      const chk = await verifyGeneratedJavaScriptWithNodeCheck(generatedOutput, resolvedTarget);
      const syntaxOk = chk.ok;
      const syntaxError = chk.error || null;

      if (!syntaxOk) {
        log.error({ resolvedTarget, model_used, syntaxError }, '[BUILDER] pre-commit syntax check FAILED — blocking commit');
        const gapRecommendation = await recordBuilderGap({
          domain,
          task: taskBody.task,
          modelUsed: model_used,
          rawOutput: generatedOutput,
          status: 'failed',
          stage: 'syntax',
          reason: syntaxError || 'node --check failed',
          targetFile: resolvedTarget,
          routingKey: routing_key,
          mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true,
          placement,
        });
        if (memorySvc && model_used) {
          try {
            await memorySvc.recordProtocolViolation({
              agentId: model_used,
              taskType: routing_key || 'council.builder.code',
              violationType: 'syntax_error',
              severity: 'high',
              details: `node --check failed on ${resolvedTarget}`,
              evidenceText: syntaxError,
              detectedBy: 'builder_pre_commit_gate',
              sourceRoute: '/api/v1/lifeos/builder/build',
              autoAction: 'watch',
            });
            await memorySvc.recordAgentPerformance({
              agentId: model_used,
              taskType: routing_key || 'council.builder.code',
              outcome: 'incorrect',
              notes: `Syntax error in generated ${resolvedTarget}: ${syntaxError.slice(0, 200)}`,
            });
          } catch (memErr) {
            log.warn({ err: memErr.message }, '[BUILDER] could not record syntax violation');
          }
        }
        return res.status(422).json({
          ok: false,
          error: `Pre-commit syntax check failed — commit blocked`,
          syntax_error: syntaxError,
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
          fix: 'Review the generated output for syntax errors and re-run or fix manually',
          gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] pre-commit syntax check passed');

      // ── Pre-commit governance (anti-pattern + stub + unified verifier) ────
      const zoneMeta = classifyBuildTarget(resolve(REPO_ROOT, resolvedTarget));
      const govResult = await runPrecommitGovernance({
        generatedOutput,
        resolvedTarget,
        originalLines: zoneMeta.lineCount > 0 ? zoneMeta.lineCount : null,
        intakeBlueprintStep: Boolean(taskBody.blueprint_intake_session_id),
        additivePatch: additivePatchActive,
        taskBody,
        retryFn: additivePatchActive ? null : async (retryBody) => {
          let retryCapture = null;
          const mockRetryRes = {
            status(c) { return { json(d) { retryCapture = { code: c, data: d }; } }; },
            json(d) { retryCapture = { code: 200, data: d }; },
          };
          await dispatchTask({
            body: {
              ...retryBody,
              target_file: resolvedTarget || target_file,
              mode: retryBody.mode || 'code',
              useCache: false,
            },
          }, mockRetryRes);
          if (!retryCapture?.data?.ok) return { ok: false, error: retryCapture?.data?.error || 'council_failed' };
          return { ok: true, output: retryCapture.data.output, model_used: retryCapture.data.model_used };
        },
        log,
      });
      if (!govResult.shouldCommit) {
        log.error({ resolvedTarget, decision: govResult.decision, failureType: govResult.pipeline?.failureType }, '[BUILDER] pre-commit governance blocked commit');
        const gapRec = await recordBuilderGap({
          domain, task: taskBody.task, modelUsed: model_used, rawOutput: generatedOutput,
          status: 'failed', stage: 'precommit_governance', reason: govResult.pipeline?.failureType || govResult.decision,
          targetFile: resolvedTarget, routingKey: routing_key, mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true, placement,
        });
        return res.status(422).json({
          ok: false, committed: false, error: 'Pre-commit governance blocked — anti-pattern, stub, or verifier failure',
          governance: govResult, gap_recommendation: gapRec,
        });
      }
      if (govResult.finalOutput && govResult.finalOutput !== generatedOutput) {
        generatedOutput = govResult.finalOutput;
        log.info({ resolvedTarget }, '[BUILDER] Governance approved retry output — substituting');
      }
    }

    // ── SQL validation gate ───────────────────────────────────────────────────
    const isSqlFile = /\.sql$/.test(resolvedTarget);
    if (isSqlFile) {
      let sqlCheck = validateSqlMigrationContent(generatedOutput);
      if (!sqlCheck.ok && model_used !== BUILDER_ROUTE_STANDARD_MODEL) {
        log.warn({ resolvedTarget, reason: sqlCheck.error, model_used }, '[BUILDER] SQL validation failed — retry with openai_builder_standard');
        let retryCapture = null;
        const mockRetryRes = {
          status(code) { return { json(data) { retryCapture = { code, data }; } }; },
          json(data) { retryCapture = { code: 200, data }; },
        };
        await dispatchTask({
          body: {
            ...taskBody,
            target_file: resolvedTarget || target_file,
            mode: taskBody.mode || 'code',
            useCache: false,
            execution_only: false,
            model: BUILDER_ROUTE_STANDARD_MODEL,
            spec: [
              taskBody.spec,
              'CRITICAL: target is a .sql migration file. Output plain PostgreSQL DDL only.',
              'Use CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.',
              'SQL comments must use -- only. No JavaScript, no import/export, no pool.query wrappers.',
            ].filter(Boolean).join('\n'),
          },
        }, mockRetryRes);
        if (retryCapture?.code === 200 && retryCapture.data?.ok && retryCapture.data.output) {
          generatedOutput = retryCapture.data.output;
          model_used = retryCapture.data.model_used;
          sqlCheck = validateSqlMigrationContent(generatedOutput);
        }
      }
      if (!sqlCheck.ok) {
        log.error({ resolvedTarget, reason: sqlCheck.error }, '[BUILDER] SQL validation failed');
        const gapRecommendation = await recordBuilderGap({
          domain,
          task: taskBody.task,
          modelUsed: model_used,
          rawOutput: generatedOutput,
          status: 'failed',
          stage: 'sql',
          reason: `SQL validation failed — ${sqlCheck.error}`,
          targetFile: resolvedTarget,
          routingKey: routing_key,
          mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true,
          placement,
        });
        return res.status(422).json({
          ok: false,
          error: `SQL validation failed — ${sqlCheck.error}`,
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
          gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] SQL validation passed');
    }

    // ── HTML validation gate ──────────────────────────────────────────────────
    const isHtmlFile = /\.html$/.test(resolvedTarget);
    if (isHtmlFile) {
      const missingTags = ['<html', '<head', '<body'].filter(t => !generatedOutput.includes(t));
      if (missingTags.length > 0) {
        log.error({ resolvedTarget, missingTags }, '[BUILDER] HTML validation failed — missing required tags');
        const gapRecommendation = await recordBuilderGap({
          domain,
          task: taskBody.task,
          modelUsed: model_used,
          rawOutput: generatedOutput,
          status: 'failed',
          stage: 'html',
          reason: `HTML validation failed — missing required tags: ${missingTags.join(', ')}`,
          targetFile: resolvedTarget,
          routingKey: routing_key,
          mode: taskBody.mode || 'code',
          executionOnly: taskBody.execution_only === true,
          placement,
        });
        return res.status(422).json({
          ok: false,
          error: `HTML validation failed — missing required tags: ${missingTags.join(', ')}`,
          output: generatedOutput,
          target_file: resolvedTarget,
          committed: false,
          gap_recommendation: gapRecommendation,
        });
      }
      log.info({ resolvedTarget }, '[BUILDER] HTML validation passed');
    }

    if (!isSafeTarget(resolvedTarget)) {
      return respondSafeScopeBlocked(res, { resolvedTarget, taskBody });
    }

    const msg = commit_message || `[system-build] ${resolvedTarget}`;
    try {
      const commitResult = await commitOrMirrorFiles(
        [{ path: resolvedTarget, content: generatedOutput }],
        msg,
        branch || undefined,
      );
      const goldenSha = commitResult?.sha || null;
      log.info(
        {
          resolvedTarget,
          msg,
          model_used,
          goldenSha,
          commit_mode: commitResult?.commit_mode || 'github',
          local_only: commitResult?.local_only === true,
        },
        '[BUILDER] /build committed generated file',
      );
      if (goldenSha) {
        createAutonomyGoldenTag(goldenSha).catch(e => log.warn({ err: e.message }, '[BUILDER] golden tag failed (non-fatal)'));
      }
      if (releaseMode === BUILDER_MODE.SUPERVISED) {
        await writeSecurityReceipt(
          SECURITY_RECEIPT_TYPES.BUILDER_SUPERVISED_BUILD,
          {
            target_file: resolvedTarget,
            commit_sha: goldenSha,
            model_used,
            task: String(taskBody.task || '').slice(0, 200),
            task_id: taskBody.task_id || null,
            build_task_id: taskBody.task_id || null,
          },
          pool
        ).catch(() => {});
      }
      const mirrorBuild = await mirrorCommittedContentToRepoRoot(resolvedTarget, generatedOutput);
      if (!mirrorBuild.ok) {
        log.warn({ resolvedTarget, reason: mirrorBuild.reason }, '[BUILDER] Runtime repo mirror failed after /build — chained files[] may be stale until redeploy');
      }
      await insertBuilderAudit({
        domain,
        task: taskBody.task,
        model_used,
        rawOutput: generatedOutput,
        cache_hit: false,
        placement: { target_file: resolvedTarget },
        status: 'committed',
        committed: true,
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
      });
      if (memorySvc && model_used) {
        try {
          await memorySvc.recordAgentPerformance({
            agentId: model_used,
            taskType: routing_key || 'council.builder.code',
            outcome: isJsFile ? 'correct' : 'partial', // JS passed syntax gate; others still need downstream verify
            notes: isJsFile
              ? `Builder output committed to ${resolvedTarget}; syntax verified pre-commit`
              : `Builder output committed to ${resolvedTarget}; downstream verification still required`,
          });
          // Record ci_pass evidence for the syntax fact (JS files only — already passed the gate above)
          if (isJsFile) {
            const syntaxFact = await pool?.query(
              `SELECT id FROM epistemic_facts WHERE text = $1`,
              [`${resolvedTarget} passes node --check (valid JavaScript syntax)`],
            ).catch(() => null);
            if (syntaxFact?.rows?.[0]) {
              await memorySvc.addEvidence(syntaxFact.rows[0].id, {
                eventType: 'ci_pass',
                result: 'confirmed',
                evidenceText: `Pre-commit node --check passed on ${resolvedTarget} (model: ${model_used})`,
                source: 'builder/pre-commit-gate',
                sourceIsIndependent: false,
              });
            }
          }
        } catch (memoryErr) {
          log.warn({ err: memoryErr.message, model_used }, '[BUILDER] could not persist agent performance');
        }
      }
      // ── Auto-wire routes to register-runtime-routes.js ───────────────────────
      // If the committed file is a LifeOS routes file, automatically add the import
      // and app.use() to startup/register-runtime-routes.js so the builder wires itself.
      let routeWired = null;
      const isNewRoutesFile = isProductRoutesFile(resolvedTarget);
      if (isNewRoutesFile) {
        try {
          routeWired = await autoWireRoute(resolvedTarget, generatedOutput, mount_path || null);
          if (routeWired?.ok && !routeWired?.skipped) {
            log.info({ resolvedTarget, mountPath: routeWired.mountPath }, '[BUILDER] Route auto-wired');
          } else if (routeWired?.skipped) {
            log.info({ resolvedTarget }, '[BUILDER] Route already wired — skipped');
          } else {
            log.warn({ resolvedTarget, reason: routeWired?.reason }, '[BUILDER] Route auto-wire failed (non-fatal)');
          }
        } catch (wireErr) {
          log.warn({ err: wireErr.message, resolvedTarget }, '[BUILDER] Route auto-wire threw (non-fatal)');
          routeWired = { ok: false, reason: wireErr.message };
        }
      }

      let deliberationFinalize = null;
      if (deliberationSessionId) {
        try {
          deliberationFinalize = await finalizeBuilderDeliberation(
            pool,
            {
              ...taskBody,
              session_id: deliberationSessionId,
              target_file: resolvedTarget,
              model_used,
              commit_sha: goldenSha,
            },
            log
          );
        } catch (finErr) {
          log.warn({ err: finErr.message, deliberationSessionId }, '[BUILDER] deliberation finalize failed (non-fatal)');
        }
      }

      const doneGateOutcome = await evaluateBuildDoneGateForBuildResponse({
        buildResult: {
          ok: true,
          status: 'SUCCESS',
          committed: true,
          commit_sha: goldenSha,
          target_file: resolvedTarget,
        },
        taskId: taskBody.task_id || null,
        controlPlane: builderControlPlane,
        kernelManaged: req?.__kernel_managed_build === true,
      });
      if (!doneGateOutcome.ok) {
        return res.status(409).json(doneGateOutcome.blockedResponse);
      }

      const completionOutcome = await evaluateBuildCompletionForBuildResponse({
        buildResult: {
          ok: true,
          status: 'SUCCESS',
          committed: true,
          commit_sha: goldenSha,
          target_file: resolvedTarget,
        },
        taskBody,
        kernelManaged: req?.__kernel_managed_build === true,
      });
      if (!completionOutcome.ok) {
        return res.status(409).json(completionOutcome.blockedResponse);
      }

      const doneGateDeferred = doneGateOutcome.metadata?.done_gate_deferred_to_kernel === true;
      const completionDeferred = completionOutcome.metadata?.completion_deferred_to_kernel === true;

      res.json({
        ok: true,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: true,
        commit_message: msg,
        commit_sha: goldenSha,
        commit_mode: commitResult?.commit_mode || 'github',
        local_only: commitResult?.local_only === true,
        warning: commitResult?.warning || null,
        done_gate_required: true,
        ...(doneGateDeferred
          ? {
              done_gate_passed: false,
              done_gate_deferred_to_kernel: true,
            }
          : {
              done_gate_passed: true,
            }),
        ...(completionDeferred
          ? {
              completion_granted: false,
              completion_receipt_id: null,
              completion_deferred_to_kernel: true,
            }
          : {
              completion_granted: completionOutcome.metadata?.completion_granted !== false,
              completion_receipt_id: completionOutcome.completion?.completion_receipt_id || null,
            }),
        ...(completionOutcome.metadata?.completion_authority_warning
          ? {
              completion_authority_warning: completionOutcome.metadata.completion_authority_warning,
              completion_authority_flag: BUILDEROS_COMPLETION_AUTHORITY_FLAG,
            }
          : {}),
        model_used,
        domain_context_loaded,
        domain,
        ...(deliberationSessionId ? { deliberation_session_id: deliberationSessionId } : {}),
        ...(deliberationFinalize?.debrief
          ? { founder_debrief_synopsis: deliberationFinalize.debrief.layer1_synopsis }
          : {}),
        ...(routeWired ? { route_wired: routeWired } : {}),
      });
    } catch (err) {
      log.error({ err: err.message, resolvedTarget }, '[BUILDER] /build commit failed');
      const gapRecommendation = await recordBuilderGap({
        domain,
        task: taskBody.task,
        modelUsed: model_used,
        rawOutput: generatedOutput,
        status: 'failed',
        stage: 'commit',
        reason: err.message,
        targetFile: resolvedTarget,
        routingKey: routing_key,
        mode: taskBody.mode || 'code',
        executionOnly: taskBody.execution_only === true,
        placement,
      });
      // Still return the generated output so the caller can apply manually
      res.status(500).json({
        ok: false,
        error: `Commit failed: ${err.message}`,
        output: generatedOutput,
        target_file: resolvedTarget,
        committed: false,
        gap_recommendation: gapRecommendation,
      });
    }
  }

  // ── GET /history ─────────────────────────────────────────────────────────────
  // Returns the conductor_builder_audit trail — what was built, by whom, success/fail.
  // Query params: limit (default 50, max 200), domain (filter), since (ISO timestamp), status

  async function getBuilderHistory(req, res) {
    if (!pool?.query) {
      return res.status(503).json({ ok: false, error: 'No DB pool available' });
    }
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const domain = req.query.domain || null;
      const since = req.query.since || null;
      const status = req.query.status || null;

      const conditions = [];
      const params = [];

      if (domain) {
        params.push(domain);
        conditions.push(`domain = $${params.length}`);
      }
      if (since) {
        params.push(since);
        conditions.push(`created_at >= $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`placement_json->>'status' = $${params.length}`);
      }

      params.push(limit);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await pool.query(
        `SELECT id, created_at, domain, task_preview, model_used, output_chars, cache_hit, placement_json
         FROM conductor_builder_audit
         ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params,
      );

      res.json({
        ok: true,
        count: rows.length,
        history: rows.map(r => ({
          id: r.id,
          created_at: r.created_at,
          domain: r.domain,
          task_preview: r.task_preview,
          model_used: r.model_used,
          output_chars: r.output_chars,
          cache_hit: r.cache_hit,
          status: r.placement_json?.status || null,
          failure_stage: r.placement_json?.failure_stage || null,
          failure_reason: r.placement_json?.failure_reason || null,
          gap_recommendation: r.placement_json?.gap_recommendation || null,
          routing_key: r.placement_json?.routing_key || null,
          mode: r.placement_json?.mode || null,
          execution_only: r.placement_json?.execution_only ?? null,
          target_file: r.placement_json?.target_file || null,
          committed: r.placement_json?.committed ?? null,
        })),
      });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] /history query failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  async function getBuilderGaps(req, res) {
    if (!pool?.query) {
      return res.status(503).json({ ok: false, error: 'No DB pool available' });
    }
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
      const domain = req.query.domain || null;
      const params = [];
      const conditions = [
        `COALESCE(placement_json->>'status', '') IN ('failed', 'blocked', 'needs_target')`,
      ];

      if (domain) {
        params.push(domain);
        conditions.push(`domain = $${params.length}`);
      }

      params.push(limit);
      const { rows } = await pool.query(
        `SELECT id, created_at, domain, task_preview, model_used, placement_json
         FROM conductor_builder_audit
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params,
      );

      res.json({
        ok: true,
        count: rows.length,
        gap_families: summarizeGapFamilies(
          rows.map((r) => {
            const base = {
              failure_stage: r.placement_json?.failure_stage || null,
              failure_reason: r.placement_json?.failure_reason || null,
              target_file: r.placement_json?.target_file || null,
              gap_recommendation: r.placement_json?.gap_recommendation || null,
              status: r.placement_json?.status || null,
              failure_family: r.placement_json?.failure_family || null,
            };
            return base.failure_family && base.failure_family !== 'other'
              ? base
              : { ...base, ...classifyBuilderGap(base) };
          }),
        ),
        gaps: rows.map((r) => {
          const base = {
            id: r.id,
            created_at: r.created_at,
            domain: r.domain,
            task_preview: r.task_preview,
            model_used: r.model_used,
            status: r.placement_json?.status || null,
            failure_stage: r.placement_json?.failure_stage || null,
            failure_reason: r.placement_json?.failure_reason || null,
            target_file: r.placement_json?.target_file || null,
            routing_key: r.placement_json?.routing_key || null,
            gap_recommendation: r.placement_json?.gap_recommendation || null,
            committed: r.placement_json?.committed ?? null,
          };
          const storedFamily = r.placement_json?.failure_family;
          const classified = classifyBuilderGap({
            failure_stage: base.failure_stage,
            failure_reason: base.failure_reason,
            target_file: base.target_file,
            gap_recommendation: base.gap_recommendation,
            status: base.status,
          });
          return {
            ...base,
            failure_family: storedFamily && storedFamily !== 'other' ? storedFamily : classified.failure_family,
            playbook: r.placement_json?.playbook || classified.playbook,
            repairable: r.placement_json?.repairable ?? classified.repairable,
            classifier: classified.classifier,
          };
        }),
      });
    } catch (err) {
      log.error({ err: err.message }, '[BUILDER] /gaps query failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  return function mount(app) {
    const base = '/api/v1/lifeos/builder';
    app.get(`${base}/ready`, requireKey, getBuilderReady);
    app.get(`${base}/domains`, requireKey, getDomains);
    app.get(`${base}/domain/:name`, requireKey, getDomain);
    app.get(`${base}/next-task`, requireKey, getNextTask);
    app.post(`${base}/task`, requireKey, dispatchTask);
    app.post(`${base}/review`, requireKey, reviewCode);
    app.get(`${base}/model-map`, requireKey, getModelMap);
    app.get(`${base}/lcl-stats`, requireKey, getLCLStats);
    app.get(`${base}/history`, requireKey, getBuilderHistory);
    app.get(`${base}/gaps`, requireKey, getBuilderGaps);
    // §2.11 execution endpoints — the system writes and commits code
    app.post(`${base}/execute`, requireKey, executeOutput);
    app.post(`${base}/execute-batch`, requireKey, executeBatch);
    app.post(`${base}/wire-route`, requireKey, wireRouteFromGitHub);
    app.post(
      `${base}/build`,
      requireKey,
      platformKernel?.wrapBuild ? platformKernel.wrapBuild(buildAndCommit) : buildAndCommit
    );
    log.info('✅ [LIFEOS-BUILDER] Council builder routes mounted at /api/v1/lifeos/builder (incl. /execute + /build + /history + /gaps)');
  };
}