/**
 * BuilderOS BP/PBB planner — turns OIL findings into one executable build plan.
 * Deterministic planner for the minimal governed loop bridge.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { classifyBuildTarget } from './builderos-patch-mode-policy.js';

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
  if (/\bupdate\b/.test(lower) || /\bpatch\b/.test(lower) || /\bmodify\b/.test(lower)) return true;
  if (targetFile && existsSync(resolve(targetFile))) return true;
  return false;
}

function readExistingFileSnippet(targetFile, maxChars = 6000) {
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
    '- Include a file-level JSDoc with @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md.',
    '- Every exported function must contain real logic — not a one-line console.log stub.',
    '- Do NOT add a process.argv / process.exit CLI entry — no CLI scaffolding in governed loop output.',
    '- Do NOT emit ---METADATA--- blocks for this governed loop job.',
    '- File must be syntactically complete: every { ( [ opened must close; no truncated tail.',
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
    `/** @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md */`,
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
    '3. CLI prints JSON to stdout when executed directly',
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
    '- Include file-level JSDoc with @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md.',
    '- Do NOT add process.argv CLI scaffolding.',
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
  const targetFile = normalizeText(metadata.target_file) || null;
  const domain = normalizeText(metadata.domain) || 'builderos-platform';
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
  const zoneInfo = targetFile && existsSync(resolve(targetFile)) ? classifyBuildTarget(targetFile) : null;
  const lineCount = zoneInfo?.lineCount || 0;
  const maxOutputTokens = jsTarget
    ? Math.min(16384, Math.max(8192, Math.ceil(lineCount * 80) + 4096))
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
