/**
 * SYNOPSIS: End-to-end factory demo for FACTORY-DEMO-SAMPLE-0001.
 * Runs the sample mission through dispatchExecuteMission with local runners.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { dispatchExecuteMission } from '../factory-staging/factory-core/builder/run-mission.js';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const assertionRunner = {
  readFile: async (relPath) => fs.readFileSync(path.join(repoRoot, relPath), 'utf8'),
  importModule: async (relPath) => {
    const target = path.join(repoRoot, relPath);
    if (!fs.existsSync(target)) return undefined;
    const mod = await import(pathToFileURL(target).href);
    return mod;
  },
  http: async ({ method = 'GET', path: p, headers = {} }) => {
    const url = `http://127.0.0.1:${process.env.PORT || 8080}${p}`;
    try {
      const res = await fetch(url, { method, headers });
      return { status: res.status };
    } catch {
      return { status: 0 };
    }
  },
};

const codegenRunner = null;

async function main() {
  const { httpStatus, body } = await dispatchExecuteMission(
    { mission_id: 'FACTORY-DEMO-SAMPLE-0001' },
    { assertionRunner, codegenRunner },
  );
  console.log(JSON.stringify({ httpStatus, body }, null, 2));
  process.exit(httpStatus === 200 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
