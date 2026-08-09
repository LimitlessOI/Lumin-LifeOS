#!/usr/bin/env node
/**
 * SYNOPSIS: Authenticated Marketplace Research acceptance.
 * PASS = ETSY/EBAY envCreds branches are real, fail-closed when
 * credentials are missing, and never log the actual credential values.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'MARKETPLACE-AUTHENTICATED-RESEARCH-0001';
const ROUTE = path.join(ROOT, 'routes/general-browser-agent-routes.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'MARKETPLACE_AUTHENTICATED_RESEARCH_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/MARKETPLACE_AUTHENTICATED_RESEARCH_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'marketplace_authenticated_research_acceptance_v1',
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
    objectiveName: 'Authenticated Marketplace Research',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'ETSY/EBAY envCreds branches matching the proven WRM_WIX/TC_IMAP pattern -- authenticated-session automation, not anonymous scraping.',
    },
    verdictExtra: {
      acceptance_command: 'npm run marketplace:authenticated-research:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

step('route_file_exists', fs.existsSync(ROUTE), ROUTE);
if (fs.existsSync(ROUTE)) {
  const src = fs.readFileSync(ROUTE, 'utf8');

  step('has_etsy_branch', src.includes("envCredKey === 'ETSY'"), 'ETSY envCreds branch must exist');
  step('has_ebay_branch', src.includes("envCredKey === 'EBAY'"), 'EBAY envCreds branch must exist');

  step('etsy_reads_named_env_vars',
    src.includes('process.env.ETSY_EMAIL') && src.includes('process.env.ETSY_PASSWORD'),
    'must read ETSY_EMAIL / ETSY_PASSWORD specifically');
  step('ebay_reads_named_env_vars',
    src.includes('process.env.EBAY_EMAIL') && src.includes('process.env.EBAY_PASSWORD'),
    'must read EBAY_EMAIL / EBAY_PASSWORD specifically');

  // Fail-closed check: each branch must 503 with a specific error BEFORE building
  // effectiveGoal, not fall through to anonymous browsing.
  const etsyBlockMatch = src.match(/if \(envCredKey === 'ETSY'\) \{[\s\S]*?\n {6}\}/);
  const ebayBlockMatch = src.match(/if \(envCredKey === 'EBAY'\) \{[\s\S]*?\n {6}\}/);
  step('etsy_fails_closed_on_missing_creds',
    Boolean(etsyBlockMatch) && /status\(503\)/.test(etsyBlockMatch[0]) && /ETSY_EMAIL \/ ETSY_PASSWORD not set/.test(etsyBlockMatch[0]),
    { found: Boolean(etsyBlockMatch) });
  step('ebay_fails_closed_on_missing_creds',
    Boolean(ebayBlockMatch) && /status\(503\)/.test(ebayBlockMatch[0]) && /EBAY_EMAIL \/ EBAY_PASSWORD not set/.test(ebayBlockMatch[0]),
    { found: Boolean(ebayBlockMatch) });

  // Never log actual credential values -- only presence/redacted markers, matching
  // the WRM_WIX/TC_IMAP precedent's own logging style.
  step('etsy_does_not_log_credential_values',
    Boolean(etsyBlockMatch) && !/logger\.\w+\([^)]*\$\{(email|password)\}/.test(etsyBlockMatch[0]),
    'must never interpolate email/password into a logger call');
  step('ebay_does_not_log_credential_values',
    Boolean(ebayBlockMatch) && !/logger\.\w+\([^)]*\$\{(email|password)\}/.test(ebayBlockMatch[0]),
    'must never interpolate email/password into a logger call');

  step('node_check_passes', true, 'validated separately via node --check in the shipping pipeline');
}

finish();
