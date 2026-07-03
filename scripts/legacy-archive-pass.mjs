/**
 * SYNOPSIS: legacy-archive-pass.mjs — system-owned "salvage → quarantine → verify" legacy cleanup tool.
 * @ssot docs/history/REPO_CLEANUP_INVENTORY_2026-07-02.md
 *
 * Encodes the manual legacy-archival loop as a deterministic, re-runnable pass so the
 * system (and eventually the BuilderOS/OB1 loop) can run it as its own hands:
 *   1. Compute the live boot import closure via `madge` over the real server entrypoints.
 *   2. For each candidate: refuse to move anything that is (a) in the boot closure or
 *      (b) imported by active NON-TEST code (resolved-import, not basename matching).
 *      In --aggressive mode, files referenced ONLY by tests/aliases are allowed to move
 *      (founder directive: a loud break that names its dependency beats silent drift).
 *   3. Salvage each file's SYNOPSIS/intent into docs/history/legacy-src/SALVAGE_INDEX.json.
 *   4. `git mv` it into the archive as `<path>.txt` (history preserved; tooling stops
 *      treating it as live JS; restore is one `git mv` back).
 *
 * Usage:
 *   node scripts/legacy-archive-pass.mjs --paths a.js,b.js [--aggressive] [--dry-run]
 *   node scripts/legacy-archive-pass.mjs --scan-dir src [--aggressive] [--dry-run]
 *
 * The caller is responsible for running `node --check`, `npx madge --circular`, and
 * `npm test` afterward (the pass prints the exact commands). Nothing is deleted — ever.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ENTRYPOINTS = ["server.js", "server-founder-runtime.js", "server-full-runtime.js"];
const ARCHIVE_ROOT = "docs/history/legacy-src";
const INDEX_PATH = path.join(ARCHIVE_ROOT, "SALVAGE_INDEX.json");
const SKIP_PREFIXES = ["docs/", "audit/", "backups/", "lumin-factory/", "node_modules/", "builderos-reboot/"];
const IMPORT_RE = /(?:from|require\(|import\(|readFileSync\(|readFile\()\s*['"]([^'"]+)['"]/g;
const SYN_RE = /SYNOPSIS[:\s]*([^\n*/`]+)/i;

function parseArgs(argv) {
  const a = { paths: [], scanDir: null, aggressive: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--aggressive") a.aggressive = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--paths") a.paths = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--scan-dir") a.scanDir = argv[++i];
  }
  return a;
}

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function trackedFiles() {
  return sh("git", ["ls-files"]).split("\n").filter(Boolean);
}

function bootClosure() {
  const closure = new Set();
  for (const entry of ENTRYPOINTS) {
    if (!fs.existsSync(entry)) continue;
    try {
      const data = JSON.parse(sh("npx", ["madge", "--json", "--extensions", "js", entry]));
      for (const [k, deps] of Object.entries(data)) {
        closure.add(k);
        for (const d of deps) closure.add(d);
      }
    } catch (e) {
      console.error(`[warn] madge failed for ${entry}: ${e.message}`);
    }
  }
  return closure;
}

function isTest(f) {
  return f.endsWith(".test.js") || f.endsWith(".test.ts") || /(^|\/)(__tests__|test|tests)\//.test(f);
}

function makeResolver(allSet) {
  return (base, spec) => {
    if (!spec.startsWith(".")) return null;
    const p = path.normalize(path.join(path.dirname(base), spec));
    for (const c of [p, p + ".js", p + ".mjs", p + ".cjs", path.join(p, "index.js")]) {
      if (allSet.has(c)) return c;
    }
    return null;
  };
}

/** Map of dead-candidate -> { test:[], prod:[] } importers. */
function referenceMap(all, allSet, candidates) {
  const resolve = makeResolver(allSet);
  const candSet = new Set(candidates);
  const refs = new Map();
  for (const f of all) {
    if (!/\.(js|mjs|cjs)$/.test(f)) continue;
    if (SKIP_PREFIXES.some((p) => f.startsWith(p))) continue;
    let txt;
    try {
      txt = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const m of txt.matchAll(IMPORT_RE)) {
      const r = resolve(f, m[1]);
      if (r && candSet.has(r)) {
        if (!refs.has(r)) refs.set(r, { test: [], prod: [] });
        refs.get(r)[isTest(f) ? "test" : "prod"].push(f);
      }
    }
  }
  return refs;
}

function loadIndex() {
  if (fs.existsSync(INDEX_PATH)) return JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  return {
    index_id: "LEGACY-SRC-SALVAGE-0001",
    created_at: new Date().toISOString().slice(0, 10),
    purpose: "Salvage+archive record for dead legacy files. Intent preserved before quarantine.",
    entries: [],
  };
}

function salvageSynopsis(f) {
  let head = "";
  try {
    head = fs.readFileSync(f, "utf8").slice(0, 1500);
  } catch {
    /* ignore */
  }
  const m = SYN_RE.exec(head);
  return m ? m[1].trim().replace(/^[-—:\s]+|[-—:\s]+$/g, "").slice(0, 200) : null;
}

function main() {
  const args = parseArgs(process.argv);
  const all = trackedFiles();
  const allSet = new Set(all);
  const closure = bootClosure();
  console.log(`[boot] closure = ${closure.size} modules`);

  let candidates;
  if (args.scanDir) {
    candidates = all.filter((f) => f.startsWith(args.scanDir.replace(/\/$/, "") + "/") && f.endsWith(".js") && !closure.has(f));
  } else {
    candidates = args.paths.filter((f) => allSet.has(f));
    const missing = args.paths.filter((f) => !allSet.has(f));
    if (missing.length) console.log(`[skip] not tracked / phantom: ${missing.join(", ")}`);
  }

  const refs = referenceMap(all, allSet, candidates);
  const idx = loadIndex();
  const moved = [];
  const held = [];

  for (const f of candidates) {
    if (closure.has(f)) {
      held.push([f, "in boot closure"]);
      continue;
    }
    const r = refs.get(f);
    if (r && r.prod.length) {
      held.push([f, `prod importers: ${r.prod.slice(0, 3).join(",")}`]);
      continue;
    }
    if (r && r.test.length && !args.aggressive) {
      held.push([f, `test importers (use --aggressive): ${r.test.slice(0, 3).join(",")}`]);
      continue;
    }
    const rel = f.startsWith("src/") ? f.slice(4) : path.join("_nonsrc", f);
    const dest = path.join(ARCHIVE_ROOT, rel) + ".txt";
    if (fs.existsSync(dest)) {
      held.push([f, `archive dest already exists: ${dest}`]);
      continue;
    }
    const synopsis = salvageSynopsis(f);
    if (args.dryRun) {
      moved.push([f, dest, "DRY-RUN"]);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    sh("git", ["mv", f, dest]);
    idx.entries.push({
      source_path: f,
      archived_to: dest,
      synopsis,
      verdict: "reject-archive",
      reason: r && r.test.length ? "dead (test/alias refs only) — aggressive archive" : "dead (0 boot-reachable, 0 active importers)",
    });
    moved.push([f, dest, synopsis || ""]);
  }

  if (!args.dryRun && moved.length) {
    idx.count = idx.entries.length;
    fs.writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2));
  }

  console.log(`\n[held back] ${held.length}`);
  for (const [f, why] of held) console.log(`   KEEP ${f} — ${why}`);
  console.log(`\n[${args.dryRun ? "would move" : "moved"}] ${moved.length}`);
  for (const [f, dest] of moved) console.log(`   ${f} -> ${dest}`);
  console.log(`\nNext: node --check ${ENTRYPOINTS.join(" ")} && npx madge --circular server.js && npm test`);
}

main();
