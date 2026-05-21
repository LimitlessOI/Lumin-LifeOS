// services/memory-links.js
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool();

/**
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 */
export async function createLink(fromId, toId, linkType, pool) {
  if (!['project', 'person', 'failure_pattern', 'decision_pattern', 'lesson'].includes(linkType)) {
    throw new Error(`Invalid link_type: ${linkType}`);
  }

  const capsuleFrom = await pool.query('SELECT * FROM memory_capsules WHERE capsule_id = $1', [fromId]);
  if (capsuleFrom.rows.length === 0) {
    throw new Error(`Capsule not found: ${fromId}`);
  }

  const capsuleTo = await pool.query('SELECT * FROM memory_capsules WHERE capsule_id = $1', [toId]);
  if (capsuleTo.rows.length === 0) {
    throw new Error(`Capsule not found: ${toId}`);
  }

  const linkId = uuidv4();
  await pool.query('INSERT INTO associative_links (id, capsule_id_from, capsule_id_to, link_type, created_at) VALUES ($1, $2, $3, $4, $5)', [linkId, fromId, toId, linkType, new Date()]);
  await pool.query('INSERT INTO memory_use_receipts (receipt_type, note) VALUES ($1, $2)', ['capsule_receipt', 'associative_link_creation']);

  return { link_id: linkId };
}

export async function getLinkedCapsules(capsuleId, pool) {
  const linksFrom = await pool.query('SELECT capsule_id_to as capsule_id, link_type FROM associative_links WHERE capsule_id_from = $1', [capsuleId]);
  const linksTo = await pool.query('SELECT capsule_id_from as capsule_id, link_type FROM associative_links WHERE capsule_id_to = $1', [capsuleId]);

  const combinedLinks = [...linksFrom.rows, ...linksTo.rows];
  return combinedLinks;
}

export async function isLinkUsedAsAuthority(context) {
  if (context.authz_source === 'associative_link') {
    throw { halt_code: 'ASSOCIATION_TREATED_AS_TRUTH' };
  }
  return false;
}
```

```sql
-- db/migrations/20260521_memory_capsule_links.sql
ct associative_links (
  id UUID PK DEFAULT gen_random_uuid(),
  capsule_id_from UUID REFS memory_capsules(capsule_id),
  capsule_id_to UUID REFS memory_capsules(capsule_id),
  link_type TEXT CHECK (link_type IN ('project','person','failure_pattern','decision_pattern','lesson')),
  created_at TIMESTAMPTZ now
);