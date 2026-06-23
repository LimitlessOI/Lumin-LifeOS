/**
 * SYNOPSIS: Seed founder extension twin files for Adam household.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SEEDS = {
  'data/twins/founder/adam/adam.json': {
    schema: 'lifere_adam_twin_v1',
    owner: 'adam',
    goals: ['30k/mo GCI', 'family time protected', 'BuilderOS to Point B'],
    motivations: ['freedom', 'impact', 'family'],
    label: 'THINK',
  },
  'data/twins/founder/sherry/sherry.json': {
    schema: 'lifere_sherry_twin_v1',
    owner: 'sherry',
    private_wall: true,
    wisdom_signals_consent: false,
  },
  'data/twins/founder/household/marriage.json': {
    schema: 'lifere_marriage_twin_v1',
    edge_id: 'adam_sherry_marriage',
    parties: ['adam', 'sherry'],
    shared_goals: ['family_dinner_4x_week'],
  },
  'data/twins/founder/household/family.json': {
    schema: 'lifere_family_twin_v1',
    children_goals: [],
  },
  'data/twins/founder/household/household.json': {
    schema: 'lifere_household_twin_v1',
    weekly_plan: {},
  },
  'data/twins/founder/governance/founder.json': {
    schema: 'lifere_founder_governance_twin_v1',
    bp_priority_ref: 'builderos-reboot/BP_PRIORITY.json',
    no_personal_secrets: true,
  },
};

export function seedFounderTwins({ force = false } = {}) {
  const written = [];
  for (const [rel, payload] of Object.entries(SEEDS)) {
    const fp = path.join(ROOT, rel);
    if (!force && fs.existsSync(fp)) continue;
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, `${JSON.stringify({ ...payload, updated_at: new Date().toISOString() }, null, 2)}\n`);
    written.push(rel);
  }
  return { ok: true, written };
}

if (import.meta.url.startsWith('file:') && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(seedFounderTwins({ force: process.argv.includes('--force') }), null, 2));
}
