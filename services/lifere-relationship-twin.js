/**
 * SYNOPSIS: LifeRE relationship twin edge store.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createLifeRERelationshipTwin({ pool = null } = {}) {
  function edgePath(tenantId, edgeId) {
    return path.join(ROOT, 'data/twins', tenantId, 'relationships', `${edgeId}.json`);
  }

  async function readEdge({ tenantId = 'default', edgeId }) {
    const fp = edgePath(tenantId, edgeId);
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (pool) {
      const { rows } = await pool.query(`SELECT payload FROM lifere_relationship_edges WHERE edge_id = $1`, [edgeId]);
      return rows[0]?.payload || null;
    }
    return null;
  }

  async function writeEdge({ tenantId = 'default', edgeId, payload }) {
    const body = { ...payload, edge_id: edgeId, updated_at: new Date().toISOString() };
    const fp = edgePath(tenantId, edgeId);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, `${JSON.stringify(body, null, 2)}\n`);
    if (pool) {
      await pool.query(
        `INSERT INTO lifere_relationship_edges (tenant_id, edge_id, payload, updated_at)
         VALUES ($1,$2,$3, now()) ON CONFLICT (edge_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [tenantId, edgeId, body]
      );
    }
    return { ok: true, edge: body };
  }

  async function listEdgesForUser({ tenantId = 'default', userId }) {
    const dir = path.join(ROOT, 'data/twins', tenantId, 'relationships');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
      .filter((e) => (e.parties || []).includes(userId));
  }

  return { readEdge, writeEdge, listEdgesForUser };
}
