#!/usr/bin/env node
/**
 * Dumb-AI Confusion Auditor / Governance Janitor
 *
 * Cheap deterministic first pass over active governance. It deliberately errs
 * toward FLAG, not DELETE. AI may later enrich findings, but may never be the
 * sole authority for archive movement.
 *
 * Usage:
 *   node scripts/governance-janitor.mjs
 *   node scripts/governance-janitor.mjs --strict
 *
 * Archive movement is intentionally a separate governed action. This scanner
 * emits archive_eligible only when deterministic preconditions can be proven;
 * the mover must re-check references immediately before moving a file.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const POLICY_PATH = "builderos-reboot/governance/GOVERNANCE_JANITOR_POLICY.json";
const NAMING_PATH = "builderos-reboot/governance/CANONICAL_NAMING_REGISTRY.json";
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, POLICY_PATH), "utf8"));
const naming = JSON.parse(fs.readFileSync(path.join(ROOT, NAMING_PATH), "utf8"));
const strict = process.argv.includes("--strict");

const TEXT_EXT = new Set([".md", ".txt", ".json", ".yaml", ".yml"]);
const protectedSet = new Set(policy.protected_files || []);
const historyRoots = policy.history_roots || [];

function gitFiles() {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n").map(s => s.trim()).filter(Boolean);
}
function isUnder(file, roots) { return roots.some(r => file.startsWith(r)); }
function refsTo(candidate, files) {
  const needle = candidate.replaceAll("\\", "/");
  const out = [];
  for (const file of files) {
    if (file === candidate || isUnder(file, historyRoots) || !TEXT_EXT.has(path.extname(file))) continue;
    let text = "";
    try { text = fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { continue; }
    if (text.includes(needle)) out.push(file);
  }
  return out;
}
function lineOf(text, index) { return text.slice(0, index).split("\n").length; }

const files = gitFiles();
const findings = [];
for (const file of files) {
  if (!isUnder(file, policy.scan_roots || []) || isUnder(file, historyRoots)) continue;
  if (!TEXT_EXT.has(path.extname(file))) continue;
  let text = "";
  try { text = fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { continue; }
  const lower = text.toLowerCase();

  // Canonical naming drift: report legacy aliases in active surfaces.
  for (const rule of naming.rules || []) {
    for (const alias of rule.legacy_aliases || []) {
      if (alias === rule.canonical) continue;
      const rx = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "gi");
      let m;
      while ((m = rx.exec(text))) {
        findings.push({
          severity: "warning", type: "NAMING_DRIFT", file,
          line: lineOf(text, m.index), found: m[0], canonical: rule.canonical,
          action: rule.code_identifier_policy?.startsWith("flag") ? "FLAG" : "REVIEW_REPLACE"
        });
        if (findings.length > 5000) break;
      }
    }
  }

  const staleWords = ["superseded", "deprecated", "obsolete", "historical only", "history-only", "snapshot", "not current doctrine"];
  const staleHits = staleWords.filter(w => lower.includes(w));
  const looksDated = /20\d{2}[-_]\d{2}[-_]\d{2}/.test(path.basename(file));
  const claimsAuthority = /supreme authority|canonical path|single source of truth|\bssot\b|current authority/i.test(text);
  const enforcementClaim = /enforced|fail[- ]closed|hard[- ]block|must block/i.test(text);
  const namedMechanism = /scripts\/|\.github\/workflows\/|verif(?:y|ier)|gate|receipt/i.test(text);
  const activeRefs = staleHits.length ? refsTo(file, files) : [];

  if (staleHits.length || looksDated) {
    const archiveEligible = !protectedSet.has(file) && staleHits.length > 0 && activeRefs.length === 0;
    findings.push({
      severity: archiveEligible ? "warning" : "info",
      type: "STALE_OR_SNAPSHOT_CANDIDATE", file, stale_signals: staleHits,
      dated_filename: looksDated, active_references: activeRefs,
      action: archiveEligible ? "ARCHIVE_ELIGIBLE_RECHECK_REQUIRED" : "FLAG"
    });
  }
  if (claimsAuthority && file !== "docs/constitution/NORTH_STAR_SSOT.md") {
    findings.push({ severity: "warning", type: "COMPETING_AUTHORITY_LANGUAGE", file, action: "FLAG" });
  }
  if (enforcementClaim && !namedMechanism) {
    findings.push({ severity: "warning", type: "ENFORCEMENT_WITHOUT_NAMED_MECHANISM", file, action: "FLAG" });
  }
  if (/blueprint/i.test(path.basename(file)) && !/history|provenance|supersed/i.test(text)) {
    findings.push({ severity: "warning", type: "BLUEPRINT_HISTORY_LINK_MISSING_OR_UNCLEAR", file, action: "FLAG" });
  }
  if (/\bCostello\b/i.test(text)) {
    findings.push({ severity: "warning", type: "BUILDEROS_IDENTITY_DRIFT", file, found: "Costello", canonical: "Castello", action: "FLAG" });
  }
}

const report = {
  schema: "governance_confusion_report_v1",
  generated_at: new Date().toISOString(),
  mode: strict ? "strict" : "audit",
  scanned_files: files.filter(f => isUnder(f, policy.scan_roots || []) && !isUnder(f, historyRoots)).length,
  finding_count: findings.length,
  archive_eligible_count: findings.filter(f => f.action === "ARCHIVE_ELIGIBLE_RECHECK_REQUIRED").length,
  findings
};
const reportPath = path.join(ROOT, policy.outputs.report);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ok: findings.length === 0, report: policy.outputs.report, findings: findings.length, archive_eligible: report.archive_eligible_count }, null, 2));
if (strict && findings.some(f => f.severity === "warning")) process.exit(1);
