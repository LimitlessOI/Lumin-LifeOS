/**
 * BuilderOS BP/PBB planner — turns OIL findings into one executable build plan.
 * Deterministic planner for the minimal governed loop bridge.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { randomUUID } from 'crypto';

const MIN_JS_LINES = 40;

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
  return names;
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
    '- Add a CLI entry at file bottom using import.meta.url guard and process.argv[1] check.',
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
    `/* IMPLEMENT CLI entry with import.meta.url guard */`,
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
    'Include helper functions, constants, and CLI entry so the file is complete — not a stub.',
    '',
    `OPERATOR INSTRUCTION: ${instruction}`,
  ].join('\n');
}

function buildBaseSpec(instruction, targetFile) {
  const exportNames = extractExportNames(instruction);
  const lower = instruction.toLowerCase();
  const isProofFile =
    /proof/.test(lower) &&
    (targetFile.includes('proof') || targetFile.startsWith('scripts/builderos-'));

  if (isJsTarget(targetFile)) {
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
      spec += `- Rewrite ${targetFile} to at least ${MIN_JS_LINES} lines.\n`;
      spec += '- Remove TypeScript syntax, external imports, and stub bodies.\n';
      spec += '- Pass node --check and builder stub/antipattern gates.\n';
    }
  }

  const task = repairAttempt > 0
    ? `Repair BuilderOS change after OIL verifier rejection: ${instruction}`
    : `Execute BuilderOS instruction: ${instruction}`;

  const commitSuffix = repairAttempt > 0 ? ` repair-${repairAttempt}` : '';
  const commitMessage = `[system-build] BuilderOS governed loop job ${job.id}${commitSuffix}`;

  return {
    ok: true,
    plan_id: randomUUID(),
    task,
    spec,
    target_file: targetFile,
    domain,
    mode: 'code',
    commit_message: commitMessage,
    model: isJsTarget(targetFile || '') ? 'gemini_flash' : undefined,
    max_output_tokens: isJsTarget(targetFile || '') ? 4096 : undefined,
    builder_scope: 'builderos-only',
    repair_attempt: repairAttempt,
    planned_at: new Date().toISOString(),
    spec_lines: spec.split('\n').length,
  };
}
