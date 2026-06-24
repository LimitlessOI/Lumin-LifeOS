/**
 * SYNOPSIS: LifeRE self-audit — coder gap scan with machine receipts.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const report = {
  schema: 'lifere_self_audit_v1',
  at: new Date().toISOString(),
  passed: [],
  failed: [],
  warnings: [],
};

function step(id, ok, detail = '') {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
}

function warn(id, detail) {
  report.warnings.push({ id, detail });
}

const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');
const outreach = fs.readFileSync(path.join(ROOT, 'services/lifere-outreach-bridge.js'), 'utf8');
const vapiCore = fs.readFileSync(path.join(ROOT, 'routes/api-v1-core.js'), 'utf8');
const council = fs.readFileSync(path.join(ROOT, 'services/lifere-council-router.js'), 'utf8');
const dealSide = fs.readFileSync(path.join(ROOT, 'services/lifere-deal-side-os.js'), 'utf8');
const lifereV1 = fs.readFileSync(path.join(ROOT, 'services/lifere-os-v1.js'), 'utf8');
const clientComms = fs.readFileSync(path.join(ROOT, 'services/lifere-client-comms.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'public/overlay/lifeos-lifere.html'), 'utf8');

step('AUD-01_alpha_gate_script', fs.existsSync(path.join(ROOT, 'scripts/run-lifere-alpha-e2e.mjs')));
step('AUD-02_outreach_execute_route', routes.includes('/outreach/execute') && outreach.includes('executeTaskById'));
step('AUD-02b_alpha_daily_cycle', routes.includes('/alpha/daily-cycle'));
step('AUD-02c_founder_attempt', routes.includes('/alpha/founder-attempt'));
step('AUD-02d_follow_up_queue', routes.includes('/follow-up/queue'));
step('AUD-03_outreach_approve_route', routes.includes('/outreach/approve') && outreach.includes('approveTask'));
step('AUD-04_vapi_lifere_fanout', fs.readFileSync(path.join(ROOT, 'core/vapi-integration.js'), 'utf8').includes('lifere-receptionist-bridge'));
step('AUD-05_council_llm_hook', council.includes('callCouncilMember'));
step('AUD-06_deal_workflow', dealSide.includes('listBuyerClients') || dealSide.includes('buyerWorkflowStage'));
step('AUD-07_deal_detail_ui', html.includes('tc-deal-detail') && html.includes('loadDealDetail'));
step('AUD-07b_chair_readable_ui', html.includes('renderChairBrief') && html.includes('info-card'));
step('AUD-12_approval_execute_on_resolve', clientComms.includes('resolveQueueItem') && routes.includes('resolveQueueItem'));
step('AUD-13_buyer_advance_route', routes.includes('/deals/buyers/:ref/advance') && dealSide.includes('advanceBuyerStage'));
step('AUD-13b_seller_advance_route', routes.includes('/deals/sellers/:ref/advance') && dealSide.includes('advanceSellerStage'));
step('AUD-16_boldtrail_on_approve', clientComms.includes('pushApprovedFollowUp'));
step('AUD-17_socialmediaos_bridge', fs.existsSync(path.join(ROOT, 'services/lifere-socialmediaos-bridge.js')) && routes.includes('/marketing/socialmediaos/status'));
step('AUD-18_builder_twin', fs.existsSync(path.join(ROOT, 'builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/BLUEPRINT_BUILDER_TWIN.json')));
const smoBridge = fs.readFileSync(path.join(ROOT, 'services/lifere-socialmediaos-bridge.js'), 'utf8');
step('AUD-19_content_brief_gate',
  fs.existsSync(path.join(ROOT, 'services/lifere-content-brief-engine.js'))
  && routes.includes('/marketing/content-brief/generate')
  && html.includes('data-lifere="content-brief"')
  && smoBridge.includes('assertApprovedBrief'));
step('AUD-14_comms_log_route', routes.includes('/client-comms/log') && clientComms.includes('listCommsLog'));
step('AUD-15_alpha_approval_seed', fs.readFileSync(path.join(ROOT, 'services/lifere-alpha-daily-cycle.js'), 'utf8').includes('approval_draft_seeded'));
step('AUD-08_ssot_lifere_v1', /AMENDMENT_LIFERE/.test(lifereV1));
step('AUD-09_migrations', fs.existsSync(path.join(ROOT, 'db/migrations/20260613_lifere_twin_framework.sql')));
step('AUD-10_w1_w6_services', fs.readdirSync(path.join(ROOT, 'services')).filter((f) => f.startsWith('lifere-')).length >= 25);

for (const script of ['run-lifere-alpha-gate', 'lifeos:lifere-az-acceptance']) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (!pkg.scripts?.[script] && script.startsWith('lifeos')) {
    warn('AUD-W01', `missing npm script ${script}`);
  }
}

const gate = spawnSync('npm', ['run', 'lifeos:lifere-alpha-gate'], { cwd: ROOT, encoding: 'utf8' });
step('AUD-11_alpha_gate_pass', gate.status === 0, gate.stderr?.slice(-200));

const verdict = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/OBJECTIVE_VERDICT.json'),
  'utf8',
));
if (verdict.founder_usability_pass !== true) {
  warn('AUD-W02', 'founder_usability_pass still false — Alpha gate blocked until founder confirm');
}

report.ok = report.failed.length === 0;
report.gap_count = report.failed.length;
report.warning_count = report.warnings.length;
report.product_z_honest = report.ok && report.warnings.every((w) => w.id === 'AUD-W02');

const out = path.join(ROOT, 'products/receipts/LIFERE_SELF_AUDIT.json');
fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
