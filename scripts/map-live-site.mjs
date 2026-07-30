/**
 * SYNOPSIS: Static site surface mapper — generates a template catalog of public overlays and API routes.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { join, basename, dirname, resolve } from "node:path";

const ROOT = process.cwd();

async function listRecursive(dir, predicate) {
  const out = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (predicate(entry.name, full)) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return (m?.[1] || h1?.[1] || "").trim().slice(0, 120);
}

function extractDescription(html) {
  const meta = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  if (meta) return meta[1].trim().slice(0, 240);
  const p = html.match(/<p[^>]*>([^<\.]{20,240})/i);
  return p ? p[1].replace(/\s+/g, " ").trim() : "";
}

async function mapOverlays() {
  const dir = join(ROOT, "public/overlay");
  const files = await listRecursive(dir, (name) => name.endsWith(".html"));
  const pages = [];
  for (const full of files.sort()) {
    const html = await readFile(full, "utf8").catch(() => "");
    const rel = full.replace(ROOT + "/public", "");
    pages.push({
      path: rel,
      public_url: `https://lumin-web-production-e3a9.up.railway.app${rel}`,
      title: extractTitle(html) || basename(full, ".html"),
      description: extractDescription(html),
      category: rel.split("/")[2] || "overlay",
    });
  }
  return pages;
}

async function buildImportMap(filePath) {
  const src = await readFile(filePath, "utf8");
  const map = new Map();
  // import { ..., createXxxRoutes, ... } from '../routes/foo-routes.js';
  const namedRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g;
  let m;
  while ((m = namedRe.exec(src))) {
    const names = m[1].split(",").map((n) => n.trim());
    const source = m[2];
    for (const n of names) {
      const alias = n.split(/\s+as\s+/);
      const local = alias[alias.length - 1].trim();
      const imported = alias[0].trim();
      if (local.startsWith("create") && local.endsWith("Routes")) {
        let resolved = source;
        if (source.startsWith(".")) {
          resolved = resolve(dirname(filePath), source).replace(ROOT + "/", "");
        }
        map.set(local, resolved);
      }
    }
  }
  return map;
}

async function mapApiGroups() {
  const regPath = join(ROOT, "startup/register-runtime-routes.js");
  const src = await readFile(regPath, "utf8");
  const importMap = await buildImportMap(regPath);
  const useRe = /app\.use\(\s*["']([^"']*)["']\s*,\s*(create[A-Za-z]+Routes)\b/g;
  const groups = [];
  let m;
  while ((m = useRe.exec(src))) {
    const prefix = m[1];
    const fn = m[2];
    const source = importMap.get(fn);
    groups.push({ prefix, module: fn, source_file: source });
  }
  const endpointsByGroup = await Promise.all(groups.map((g) => extractEndpointsFromModule(g.source_file, g.prefix)));
  return groups.map((g, i) => ({ ...g, endpoints: endpointsByGroup[i] }));
}

async function extractEndpointsFromModule(file, prefix) {
  if (!file) return [];
  const full = join(ROOT, file);
  try {
    await stat(full);
  } catch {
    return [];
  }
  const src = await readFile(full, "utf8");
  const methodRe = /router\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/g;
  const endpoints = [];
  let m;
  while ((m = methodRe.exec(src))) {
    let path = m[2];
    if (!path.startsWith("/")) path = "/" + path;
    endpoints.push({ method: m[1].toUpperCase(), path: joinPaths(prefix, path) });
  }
  return endpoints;
}

function joinPaths(a, b) {
  return `${a.replace(/\/$/, "")}/${b.replace(/^\//, "")}`.replace(/\/+/g, "/");
}

async function main() {
  const [overlays, apiGroups] = await Promise.all([mapOverlays(), mapApiGroups()]);
  const catalog = {
    generated_at: new Date().toISOString(),
    base_url: "https://lumin-web-production-e3a9.up.railway.app",
    public_pages: { count: overlays.length, pages: overlays },
    api_surface: { groups: apiGroups },
  };

  const jsonPath = join(ROOT, "products/receipts/LIVE_SITE_SURFACE_CATALOG.json");
  await writeJson(jsonPath, catalog);

  const mdPath = join(ROOT, "docs/products/site-builder/SITE_TEMPLATE_CATALOG.md");
  const md = generateMarkdown(catalog);
  await writeText(mdPath, md);

  const totalEndpoints = apiGroups.reduce((s, g) => s + g.endpoints.length, 0);
  console.log(`Mapped ${overlays.length} public pages, ${apiGroups.length} API groups, ${totalEndpoints} endpoints.`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

async function writeJson(path, obj) {
  await writeText(path, JSON.stringify(obj, null, 2));
}

async function writeText(path, text) {
  const { writeFile, mkdir } = await import("node:fs/promises");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

function generateMarkdown({ generated_at, base_url, public_pages, api_surface }) {
  let md = `# Live Site Template Catalog\n\n`;
  md += `Generated: ${generated_at}  \n`;
  md += `Base URL: ${base_url}\n\n`;
  md += `## Public Pages / Overlays (${public_pages.count})\n\n`;
  md += `| Path | Title | Description | Category |\n`;
  md += `|------|-------|-------------|----------|\n`;
  for (const p of public_pages.pages) {
    md += `| \`${p.path}\` | ${p.title} | ${p.description || "-"} | ${p.category} |\n`;
  }
  md += `\n## API Surface Groups (${api_surface.groups.length})\n\n`;
  for (const g of api_surface.groups) {
    md += `### ${g.prefix} (${g.module})\n\n`;
    if (g.source_file) md += `Source: \`${g.source_file}\`  \n`;
    if (g.endpoints.length) {
      md += `| Method | Path |\n`;
      md += `|--------|------|\n`;
      for (const e of g.endpoints.slice(0, 120)) {
        md += `| ${e.method} | \`${e.path}\` |\n`;
      }
      if (g.endpoints.length > 120) md += `| ... | *(${g.endpoints.length - 120} more endpoints)* |\n`;
    } else {
      md += `*No static endpoints extracted.*\n`;
    }
    md += `\n`;
  }
  md += `## Template Usage Notes\n\n`;
  md += `- Public pages are served under \`/overlay/<file>.html\`.\n`;
  md += `- API routes are mounted under \`/api/v1/...\` and require the appropriate key unless marked public.\n`;
  md += `- This catalog is auto-generated from \`public/overlay\` and \`startup/register-runtime-routes.js\`; re-run \`node scripts/map-live-site.mjs\` to refresh.\n`;
  return md;
}

main().catch((e) => { console.error(e); process.exit(1); });
