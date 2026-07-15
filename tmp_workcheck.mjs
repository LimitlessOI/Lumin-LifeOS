/**
 * SYNOPSIS: mjs — tmp_workcheck.mjs.
 */
import { planGovernedBuildQueueRun } from './services/governed-build-queue-scheduler.js';
import { loadBuildQueue } from './services/product-build-orchestrator.js';
import { mergeQueueRuntimeStatus } from './services/never-stop-product-factory.js';
import { listProductsWithQueues } from './services/governed-autonomous-shipping-loop.js';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const PRODUCTS_DIR = path.join(REPO_ROOT, 'docs/products');

async function fetchRemoteBuildQueue(productId) {
  const localPath = path.join(PRODUCTS_DIR, productId, 'BUILD_QUEUE.json');
  const relPath = path.relative(REPO_ROOT, localPath).replace(/\\/g, '/');
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  if (!token || !repo) return loadBuildQueue(productId);
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return loadBuildQueue(productId);
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}?ref=${branch}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.content === 'string') {
        const text = Buffer.from(data.content, 'base64').toString('utf8');
        return JSON.parse(text);
      }
    }
  } catch {}
  return loadBuildQueue(productId);
}

const products = listProductsWithQueues();
const cache = {};
await Promise.all(products.map(async (pid) => {
  try {
    const local = loadBuildQueue(pid);
    const remote = await fetchRemoteBuildQueue(pid);
    cache[pid] = mergeQueueRuntimeStatus(remote, local);
  } catch (err) {
    console.log('err', pid, err.message);
  }
}));
const plan = planGovernedBuildQueueRun({ products, readQueue: (id) => cache[id], maxStepsPerProduct: 1 });
console.log('total', plan.total_shippable, 'gaps', plan.total_gaps, 'runnable', plan.runnable);
for (const p of plan.by_product) {
  if (p.ship_steps.length || p.gaps.length) {
    console.log(p.product_id, 'ship', p.ship_steps.length, 'gaps', p.gaps.length);
    for (const s of p.ship_steps) {
      console.log('  ship', s.step_id, s.target_file, 'expected_exports', s.expected_exports, 'last_error', (s.last_error || '').slice(0, 80));
    }
    for (const g of p.gaps) {
      console.log('  gap', g.id, g.target_file, g.reason);
    }
  }
}
