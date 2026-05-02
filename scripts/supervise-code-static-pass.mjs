#!/usr/bin/env node
/**
 * Deterministic code-supervision pass for overlay HTML/CSS/JS (machine layer).
 *
 * Does NOT replace Conductor reading Brief/mockups word-for-word; catches:
 * - vm.compileFunction failures on inline <script> in checked overlay paths (delegates to check-overlay-syntax.js list)
 * - Invalid CSS-style single-slash "comments" inside <style> blocks (lines starting with / that are not // or /*)
 * - Known builder foot-gun substrings (/ ──, property; /)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OVERLAY = path.join(ROOT, "public", "overlay");

const STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/gi;

/** Trailing garbage after a property (CSS) — rare outside `<style>`. */
const PROPERTY_SLASH_FOOTGUN = "property; /";

/**
 * Invalid single-slash “section” lines in CSS (`/ ──` not `// ──`).
 * @param {string} css
 * @param {string} relPath
 * @param {number} blockIdx
 * @returns {string[]}
 */
function findSingleSlashSectionMarkers(css, relPath, blockIdx) {
  const needle = "/ ──";
  const issues = [];
  let i = 0;
  while ((i = css.indexOf(needle, i)) !== -1) {
    const prev = i === 0 ? "" : css[i - 1];
    if (prev !== "/") {
      issues.push(
        `${relPath} <style> block ${blockIdx}: pseudo-comment "${needle}" at offset ${i} (use /* */ blocks; not // in CSS)`,
      );
    }
    i += needle.length;
  }
  return issues;
}

/** @returns {string[]} repo-relative posix paths */
function listHtmlFiles(absDir, base = absDir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const p = path.join(absDir, ent.name);
    if (ent.isDirectory()) listHtmlFiles(p, base, out);
    else if (ent.name.endsWith(".html")) out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

function scanStyleBlocks(relPath, html) {
  const issues = [];
  let m;
  STYLE_RE.lastIndex = 0;
  let blockIdx = 0;
  while ((m = STYLE_RE.exec(html)) !== null) {
    blockIdx += 1;
    const css = m[1] || "";
    const lines = css.split("\n");
    lines.forEach((line, li) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("//")) return;
      if (trimmed.startsWith("/*")) return;
      if (trimmed.startsWith("*") && trimmed.includes("*/")) return;
      if (trimmed.startsWith("/") && trimmed.length > 1 && trimmed[1] !== "/" && trimmed[1] !== "*") {
        issues.push(
          `${relPath} <style> block ${blockIdx} line ~${li + 1}: line starts with single '/' (invalid CSS comment; use /* */) — "${trimmed.slice(0, 80)}"`,
        );
      }
    });
    issues.push(...findSingleSlashSectionMarkers(css, relPath, blockIdx));
  }
  return issues;
}

function scanWholeFile(relPath, text) {
  const issues = [];
  if (text.includes(PROPERTY_SLASH_FOOTGUN)) {
    issues.push(`${relPath}: substring "${PROPERTY_SLASH_FOOTGUN}" (invalid trailing slash after declaration)`);
  }
  return issues;
}

async function runOverlaySyntaxCheck() {
  const scriptPath = path.join(ROOT, "scripts", "check-overlay-syntax.js");
  try {
    await execFileAsync(process.execPath, [scriptPath], {
      cwd: ROOT,
      env: process.env,
      shell: false,
    });
    return { ok: true };
  } catch (err) {
    const stderr = (err.stderr || err.message || String(err)).toString();
    return { ok: false, stderr };
  }
}

async function main() {
  console.log("\n📋 lifeos:supervise:static — deterministic overlay supervision pass\n");

  const a = await runOverlaySyntaxCheck();
  if (!a.ok) {
    console.error("\n❌ npm run check:overlay delegation failed:\n", a.stderr);
    process.exit(1);
  }
  console.log("✅ check:overlay passed\n");

  const relHtml = listHtmlFiles(OVERLAY).map((rp) => `public/overlay/${rp}`);
  const allIssues = [];
  for (const rel of relHtml) {
    const abs = path.join(ROOT, rel);
    let text = "";
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch (e) {
      allIssues.push(`${rel}: read failed (${e.message})`);
      continue;
    }
    allIssues.push(...scanWholeFile(rel, text));
    allIssues.push(...scanStyleBlocks(rel, text));
  }

  if (allIssues.length) {
    console.error("❌ Static supervision found issues:\n");
    allIssues.forEach((x) => console.error(` - ${x}`));
    console.error("\n❌ lifeos:supervise:static failed.");
    process.exit(1);
  }

  console.log(`✅ Scanned ${relHtml.length} HTML file(s) under public/overlay/ — style + footgun checks OK\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
