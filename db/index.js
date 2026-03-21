/**
 * Drizzle database connection
 *
 * Shares the same pg Pool as server.js — no second connection.
 * Import { db } in new service files instead of raw pool.query().
 *
 * Usage:
 *   import { db } from '../db/index.js';
 *   import { ideas } from '../db/schema.js';
 *
 *   const allIdeas = await db.select().from(ideas).where(eq(ideas.status, 'queued'));
 *   await db.insert(ideas).values({ title: 'My idea', source: 'manual' });
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

let _db = null;

/**
 * Initialize Drizzle with an existing pg Pool.
 * Call this from server.js startup: initDb(pool)
 */
export function initDb(pool) {
  _db = drizzle(pool, { schema });
  return _db;
}

/**
 * Get the Drizzle db instance.
 * Throws if initDb() was not called yet.
 */
export function getDb() {
  if (!_db) throw new Error('DB not initialized. Call initDb(pool) in server startup.');
  return _db;
}

// Convenience: export db as a proxy so `import { db }` works anywhere after init
export const db = new Proxy({}, {
  get(_, prop) {
    return getDb()[prop];
  },
});

export { schema };
