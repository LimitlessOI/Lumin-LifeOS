#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE W6 acceptance.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectCouncilRoles } from '../services/lifere-council-router.js';
import { createLifeREStrategyEvolutionEngine } from '../services/lifere-strategy-evolution-engine.js';
import { createLifeREPermissionTwin } from '../services/lifere-permission-twin.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { wave: 'W6', passed: [], failed: [] };
const step = (id, ok) => { (ok ? report.passed : report.failed).push(id); };
const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');

step('LRE-W6-T01', routes.includes('/scenario/compare'));
step('LRE-W6-T02', routes.includes('/founder/adam'));
step('LRE-W6-T03', routes.includes('/relationships'));
step('LRE-W6-T04', routes.includes('/experiments/start'));
const roles = selectCouncilRoles({ intent: 'content marketing hooks' });
step('LRE-W6-T05', roles.some((r) => /Marketing/i.test(r)));

(async () => {
  const strat = createLifeREStrategyEvolutionEngine();
  const blocked = await strat.updateWeights({ delta: { hook_weight: 0.1 }, userId: 'not_adam' });
  const perm = createLifeREPermissionTwin();
  const outbound = await perm.getAutonomyLevel({ userId: 'guest', actionType: 'sms_client' });
  step('LRE-W6-T06', outbound.level === 1 || blocked.ok === false);

  report.ok = report.failed.length === 0;
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
})();
