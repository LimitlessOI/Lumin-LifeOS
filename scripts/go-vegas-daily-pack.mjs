/**
 * SYNOPSIS: Generate today's Go Vegas approve→paste pack (31+ posts).
 * Usage: npm run go-vegas:daily-pack
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGoVegasDailyPack, formatDailyPackMarkdown } from '../services/go-vegas-daily-pack.js';

const root = process.cwd();
const outDir = path.join(root, 'data', 'go-vegas-daily-packs');
const pack = buildGoVegasDailyPack({ date: new Date(), includeContest: true });
await fs.mkdir(outDir, { recursive: true });
const jsonPath = path.join(outDir, `${pack.date}.json`);
const mdPath = path.join(outDir, `${pack.date}.md`);
await fs.writeFile(jsonPath, `${JSON.stringify(pack, null, 2)}\n`);
await fs.writeFile(mdPath, formatDailyPackMarkdown(pack));
console.log(JSON.stringify({
  ok: true,
  date: pack.date,
  total: pack.counts.total,
  byAccount: pack.counts.byAccount,
  json: jsonPath,
  markdown: mdPath,
}, null, 2));