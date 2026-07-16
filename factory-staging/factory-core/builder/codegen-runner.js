/**
 * SYNOPSIS: Governed codegen runner — the factory's "hands" for product files.
 *
 * Wraps council model calls with:
 * - additive edit-patch mode for existing files (reduces output tokens, the main
 *   driver of the low token_efficiency score)
 * - target-aware prompts (ESM, classic browser script, SQL, HTML, CSS, JSON)
 * - fail-fast syntax and import-resolution checks
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractContent } from './authoring.js';
import { parsePatch, applyPatch } from './patch-applier.js';
import { estimateTokens } from '../../../services/token-optimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const execFileAsync = promisify(execFile);
const CHECK_TIMEOUT_MS = 10_000;

export function createCodegenRunner({ callCouncilMember }) {
  if (!callCouncilMember || typeof callCouncilMember !== 'function') {
    return null;
  }

  return {
    generate: async ({
      task, target_file, spec, tiers, max_output_tokens: stepMaxTokens,
      last_error, expected_exports, failure_context, expected_exports_context,
      module_type, mode = 'full', existing_content = null, output_baseline_tokens = 0,
    }) => {
      const targetExt = path.extname(target_file || '').toLowerCase();
      const isJs = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(targetExt);
      const isClassicBrowserScript = isJs && module_type === 'classic_browser_script';
      const isSql = targetExt === '.sql';
      const isHtml = targetExt === '.html';
      const isCss = targetExt === '.css';
      const isJson = targetExt === '.json';
      const isPatch = mode === 'patch';

      const absTarget = target_file ? (path.isAbsolute(target_file) ? target_file : path.join(REPO_ROOT, target_file)) : null;

      // Load existing file if not supplied by the caller.
      let existingContent = existing_content || '';
      if (!existingContent && absTarget) {
        try {
          if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile() && fs.statSync(absTarget).size <= 20000) {
            existingContent = fs.readFileSync(absTarget, 'utf8');
          }
        } catch { /* ignore read errors */ }
      }

      // If the caller did not supply the output-token baseline, compute it from the
      // existing content so honest savings can still be recorded in patch mode.
      let outputBaselineTokens = output_baseline_tokens;
      if (isPatch && !outputBaselineTokens && existingContent) {
        outputBaselineTokens = estimateTokens(existingContent);
      }

      let formatLines;
      if (isPatch) {
        formatLines = [
          'Output ONLY a JSON ARRAY of edit objects.',
          'Use the format: [{"old_string":"exact substring from the existing file","new_string":"replacement text"}]',
          'The old_string must be an exact, unique substring of the existing file (include enough context to be unique).',
          'If only one change is needed, output an array with one object.',
          'If multiple non-contiguous changes are needed, include multiple objects in the array.',
          'Do NOT output the full file, explanations, or markdown fences — only the JSON array.',
          'Use real newline characters inside old_string/new_string, not escaped \\n.',
          'Example for a JavaScript edit: [{"old_string":"function greet() {\n  return \\"hello\\";\n}","new_string":"function greet() {\n  return \\"hi\\";\n}"}]',
          ...(isJs && !isClassicBrowserScript ? [
            'REPO CONSTRAINT: This repository is "type": "module" (ES modules).',
            'Use ES module syntax with named exports. Do NOT use CommonJS require or module.exports.',
          ] : isClassicBrowserScript ? [
            'REPO CONSTRAINT: This file is a classic browser script. Do NOT use import/export/require/module.exports at the top level.',
          ] : []),
          ...(isSql ? ['REPO CONSTRAINT: This is a PostgreSQL migration file.'] : []),
          ...(isHtml ? ['REPO CONSTRAINT: Output valid HTML fragment only.'] : []),
          ...(isCss ? ['REPO CONSTRAINT: Output valid CSS rules only.'] : []),
          ...(isJson ? ['REPO CONSTRAINT: Output valid, compact JSON only.'] : []),
        ];
      } else {
        formatLines = [
          'Output ONLY the exact, complete file content for the target file.',
          'No explanation, no commentary, no markdown fences — just the file body.',
          ...(isClassicBrowserScript ? [
            'REPO CONSTRAINT: This file is a classic browser script loaded via a `<script src>` tag, NOT an ES module.',
            'Do NOT use `import`, `export`, `require`, or `module.exports` at the top level.',
            'Do NOT use a top-level `return`.',
            'Attach the public API to the appropriate `window` object (e.g. `window.LifeOSChatThoughts`).',
            'Use DOM / `window` / `document` APIs as needed; the script runs in a browser.',
            'CRITICAL: if the EXISTING FILE CONTENT is provided below, preserve ALL existing code. Output the COMPLETE updated file — do NOT return a stub or minimal example.',
          ] : isJs ? [
            'REPO CONSTRAINT: This repository is "type": "module" (ES modules).',
            'Use ES module syntax with named exports (e.g. export function name, export const name, export { name }).',
            'CRITICAL: do NOT duplicate any export. If you declare `export function name` or `export const name`, do NOT also add `export { name }` for the same identifier.',
            'CRITICAL: if the EXISTING FILE CONTENT is provided below, preserve ALL existing code, routes, handlers, and exports. Output the COMPLETE updated file — do NOT return a stub or minimal example.',
            'Do NOT use CommonJS require or module.exports.',
          ] : []),
          ...(isSql ? [
            'REPO CONSTRAINT: This is a PostgreSQL migration file.',
            'Use valid, idempotent SQL (CREATE TABLE IF NOT EXISTS, ALTER ... IF EXISTS, etc.).',
            'Do NOT wrap the SQL in markdown code fences or JavaScript.',
          ] : []),
          ...(isHtml ? [
            'Output a valid HTML document/fragment only.',
            'Inline styles/scripts are allowed if the spec requires them.',
          ] : []),
          ...(isCss ? [
            'Output valid CSS rules only.',
          ] : []),
          ...(isJson ? [
            'Output valid, compact JSON only.',
          ] : []),
        ];
      }

      const existingContentLines = existingContent
        ? [
            `The EXISTING FILE CONTENT is wrapped in protected markers below. Use the exact text between the markers as the source for any ${isPatch ? '`old_string` anchors in your JSON patch' : 'updates to the complete file'}.`,
            'Do not edit, abbreviate, or reformat the protected content.',
            '<<<PROTECTED_EXISTING_FILE_START>>>',
            existingContent,
            '<<<PROTECTED_EXISTING_FILE_END>>>',
          ]
        : [];

      const prompt = [
        'You are a code-authoring hand for a governed build factory.',
        ...formatLines,
        `TARGET FILE: ${target_file}`,
        task ? `TASK: ${task}` : '',
        spec ? `SPEC:\n${typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)}` : '',
        ...existingContentLines,
        expected_exports_context || (Array.isArray(expected_exports) && expected_exports.length ? `REQUIRED NAMED EXPORTS: ${expected_exports.join(', ')}\nYou MUST export each of these names from the file.` : ''),
        failure_context || (last_error ? `PREVIOUS ATTEMPT FAILED WITH: ${last_error}\nMake sure you fix that exact issue.` : ''),
      ].filter(Boolean).join('\n\n');

      const maxOutputTokens = Number(stepMaxTokens) || 8000;
      let lastError = null;
      let member = null;

      async function checkModule(contentToCheck, classic) {
        const targetExtCheck = path.extname(target_file || '').toLowerCase();
        const needsJsCheck = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(targetExtCheck);
        if (!needsJsCheck) return { ok: true };

        const syntaxCheckFile = path.join(os.tmpdir(), `factory-codegen-${Date.now()}-${process.pid}.mjs`);
        try {
          fs.writeFileSync(syntaxCheckFile, contentToCheck);
          await execFileAsync(process.execPath, ['--check', syntaxCheckFile], { timeout: CHECK_TIMEOUT_MS, killSignal: 'SIGKILL' });
        } catch (err) {
          try { fs.unlinkSync(syntaxCheckFile); } catch {}
          return { ok: false, error: `syntax_check_failed:${String(err?.message || err)}` };
        }
        try { fs.unlinkSync(syntaxCheckFile); } catch {}

        if (!classic) {
          const importCheckFile = absTarget
            ? path.join(path.dirname(absTarget), `.factory-import-check-${Date.now()}-${process.pid}.mjs`)
            : null;
          if (importCheckFile) {
            try {
              fs.writeFileSync(importCheckFile, contentToCheck);
              const importExpr = `import ${JSON.stringify(pathToFileURL(importCheckFile).href)}; setTimeout(() => process.exit(0), 1000);`;
              await execFileAsync(process.execPath, ['--input-type=module', '-e', importExpr], { timeout: CHECK_TIMEOUT_MS, killSignal: 'SIGKILL' });
            } catch (err) {
              try {
                const debugFile = path.join(os.tmpdir(), `factory-import-failure-${Date.now()}-${process.pid}.mjs`);
                fs.writeFileSync(debugFile, contentToCheck);
              } catch {}
              try { fs.unlinkSync(importCheckFile); } catch {}
              return { ok: false, error: `import_resolution_failed:${String(err?.message || err)}` };
            }
            try { fs.unlinkSync(importCheckFile); } catch {}
          }
        }
        return { ok: true };
      }

      for (let i = 0; i < tiers.length; i += 1) {
        member = tiers[i];
        try {
          const raw = await callCouncilMember(member, prompt, {
            taskType: 'codegen',
            product_lane: 'builderos',
            useCache: false,
            maxOutputTokens,
            allowModelDowngrade: false,
            returnObject: true,
            critical: true,
            outputBaselineTokens: isPatch ? outputBaselineTokens : 0,
          });

          const rawContent = extractContent(typeof raw === 'string' ? raw : raw?.content || raw?.text || '');
          if (!rawContent || !rawContent.trim()) {
            lastError = `empty_output_from:${member}`;
            continue;
          }

          let content;
          let patchFailed = false;

          if (isPatch) {
            const patchSpec = parsePatch(rawContent);
            const applied = patchSpec?.ok ? applyPatch(existingContent, patchSpec) : null;
            if (applied?.ok) {
              content = applied.content;
            } else {
              patchFailed = true;
              // Fallback: the model may have ignored instructions and returned a full file.
              content = rawContent;
            }
          } else {
            content = rawContent;
          }

          const check = await checkModule(content, isClassicBrowserScript);
          if (!check.ok) {
            if (isPatch && !patchFailed) {
              // Patch applied but produced broken output; try raw as full file fallback.
              const fallbackCheck = await checkModule(rawContent, isClassicBrowserScript);
              if (fallbackCheck.ok) {
                content = rawContent;
              } else {
                lastError = `${member}: ${check.error} (patch fallback also failed: ${fallbackCheck.error})`;
                continue;
              }
            } else {
              lastError = `${member}: ${check.error}`;
              continue;
            }
          }

          const usage = (raw && typeof raw === 'object' && raw.usage) ? raw.usage : null;
          const promptTokens = Number(usage?.prompt_tokens) || Math.ceil(prompt.length / 4);
          const completionTokens = Number(usage?.completion_tokens) || Math.ceil(rawContent.length / 4);
          const totalTokens = Number(usage?.total_tokens) || (promptTokens + completionTokens);
          const estimatedUsd = Number(usage?.estimated_usd) || 0;

          return {
            content,
            model_tier: member,
            escalated: i > 0,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
              estimated_usd: estimatedUsd,
            },
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            estimated_usd: estimatedUsd,
          };
        } catch (err) {
          lastError = `${member}: ${String(err?.message || err)}`;
        }
      }

      return { content: null, error: lastError || 'all_tiers_failed', model_tier: member || null };
    },
  };
}
