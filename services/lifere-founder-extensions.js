/**
 * SYNOPSIS: LifeRE founder extension twins — Adam/Sherry household only.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FOUNDER_PATHS = {
  adam: 'data/twins/founder/adam/adam.json',
  sherry: 'data/twins/founder/sherry/sherry.json',
  marriage: 'data/twins/founder/household/marriage.json',
  family: 'data/twins/founder/household/family.json',
  household: 'data/twins/founder/household/household.json',
  governance: 'data/twins/founder/governance/founder.json',
};

export function assertFounderAccess({ userId, target = 'adam' }) {
  if (target === 'sherry' && userId !== 'sherry' && userId !== 'adam') {
    const err = new Error('FORBIDDEN_FOUNDER');
    err.status = 403;
    throw err;
  }
  if (target === 'adam' && userId !== 'adam') {
    const err = new Error('FORBIDDEN_FOUNDER');
    err.status = 403;
    throw err;
  }
}

export function createLifeREFounderExtensions() {
  function readFounderTwin(key) {
    const rel = FOUNDER_PATHS[key];
    if (!rel) return null;
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) {
      const defaults = {
        adam: { schema: 'lifere_adam_twin_v1', owner: 'adam', label: 'THINK' },
        sherry: { schema: 'lifere_sherry_twin_v1', owner: 'sherry', private_wall: true },
        marriage: { schema: 'lifere_marriage_twin_v1', edge_id: 'adam_sherry_marriage', parties: ['adam', 'sherry'] },
      };
      return defaults[key] || null;
    }
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  }

  function isFounderUser(userId) {
    return userId === 'adam' || userId === 'sherry';
  }

  return { readFounderTwin, isFounderUser, assertFounderAccess, FOUNDER_PATHS };
}
