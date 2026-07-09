/**
 * SYNOPSIS: Canonical append-only founder↔AI memory store (DB + Lumin-Memory index).
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo-root.js';
import { fanOutFounderMemoryEntry } from './founder-memory-fanout.js';

const INDEX_PATH = path.join(REPO_ROOT, 'Lumin-Memory/01_INDEX/founder_memory_index.jsonl');

function newId(prefix = 'fme') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export function inferClassification(content, explicit) {
  if (explicit && ['decision', 'idea', 'chore'].includes(explicit)) return explicit;
  const t = String(content || '').toLowerCase();
  if (/\b(approved|decided|decision|lock in|go with|ship it|confirmed|authorize)\b/.test(t)) return 'decision';
  if (/\b(idea|what if|could we|maybe we|brainstorm|consider)\b/.test(t)) return 'idea';
  return 'chore';
}

function normalizeProductIds(productIds, productId) {
  const raw = Array.isArray(productIds) ? productIds : (productId ? [productId] : []);
  return [...new Set(raw.map((p) => String(p || '').trim().toLowerCase()).filter(Boolean))];
}

function readIndexFallback(productId, { limit = 50, classifications = null } = {}) {
  if (!fs.existsSync(INDEX_PATH)) return [];
  const lines = fs.readFileSync(INDEX_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const entries = [];
  for (const line of lines.reverse()) {
    try {
      const row = JSON.parse(line);
      const tags = (row.product_ids || []).map((p) => String(p).toLowerCase());
      if (productId && !tags.includes(String(productId).toLowerCase())) continue;
      if (classifications?.length && !classifications.includes(row.classification)) continue;
      entries.push(row);
      if (entries.length >= limit) break;
    } catch { /* skip bad line */ }
  }
  return entries;
}

export function createFounderMemoryStore(pool) {
  return {
    async append({
      sessionId,
      productIds,
      productId,
      classification,
      role,
      content,
      metadata = {},
      occurredAt = null,
      skipFanout = false,
    }) {
      const id = newId('fme');
      const receiptId = newId('fmrcpt');
      const tags = normalizeProductIds(productIds, productId);
      const cls = inferClassification(content, classification);
      const occurred_at = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString();
      const entry = {
        id,
        receipt_id: receiptId,
        session_id: String(sessionId || 'unknown'),
        product_ids: tags,
        classification: cls,
        role: role || 'founder',
        content: String(content || '').trim(),
        occurred_at,
        metadata: {
          ...metadata,
          schema: 'founder_memory_entry_v1',
          typed_receipt: true,
        },
      };

      if (!entry.content) {
        throw new Error('founder_memory_content_required');
      }

      if (pool) {
        await pool.query(
          `INSERT INTO founder_memory_entries
             (id, receipt_id, session_id, product_ids, classification, role, content, occurred_at, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
          [
            entry.id,
            entry.receipt_id,
            entry.session_id,
            entry.product_ids,
            entry.classification,
            entry.role,
            entry.content,
            entry.occurred_at,
            JSON.stringify(entry.metadata),
          ]
        );
      }

      if (!skipFanout) {
        fanOutFounderMemoryEntry(entry);
      }

      return {
        ok: true,
        entry,
        receipt: {
          schema: 'founder_memory_receipt_v1',
          receipt_id: entry.receipt_id,
          entry_id: entry.id,
          classification: entry.classification,
          product_ids: entry.product_ids,
        },
      };
    },

    async listByProduct(productId, { limit = 40, classifications = null } = {}) {
      const pid = String(productId || '').trim().toLowerCase();
      if (!pid) return [];

      if (pool) {
        let sql = `
          SELECT id, receipt_id, session_id, product_ids, classification, role, content, occurred_at, metadata
            FROM founder_memory_entries
           WHERE $1 = ANY(product_ids)
        `;
        const params = [pid];
        if (classifications?.length) {
          sql += ` AND classification = ANY($2::text[])`;
          params.push(classifications);
        }
        sql += ` ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
        params.push(Math.min(limit, 200));
        const { rows } = await pool.query(sql, params);
        return rows;
      }

      return readIndexFallback(pid, { limit, classifications });
    },

    async getByReceipt(receiptId) {
      if (!receiptId) return null;
      if (pool) {
        const { rows } = await pool.query(
          `SELECT * FROM founder_memory_entries WHERE receipt_id = $1 LIMIT 1`,
          [receiptId]
        );
        return rows[0] || null;
      }
      if (!fs.existsSync(INDEX_PATH)) return null;
      const lines = fs.readFileSync(INDEX_PATH, 'utf8').trim().split('\n').filter(Boolean);
      for (const line of lines.reverse()) {
        try {
          const row = JSON.parse(line);
          if (row.receipt_id === receiptId) return row;
        } catch { /* skip */ }
      }
      return null;
    },

    async searchByProduct(productId, query, { limit = 20 } = {}) {
      const pid = String(productId || '').trim().toLowerCase();
      const q = String(query || '').trim();
      if (!pid || !q) return [];
      if (pool) {
        const { rows } = await pool.query(
          `SELECT id, receipt_id, session_id, product_ids, classification, role, content, occurred_at
             FROM founder_memory_entries
            WHERE $1 = ANY(product_ids)
              AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
            ORDER BY occurred_at DESC
            LIMIT $3`,
          [pid, q, Math.min(limit, 100)]
        );
        return rows;
      }
      return readIndexFallback(pid, { limit }).filter((r) =>
        String(r.content_preview || '').toLowerCase().includes(q.toLowerCase())
      );
    },
  };
}

export function productIdFromHomePath(homePath) {
  const normalized = String(homePath || '').replace(/\\/g, '/');
  const m = normalized.match(/docs\/products\/(.+?)\/PRODUCT_HOME\.md$/i);
  if (m) return m[1].toLowerCase();
  const bare = normalized.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (bare && !bare.includes('/')) return bare;
  return null;
}
