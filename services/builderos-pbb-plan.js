/**
 * SYNOPSIS: BuilderOS BP/PBB planner — turns OIL findings into one executable build plan.
 * Deterministic planner for the minimal governed loop bridge.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { classifyBuildTarget } from './builderos-patch-mode-policy.js';
import {
  extractTargetFileFromInstruction,
  inferBuilderDomainForTargetFile,
} from './builder-instruction-target.js';

const MIN_JS_LINES = 40;
const MIN_JS_LINES_UPDATE = 15;

function normalizeText(value) {
  return String(value || '').trim();
}

function isJsTarget(targetFile) {
  return /\.(mjs|cjs|js)$/i.test(normalizeText(targetFile));
}

function extractExportNames(instruction) {
  const names = [];
  const fnMatch = instruction.match(/function\s+([A-Za-z0-9_]+)/gi) || [];
  for (const match of fnMatch) {
    const name = match.replace(/^function\s+/i, '');
    if (name && !names.includes(name)) names.push(name);
  }
  const exportFnMatch = instruction.match(/export\s+function\s+([A-Za-z0-9_]+)/gi) || [];
  for (const match of exportFnMatch) {
    const name = match.replace(/^export\s+function\s+/i, '');
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function isUpdateInstruction(instruction, targetFile) {
  const lower = instruction.toLowerCase();
  if (
    /\b(update|patch|modify|edit)\b/.test(lower)
    || /\badd\s+(?:a\s+)?(?:one-line\s+)?(?:comment|line)\b/.test(lower)
    || /\bat line\s+\d+\b/.test(lower)
    || /\bdo not change anything else\b/.test(lower)
    || /\b(insert|append|remove|delete|fix|replace)\b/.test(lower)
  ) {
    return true;
  }
  if (targetFile && existsSync(resolve(targetFile))) {
    // Greenfield "build/create" on an existing path is not a patch unless delta verbs appear above.
    if (/\b(build|create|scaffold|implement)\b/.test(lower)) return false;
    return false;
  }
  return false;
}

/** Match builder file-inject cap so patch specs include the full target when possible. */
function readExistingFileSnippet(targetFile, maxChars = 120_000) {
  try {
    const content = readFileSync(resolve(targetFile), 'utf8');
    if (content.length <= maxChars) return content;
    return `${content.slice(0, maxChars)}\n/* ... truncated for prompt — preserve remaining file unchanged ... */`;
  } catch {
    return null;
  }
}

function buildJsOutputRequirements(targetFile) {
  return [
    'BUILDER OUTPUT REQUIREMENTS (mandatory — /builder/build rejects files below 15 lines):',
    `- Deliver at least ${MIN_JS_LINES} lines of real executable code in ${targetFile}.`,
    '- Plain JavaScript ESM only: no TypeScript types, no ": void", no generics, no markdown fences.',
    '- No external npm package imports. Node built-ins (node:path, node:url) allowed if needed.',
    '- No TODO, PLACEHOLDER, stub bodies, or "not implemented" comments.',
    '- Include a file-level JSDoc with @ssot docs/products/builderos/PRODUCT_HOME.md.',
    '- Every exported function must contain real logic — not a one-line console.log stub.',
    '- Do NOT add a process.argv / process.exit CLI entry — no CLI scaffolding in governed loop output.',
    '- Do NOT emit ---METADATA--- blocks for this governed loop job.',
    '- File must be syntactically complete: every { ( [ opened must close; no truncated tail.',
  ].join('\n');
}

/** Zone-1 scripts/*.mjs new-file targets used for read-only audits/diagnostics. */
function isZone1NewScriptTarget(targetFile) {
  const normalized = normalizeText(targetFile).replace(/\\/g, '/');
  if (!/^scripts\/[^/]+\.mjs$/i.test(normalized)) return false;
  return !existsSync(resolve(normalized));
}

const AUDIT_INSTRUCTION_MARKERS = /\b(read[- ]only|audit|investigate|diagnostic|dry[- ]run|report|summary|query)\b/i;
const CONTRADICTORY_IMPORT_MARKERS = /\b(pg\b|dotenv|process\.argv|read-only cli\b|export main\b|token_usage_log)/i;

function isZone1AuditScriptJob(instruction, targetFile) {
  const normalized = normalizeText(targetFile).replace(/\\/g, '/');
  if (!/^scripts\/[^/]+\.mjs$/i.test(normalized)) return false;
  const text = normalizeText(instruction);
  return AUDIT_INSTRUCTION_MARKERS.test(text) || CONTRADICTORY_IMPORT_MARKERS.test(text);
}

/**
 * Rewrite operator wording that conflicts with governed-loop safety rules.
 * Audit scripts must use internal API fetch + process.env — never pg/dotenv/CLI.
 */
export function canonicalizeZone1AuditInstruction(instruction, targetFile) {
  let text = normalizeText(instruction);
  text = text.replace(/\bread-only cli\b/gi, 'read-only audit module');
  text = text.replace(/\buse pg pool \+ dotenv\b/gi, 'use fetch() against PUBLIC_BASE_URL with x-command-key from process.env');
  text = text.replace(/\bpg pool\b/gi, 'fetch() to internal LifeOS API');
  text = text.replace(/\bdotenv\b/gi, 'process.env reads only');
  text = text.replace(/\bexport main\s*\(\s*\)/gi, 'export async function runAudit() returning structured JSON');
  text = text.replace(/\bqueries?\s+token_usage_log\b/gi, 'calls GET /api/v1/lifeos/admin/ai/performance (or equivalent read-only API)');
  text = text.replace(/\bcli\b/gi, 'exported audit module');
  if (!/fetch\s*\(/i.test(text)) {
    text += ' Use fetch() to internal read-only API endpoints; no direct DB access; no npm imports.';
  }
  return text;
}

function buildZone1AuditJsRequirements(targetFile) {
  return [
    'ZONE-1 READ-ONLY AUDIT MODULE REQUIREMENTS (governed loop — overrides generic npm/CLI bans for this job only):',
    `- Deliver at least ${MIN_JS_LINES} lines of real executable code in ${targetFile}.`,
    '- Plain JavaScript ESM only: no TypeScript, no markdown fences, no ---METADATA---.',
    '- NO npm package imports (no pg, dotenv, axios, etc.). Node built-ins only (node:path, node:url if needed).',
    '- Read data via fetch() to PUBLIC_BASE_URL + internal API paths; pass x-command-key from process.env.COMMAND_CENTER_KEY.',
    '- Prefer read-only GET endpoints (e.g. GET /api/v1/lifeos/admin/ai/performance, /api/v1/lifeos/autonomous-telemetry/metrics).',
    '- NO direct database connections, NO SQL, NO production DB writes, NO mutations.',
    '- Export async functions that return structured JSON objects — NOT console.log stubs.',
    '- Do NOT add process.argv / process.exit CLI scaffolding — orchestrator invokes exports directly.',
    '- Include file-level JSDoc with @ssot docs/products/builderos/PRODUCT_HOME.md.',
    '- File must be syntactically complete: every brace/bracket/paren closed; no truncated tail.',
  ].join('\n');
}

function buildZone1AuditJsSpec(instruction, targetFile, exportNames) {
  const canonicalInstruction = canonicalizeZone1AuditInstruction(instruction, targetFile);
  const exportLines = exportNames.length
    ? exportNames.map((name, i) => `${i + 1}. export async function ${name}(...) returning structured audit JSON`).join('\n')
    : '1. export async function runAudit(...) returning structured audit JSON with ok, summary, generated_at';

  return [
    buildZone1AuditJsRequirements(targetFile),
    '',
    'REQUIRED EXPORTS:',
    exportLines,
    '',
    'Include helper functions for fetchJson(baseUrl, path, key), env validation, and error shaping.',
    'No CLI entry — governed loop modules export functions only.',
    '',
    'CANONICAL INTERPRETATION (this overrides contradictory phrases in the raw operator text):',
    canonicalInstruction,
  ].join('\n');
}

function buildProofFileSpec(instruction, targetFile, exportNames) {
  const primaryExport = exportNames[0] || 'getBuilderOSC2CommitProof';
  const lines = [
    'TARGET: new Zone 1 proof module for BuilderOS Command & Control commit-path verification.',
    `FILE: ${targetFile}`,
    '',
    buildJsOutputRequirements(targetFile),
    '',
    'START FROM THIS SKELETON — fill every IMPLEMENT section; keep all braces closed:',
    '---',
    `/** @ssot docs/products/builderos/PRODUCT_HOME.md */`,
    `const BUILDEROS_C2_PROOF_VERSION = '1.0.0';`,
    `const PROOF_SOURCE = 'builderos-command-control';`,
    '',
    `function validateProofShape(obj) { /* IMPLEMENT full validation */ }`,
    `function formatProofJson(obj) { /* IMPLEMENT JSON.stringify(obj, null, 2) */ }`,
    '',
    `export function ${primaryExport}() {`,
    `  /* IMPLEMENT return { ok: true, source: PROOF_SOURCE, generated_at: new Date().toISOString() } */`,
    `}`,
    '',
    `/* No CLI entry — governed loop modules do not require a CLI entry point */`,
    '---',
    '',
    'REQUIRED EXPORTS AND BEHAVIOR:',
    `1. export function ${primaryExport}() with real logic (not stub)`,
    "2. returns { ok: true, source: 'builderos-command-control', generated_at: ISO8601 }",
    '3. No CLI entry — export functions only (governed loop invokes exports)',
    '',
    `OPERATOR INSTRUCTION: ${instruction}`,
  ];
  return lines.join('\n');
}

function buildGenericJsSpec(instruction, targetFile, exportNames) {
  const exportLines = exportNames.length
    ? exportNames.map((name, i) => `${i + 1}. export function ${name}(...) with complete implementation`).join('\n')
    : '1. Export every function named in the instruction with complete implementations';

  return [
    buildJsOutputRequirements(targetFile),
    '',
    'REQUIRED EXPORTS:',
    exportLines,
    '',
    'Include helper functions and constants so the file is complete — not a stub. No CLI entry.',
    '',
    `OPERATOR INSTRUCTION: ${instruction}`,
  ].join('\n');
}

function buildUpdateJsSpec(instruction, targetFile, exportNames, existingContent, lineCount) {
  const exportLines = exportNames.length
    ? exportNames.map((name, i) => `${i + 1}. preserve or add export function ${name}(...) per instruction`).join('\n')
    : '1. Apply only the instruction delta — preserve unrelated exports and logic';

  return [
    'PATCH MODE — EXISTING FILE UPDATE (mandatory):',
    `- Target ${targetFile} already exists (${lineCount} lines).`,
    '- Output the COMPLETE updated file — not a diff, not a fragment.',
    '- Apply ONLY the operator change. Do NOT rewrite unrelated logic or add new subsystems.',
    '- Preserve every existing export and behavior unless the instruction explicitly changes it.',
    '- Plain JavaScript ESM only. No TypeScript. No markdown fences. No ---METADATA---.',
    '- File must be syntactically complete: every brace/bracket/paren closed; no truncated tail.',
    `- Minimum ${MIN_JS_LINES_UPDATE} lines (match or exceed current ${lineCount} lines unless instruction removes code).`,
    '- Include file-level JSDoc with @ssot docs/products/builderos/PRODUCT_HOME.md.',
    '- Do NOT add process.argv CLI scaffolding.',
    '- REPO FILE CONTENTS (if injected separately) is authoritative — emit the full updated file.',
    '- Do NOT refuse or ask for file content — it is provided in EXISTING FILE and/or REPO FILE CONTENTS.',
    '',
    'REQUIRED EXPORTS / CHANGES:',
    exportLines,
    '',
    'EXISTING FILE (preserve unless instruction overrides):',
    '---',
    existingContent || '(could not read existing file — apply minimal safe change only)',
    '---',
    '',
    `OPERATOR INSTRUCTION: ${instruction}`,
  ].join('\n');
}

function buildBaseSpec(instruction, targetFile) {
  const exportNames = extractExportNames(instruction);
  const lower = instruction.toLowerCase();
  const isProofFile =
    /\bproof\b/.test(lower) &&
    (targetFile.includes('proof') || /builderos-.*-proof\.mjs$/i.test(targetFile));

  if (isJsTarget(targetFile)) {
    if (isZone1AuditScriptJob(instruction, targetFile)) {
      return buildZone1AuditJsSpec(instruction, targetFile, exportNames);
    }
    if (isUpdateInstruction(instruction, targetFile)) {
      const zone = classifyBuildTarget(targetFile);
      const existingContent = readExistingFileSnippet(targetFile);
      return buildUpdateJsSpec(instruction, targetFile, exportNames, existingContent, zone.lineCount || 0);
    }
    if (isProofFile) return buildProofFileSpec(instruction, targetFile, exportNames);
    return buildGenericJsSpec(instruction, targetFile, exportNames);
  }

  return [
    'BuilderOS-only governed loop execution.',
    'Do not modify LifeOS user features or TSOS customer-facing surfaces.',
    'Implement exactly what the instruction asks for inside approved builder safe scope.',
    `Instruction: ${instruction}`,
  ].join('\n');
}

export function generatePbbPlanFromOilAudit(job, oilAudit, options = {}) {
  if (!oilAudit?.ok) {
    return {
      ok: false,
      error: 'oil_audit_failed',
      oil_findings: oilAudit?.findings || [],
    };
  }

  const metadata = job?.metadata_json && typeof job.metadata_json === 'object' ? job.metadata_json : {};
  const instruction = normalizeText(job?.instruction);
  const targetFile =
    normalizeText(metadata.target_file)
    || extractTargetFileFromInstruction(instruction)
    || null;
  const domain =
    normalizeText(metadata.domain)
    || (targetFile ? inferBuilderDomainForTargetFile(targetFile) : 'builderos-platform');
  const repairAttempt = Number(options.repairAttempt || 0);
  const verifierResult = options.verifierResult || null;

  const isUpdate = targetFile ? isUpdateInstruction(instruction, targetFile) : false;
  let spec = buildBaseSpec(instruction, targetFile || 'scripts/builderos-output.mjs');

  if (repairAttempt > 0 && verifierResult) {
    spec += '\n\nOIL VERIFIER REJECTION (repair attempt):\n';
    spec += `- first_failure: ${verifierResult.first_failure || 'unknown'}\n`;
    if (verifierResult.syntax_error) spec += `- syntax_error: ${verifierResult.syntax_error}\n`;
    if (Array.isArray(verifierResult.stub_signals) && verifierResult.stub_signals.length) {
      spec += `- stub_signals: ${verifierResult.stub_signals.join('; ')}\n`;
    }
    if (targetFile && isJsTarget(targetFile)) {
      spec += `\nREPAIR REQUIREMENTS:\n`;
      if (/truncat|unexpected end of input|syntaxerror/i.test(String(verifierResult.syntax_error || ''))) {
        spec += '- PRIOR OUTPUT WAS TRUNCATED. Emit the COMPLETE file with all braces closed.\n';
        spec += '- Do NOT expand scope — apply only the operator instruction.\n';
      }
      spec += `- Rewrite ${targetFile} to at least ${isUpdate ? MIN_JS_LINES_UPDATE : MIN_JS_LINES} lines.\n`;
      spec += '- Remove TypeScript syntax, external imports, and stub bodies.\n';
      spec += '- Pass node --check and builder stub/antipattern gates.\n';
    }
  }

  const task = repairAttempt > 0
    ? `Repair BuilderOS change after OIL verifier rejection: ${instruction}`
    : `Execute BuilderOS instruction: ${instruction}`;

  const commitSuffix = repairAttempt > 0 ? ` repair-${repairAttempt}` : '';
  const commitMessage = `[system-build] BuilderOS governed loop job ${job.id}${commitSuffix}`;

  const jsTarget = isJsTarget(targetFile || '');
  const htmlTarget = /\.html?$/i.test(String(targetFile || ''));
  const zoneInfo = targetFile && existsSync(resolve(targetFile)) ? classifyBuildTarget(targetFile) : null;
  const lineCount = zoneInfo?.lineCount || 0;
  // HTML overlays need an explicit token budget — undefined lets Gemini Flash default to minimal output.
  const maxOutputTokens = jsTarget
    ? Math.min(16384, Math.max(8192, Math.ceil(lineCount * 80) + 4096))
    : htmlTarget
      ? 16384
      : undefined;

  return {
    ok: true,
    plan_id: randomUUID(),
    task,
    spec,
    target_file: targetFile,
    files: targetFile && existsSync(resolve(targetFile)) ? [targetFile] : undefined,
    domain,
    mode: 'code',
    commit_message: commitMessage,
    model: jsTarget ? 'gemini_flash' : undefined,
    max_output_tokens: maxOutputTokens,
    patch_mode: isUpdate,
    builder_scope: 'builderos-only',
    repair_attempt: repairAttempt,
    planned_at: new Date().toISOString(),
    spec_lines: spec.split('\n').length,
  };
}
