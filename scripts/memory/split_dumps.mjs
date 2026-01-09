import fs from "fs";
import path from "path";

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] ?? def;
}
function hasFlag(name) {
  return process.argv.includes(name);
}

const IN_PATH = arg("--in");
const OUT_ROOT = arg("--out", path.join(process.cwd(), "Lumin-Memory", "00_INBOX", "processed"));
const MAX_MB = Number(arg("--maxMB", "0.9"));
const REDACT = hasFlag("--redact");

if (!IN_PATH) {
  console.error("Usage: node scripts/memory/split_dumps.mjs --in <file-or-dir> [--out <dir>] [--maxMB 0.9] [--redact]");
  process.exit(1);
}

const ROOT = process.cwd();
const MAX_BYTES = Math.max(64 * 1024, Math.floor(MAX_MB * 1024 * 1024));

function slug(s) {
  return s
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 80) || "dump";
}

function redactText(s) {
  let out = s;
  out = out.replace(/\b(sk_(?:live|test)_[0-9a-zA-Z]{16,})\b/g, (m) => m.slice(0, 8) + "[REDACTED]");
  out = out.replace(/\b(ghp_[0-9A-Za-z]{20,})\b/g, "ghp_[REDACTED]");
  out = out.replace(/\b(npg_[0-9A-Za-z]{10,})\b/g, "npg_[REDACTED]");
  out = out.replace(/\b(xox[baprs]-[0-9A-Za-z-]{10,})\b/g, "[REDACTED_SLACK]");
  out = out.replace(/\b(AWS|aws)_(ACCESS|SECRET)_KEY(_ID)?\b.*$/gmi, "[REDACTED_AWS]");
  out = out.replace(/\b(DATABASE_URL|DATABASEURL|NEON_DATABASE_URL|POSTGRES_URL)\s*=\s*.+$/gmi, "$1=[REDACTED]");
  out = out.replace(/\b(API_KEY|APIKEY|SECRET|PASSWORD|TOKEN)\s*[:=]\s*\S+/gmi, (m) => m.split(/[:=]/)[0] + "=[REDACTED]");
  return out;
}

function listFiles(p) {
  const abs = path.resolve(ROOT, p);
  const st = fs.statSync(abs);
  if (st.isFile()) return [abs];
  const out = [];
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

async function splitOneFile(absFile) {
  const relFromRoot = path.relative(ROOT, absFile);
  const baseName = path.basename(absFile);
  const parentName = path.basename(path.dirname(absFile));
  const outDirName = slug(parentName || "raw") + "__" + slug(baseName);
  const outDir = path.join(OUT_ROOT, outDirName);
  fs.mkdirSync(outDir, { recursive: true });

  const indexPath = path.join(outDir, "index.md");
  const metaPath = path.join(outDir, "meta.json");

  const rs = fs.createReadStream(absFile, { encoding: "utf8" });

  let part = 0;
  let buf = "";
  let totalBytesOut = 0;
  const parts = [];

  function writePart(text) {
    part += 1;
    const fn = `part-${String(part).padStart(3, "0")}.txt`;
    const fp = path.join(outDir, fn);
    fs.writeFileSync(fp, text, "utf8");
    const bytes = Buffer.byteLength(text, "utf8");
    totalBytesOut += bytes;
    parts.push({ file: fn, bytes });
  }

  for await (const chunk of rs) {
    buf += chunk;
    while (Buffer.byteLength(buf, "utf8") >= MAX_BYTES) {
      const cut = buf.lastIndexOf("\n", MAX_BYTES);
      const idx = cut > 0 ? cut + 1 : MAX_BYTES;
      let piece = buf.slice(0, idx);
      buf = buf.slice(idx);
      if (REDACT) piece = redactText(piece);
      writePart(piece);
    }
  }

  if (buf.length) {
    let piece = buf;
    if (REDACT) piece = redactText(piece);
    writePart(piece);
  }

  let index = `# ${baseName}\n\n`;
  index += `- Source: \`${relFromRoot}\`\n`;
  index += `- Parts: **${parts.length}**\n`;
  index += `- Target size: ~${MAX_MB}MB\n`;
  index += `- Redaction: **${REDACT ? "ON" : "OFF"}**\n\n`;
  index += `## Parts\n\n`;
  for (const p of parts) {
    index += `- [${p.file}](${p.file}) (${p.bytes} bytes)\n`;
  }
  fs.writeFileSync(indexPath, index, "utf8");

  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        source: relFromRoot,
        outDir: path.relative(ROOT, outDir),
        parts,
        partsCount: parts.length,
        maxMB: MAX_MB,
        redaction: REDACT,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  return { source: relFromRoot, outDir, partsCount: parts.length, bytesOut: totalBytesOut };
}

async function main() {
  const files = listFiles(IN_PATH).filter((f) => {
    const n = path.basename(f);
    return !n.startsWith(".") && !n.endsWith(".png") && !n.endsWith(".jpg") && !n.endsWith(".jpeg") && !n.endsWith(".gif") && !n.endsWith(".webp");
  });

  fs.mkdirSync(OUT_ROOT, { recursive: true });

  const results = [];
  for (const f of files) {
    const st = fs.statSync(f);
    if (!st.isFile()) continue;
    if (st.size === 0) continue;
    console.log("Splitting:", path.relative(ROOT, f), `(${st.size} bytes)`);
    results.push(await splitOneFile(f));
  }

  const masterIndex = path.join(OUT_ROOT, "INDEX.md");
  let md = `# Processed Dump Index\n\nGenerated: ${new Date().toISOString()}\n\n`;
  for (const r of results) {
    const rel = path.relative(OUT_ROOT, r.outDir).replace(/\\/g, "/");
    md += `- **${path.basename(r.outDir)}** — ${r.partsCount} parts — [index](${rel}/index.md)\n`;
  }
  fs.writeFileSync(masterIndex, md, "utf8");

  console.log("\nDONE:");
  console.log("Processed:", results.length, "files");
  console.log("Wrote:", path.relative(ROOT, masterIndex));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
