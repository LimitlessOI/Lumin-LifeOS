#!/usr/bin/env node
/**
 * SYNOPSIS: Marketplace Opportunity Scanner acceptance.
 * PASS = scoreOpportunity is real, deterministic, and reachable from a real
 * mounted route -- not just correct in isolation.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'MARKETPLACE-OPPORTUNITY-SCANNER-0001';
const SERVICE = path.join(ROOT, 'services/marketplace-opportunity-scanner.js');
const ROUTE = path.join(ROOT, 'routes/marketplace-opportunity-routes.js');
const MOUNT_FILE = path.join(ROOT, 'startup/register-founder-runtime-routes.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'MARKETPLACE_OPPORTUNITY_SCANNER_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/MARKETPLACE_OPPORTUNITY_SCANNER_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'marketplace_opportunity_scanner_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
  (ok ? report.tests_passed : report.tests_failed).push(name);
}

function finish() {
  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Marketplace Opportunity Scanner',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'First real stage of the zero-capital autonomous opportunity engine -- pure deterministic scoring + persistence, zero capital risk, zero AI/model cost.',
    },
    verdictExtra: {
      acceptance_command: 'npm run marketplace:opportunity-scanner:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

step('service_file_exists', fs.existsSync(SERVICE), SERVICE);
if (fs.existsSync(SERVICE)) {
  try {
    const mod = await import(`file://${SERVICE}?t=${Date.now()}`);
    step('exports_all_functions',
      typeof mod.scoreOpportunity === 'function'
        && typeof mod.recordOpportunity === 'function'
        && typeof mod.listOpportunities === 'function'
        && typeof mod.updateOpportunityStatus === 'function',
      { exported: Object.keys(mod) });

    if (typeof mod.scoreOpportunity === 'function') {
      const strong = mod.scoreOpportunity({ demand: 90, margin: 80, trend: 85, competition: 20, capitalRequired: 10, complexity: 15, risk: 10 });
      step('strong_signal_scores_above_70', strong.score > 70 && strong.confidence === 'full', strong);

      const weak = mod.scoreOpportunity({ demand: 15, margin: 10, trend: 20, competition: 90, capitalRequired: 85, complexity: 80, risk: 75 });
      step('weak_signal_scores_below_30', weak.score < 30 && weak.confidence === 'full', weak);

      const partial = mod.scoreOpportunity({ demand: 80, margin: 70 });
      step('partial_data_flagged_not_hidden',
        partial.confidence === 'partial' && Array.isArray(partial.missingFactors) && partial.missingFactors.length === 5,
        partial);

      const empty = mod.scoreOpportunity({});
      step('empty_signals_confidence_none', empty.confidence === 'none' && empty.score === 0, empty);

      const s1 = mod.scoreOpportunity({ demand: 55, margin: 45, trend: 60, competition: 40, capitalRequired: 30, complexity: 25, risk: 20 }).score;
      const s2 = mod.scoreOpportunity({ demand: 55, margin: 45, trend: 60, competition: 40, capitalRequired: 30, complexity: 25, risk: 20 }).score;
      step('deterministic_same_input_same_output', s1 === s2, { s1, s2 });
    }
  } catch (err) {
    step('service_imports_and_behaves_correctly', false, { error: err.message, stack: err.stack });
  }
}

// Reachability enforcement (per the standing CLAUDE.md rule): the scorer must
// actually be consumed by a real route, and that route must actually be mounted.
step('route_file_exists', fs.existsSync(ROUTE), ROUTE);
if (fs.existsSync(ROUTE)) {
  const src = fs.readFileSync(ROUTE, 'utf8');
  step('route_imports_and_calls_scanner_service',
    /from ['"]\.\.\/services\/marketplace-opportunity-scanner\.js['"]/.test(src)
      && src.includes('recordOpportunity(') && src.includes('listOpportunities('),
    'routes/marketplace-opportunity-routes.js must import from and call the scanner service, not just import it');
}

step('mount_file_exists', fs.existsSync(MOUNT_FILE), MOUNT_FILE);
if (fs.existsSync(MOUNT_FILE)) {
  const src = fs.readFileSync(MOUNT_FILE, 'utf8');
  step('route_is_actually_mounted',
    /from ["']\.\.\/routes\/marketplace-opportunity-routes\.js["']/.test(src)
      && src.includes('/api/v1/marketplace/opportunities')
      && src.includes('createMarketplaceOpportunityRoutes('),
    'must be imported AND app.use()-mounted in the real production startup file, not just created');
}

finish();
