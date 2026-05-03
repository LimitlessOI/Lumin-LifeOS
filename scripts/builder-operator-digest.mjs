#!/usr/bin/env node
/**
 * Tail recent builder JSONL logs and emit Markdown for §2.11b / continuity paste-in.
 * No network / no AI calls.
 *
 * Env:
 * - BUILDER_DIGEST_LINES — max non-empty lines per file (default 80)
 * - BUILDER_DIGEST_QUEUE_LOG — default data/builder-continuous-queue-log.jsonl
 * - BUILDER_DIGEST_DAEMON_LOG — default data/builder-daemon-log.jsonl (skip if missing)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const maxLines = Math.max(10, parseInt(process.env.BUILDER_DIGEST_LINES || "80", 10) || 80);
const queueRel =
  process.env.BUILDER_DIGEST_QUEUE_LOG || "data/builder-continuous-queue-log.jsonl";
const daemonRel =
  process.env.BUILDER_DIGEST_DAEMON_LOG || "data/builder-daemon-log.jsonl";

function tailParseJsonl(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    return { relPath, missing: true, rows: [] };
  }
  const raw = fs.readFileSync(abs, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const slice = lines.slice(-maxLines);
  const rows = [];
  for (const line of slice) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      rows.push({ _parseError: true, _raw: line.slice(0, 120) });
    }
  }
  return { relPath, missing: false, rows };
}

function summarizeQueue(rows) {
  const counts = {};
  let wallN = 0;
  let wallSum = 0;
  const lastIds = [];
  for (const o of rows) {
    const ev = o.event || o.type || "unknown";
    counts[ev] = (counts[ev] || 0) + 1;
    const ms = Number(o.build_wall_ms);
    if (Number.isFinite(ms) && ms >= 0) {
      wallSum += ms;
      wallN++;
    }
    if (o.id && typeof o.id === "string") lastIds.push(o.id);
  }
  return {
    counts,
    avgWallMs: wallN ? wallSum / wallN : null,
    lastIds: lastIds.slice(-12),
  };
}

function mdSection(title, body) {
  return `### ${title}\n\n${body}\n`;
}

function main() {
  const q = tailParseJsonl(queueRel);
  const d = tailParseJsonl(daemonRel);

  let out = `# Builder operator digest\n\n`;
  out += `Generated: **${new Date().toISOString()}** · tail **${maxLines}** lines/file · repo \`${ROOT}\`\n\n`;

  if (!q.missing) {
    const s = summarizeQueue(q.rows);
    const avgMin = s.avgWallMs != null ? (s.avgWallMs / 60000).toFixed(2) : "n/a";
    out += mdSection(
      `Continuous queue — \`${q.relPath}\``,
      [
        `- Event counts (tail window): \`${JSON.stringify(s.counts)}\``,
        `- Avg \`build_wall_ms\` (where present): **${avgMin} min**`,
        `- Recent task ids: ${s.lastIds.length ? s.lastIds.map((x) => `\`${x}\``).join(", ") : "_none_"}`,
      ].join("\n")
    );
  } else {
    out += mdSection(`Continuous queue — \`${q.relPath}\``, `_File missing — no local queue log yet._`);
  }

  if (!d.missing) {
    const evs = d.rows.filter((r) => r.event || r.type);
    const tail = evs.slice(-6);
    const lines = tail.map((r) => {
      const ev = r.event || r.type || "?";
      const cy = r.cycle_ok != null ? ` cycle_ok=${r.cycle_ok}` : "";
      return `- \`${ev}\`${cy}`;
    });
    out += mdSection(
      `Daemon — \`${d.relPath}\` (last events, up to 6)`,
      lines.length ? lines.join("\n") : "_No structured events in tail._"
    );
  } else {
    out += mdSection(`Daemon — \`${d.relPath}\``, `_File missing — daemon not run locally._`);
  }

  process.stdout.write(out);
}

main();
