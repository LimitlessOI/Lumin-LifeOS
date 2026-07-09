/**
 * SYNOPSIS: Product-scoped founder memory resolver + mandatory auto-inject at product load.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo-root.js';
import { createFounderMemoryStore, productIdFromHomePath } from './founder-memory-store.js';

let cachedProductSlugs = null;

function listProductSlugs() {
  if (cachedProductSlugs) return cachedProductSlugs;
  const root = path.join(REPO_ROOT, 'docs/products');
  const slugs = new Set(['lifeos', 'memory-system', 'builderos']);
  if (!fs.existsSync(root)) {
    cachedProductSlugs = [...slugs];
    return cachedProductSlugs;
  }
  function walk(dir, prefix = '') {
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (fs.statSync(full).isDirectory()) {
        if (fs.existsSync(path.join(full, 'PRODUCT_HOME.md'))) slugs.add(rel.toLowerCase());
        walk(full, rel);
      }
    }
  }
  walk(root);
  cachedProductSlugs = [...slugs].sort((a, b) => b.length - a.length);
  return cachedProductSlugs;
}

export function inferProductIdsFromMessage(text, explicitProductId = null) {
  if (explicitProductId) return [String(explicitProductId).trim().toLowerCase()];
  const t = String(text || '').toLowerCase();
  const hits = [];
  for (const slug of listProductSlugs()) {
    const needle = slug.replace(/\//g, ' ');
    if (t.includes(slug) || (needle.length > 4 && t.includes(needle))) hits.push(slug);
  }
  return hits.length ? [...new Set(hits)] : ['lifeos'];
}

const MEMORY_BLOCK_HEADER = '## FOUNDER MEMORY (auto-injected — cite receipt_id for claims)';

export function formatMemoryBlock(entries, productId) {
  if (!entries?.length) {
    return [
      MEMORY_BLOCK_HEADER,
      '',
      `_No tagged founder↔AI exchanges yet for \`${productId}\`. Claims about founder approval are UNVERIFIED until receipt-linked._`,
      '',
    ].join('\n');
  }

  const lines = [MEMORY_BLOCK_HEADER, '', `Product: \`${productId}\` · ${entries.length} recent entries`, ''];
  for (const e of entries) {
    lines.push(
      `### [${e.classification}] ${e.occurred_at} · receipt \`${e.receipt_id}\``,
      `- Session: ${e.session_id}`,
      `- Role: ${e.role}`,
      '',
      String(e.content || e.content_preview || '').slice(0, 1200),
      ''
    );
  }
  lines.push(
    '_Integrity rule: any claim that the founder approved/decided X must cite a receipt_id above or downgrade to UNVERIFIED._',
    ''
  );
  return lines.join('\n');
}

export async function resolveProductFounderMemory({ productId, pool, limit = 40 } = {}) {
  const pid = String(productId || '').trim().toLowerCase();
  if (!pid) {
    return { product_id: null, entries: [], memory_block: '', inject_receipt: null };
  }

  const store = createFounderMemoryStore(pool);
  const entries = await store.listByProduct(pid, { limit });
  const memory_block = formatMemoryBlock(entries, pid);

  return {
    product_id: pid,
    entries,
    memory_block,
    entry_count: entries.length,
    inject_receipt: {
      schema: 'founder_memory_inject_v1',
      product_id: pid,
      entry_count: entries.length,
      injected_at: new Date().toISOString(),
      mandatory: true,
    },
  };
}

export async function loadProductHomeWithFounderMemory({
  productHomePath,
  productId = null,
  pool = null,
  limit = 40,
} = {}) {
  const pid = (productId || productIdFromHomePath(productHomePath) || '').toLowerCase();
  const rel = String(
    productHomePath || (pid ? `docs/products/${pid}/PRODUCT_HOME.md` : '')
  ).replace(/\\/g, '/');
  const fullPath = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);

  let productHomeText = '';
  if (rel && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    productHomeText = fs.readFileSync(fullPath, 'utf8');
  }

  const memory = await resolveProductFounderMemory({ productId: pid, pool, limit });
  const fullContext = [
    productHomeText.trim(),
    '',
    '---',
    '',
    memory.memory_block,
  ].filter(Boolean).join('\n');

  return {
    product_id: pid,
    product_home_path: rel,
    product_home_text: productHomeText,
    memory_block: memory.memory_block,
    full_context: fullContext,
    entries: memory.entries,
    inject_receipt: memory.inject_receipt,
    lazy_loader: {
      required_if_truncated: true,
      endpoint: `/api/v1/founder-memory/product/${encodeURIComponent(pid)}/context`,
      description: 'Returns full founder memory block for product — agents must call if auto-inject truncated.',
    },
  };
}

export async function injectProductMemoryIntoContext({
  productId,
  productHomeText = '',
  pool = null,
  limit = 40,
} = {}) {
  const memory = await resolveProductFounderMemory({ productId, pool, limit });
  const fullContext = [
    String(productHomeText || '').trim(),
    '',
    '---',
    '',
    memory.memory_block,
  ].filter(Boolean).join('\n');

  return {
    product_id: memory.product_id,
    memory_block: memory.memory_block,
    full_context: fullContext,
    entries: memory.entries,
    inject_receipt: memory.inject_receipt,
  };
}

export function assertProductMemoryInContext(contextText, { productId, marker = MEMORY_BLOCK_HEADER } = {}) {
  const text = String(contextText || '');
  const hasBlock = text.includes(marker);
  const hasProduct = productId ? text.toLowerCase().includes(String(productId).toLowerCase()) : true;
  return {
    ok: hasBlock && hasProduct,
    has_memory_block: hasBlock,
    has_product_tag: hasProduct,
  };
}
