#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE runtime integration smoke — exercises services without HTTP.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeRETwinStore } from '../services/lifere-twin-store.js';
import { findBottleneck, computeConversionRates } from '../services/lifere-performance-twin.js';
import { createLifeREScenarioEngine } from '../services/lifere-scenario-engine.js';
import { createLifeREReceptionistBridge } from '../services/lifere-receptionist-bridge.js';
import { createLifeREDealSideOS } from '../services/lifere-deal-side-os.js';
import { createLifeRECouncilRouter } from '../services/lifere-council-router.js';
import { createTCStatusEngine } from '../services/tc-status-engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = { schema: 'lifere_runtime_integration_v1', passed: [], failed: [] };
const step = (id, ok, detail) => {
  (ok ? report.passed : report.failed).push(id);
  if (!ok) report[`fail_${id}`] = detail;
};

const funnel = { conversations: 100, calls: 40, appointments_set: 10, appointments_held: 8, signed_clients: 2, closings: 1 };
const rates = computeConversionRates(funnel);
const b = findBottleneck(rates, funnel);
step('RT-01_performance_bottleneck', Boolean(b.stage));

const twinStore = createLifeRETwinStore();
await twinStore.writeTwin({
  userId: 'adam',
  twinKey: 'goal',
  payload: { schema: 'lifere_goal_twin_v1', weights: { income: 0.4, family: 0.3, freedom: 0.3 } },
});
const readBack = twinStore.readTwin({ userId: 'adam', twinKey: 'goal' });
step('RT-02_twin_store_roundtrip', readBack?.weights?.income === 0.4);

const scenario = createLifeREScenarioEngine();
const sc = await scenario.compareScenarios({
  userId: 'adam',
  paths: [
    { id: 'a', allocations: { builderos_hours: 20 } },
    { id: 'b', allocations: { prospecting_hours: 20 } },
  ],
  goalWeights: { income: 0.5, family: 0.3, freedom: 0.2 },
});
step('RT-03_scenario_ranked', Array.isArray(sc.ranked_by_goal) && sc.ranked_by_goal.length === 2);

const receptionist = createLifeREReceptionistBridge();
const inbound = await receptionist.inboundSummary({
  callId: 'test-call-1',
  leadPayload: { name: 'Test Lead', intent: 'buyer' },
  userId: 'adam',
});
step('RT-04_receptionist_lead_twin', inbound.lead_twin_updated === true);

const dealSide = createLifeREDealSideOS();
await dealSide.upsertBuyer({ userId: 'adam', clientRef: 'client-1', patch: { search_criteria: { beds: 3 } } });
const buyer = await dealSide.getBuyer({ userId: 'adam', clientRef: 'client-1' });
step('RT-05_buyer_os', buyer.search_criteria?.beds === 3);

const council = createLifeRECouncilRouter();
const delib = await council.runCouncilDeliberation({ intent: 'content', message: 'What video next?' });
step('RT-06_council_roles', delib.roles_invoked?.some((r) => /Marketing/i.test(r)));

const tcEngine = createTCStatusEngine();
const mockTx = {
  status: 'active',
  close_date: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
  key_dates: {},
  documents: { checklist: [] },
  transaction_desk_id: 'td-1',
};
const tcState = tcEngine.deriveTransactionState({ transaction: mockTx, events: [{ event_type: 'td_created', created_at: new Date().toISOString() }] });
step('RT-07_tc_status_engine', Boolean(tcState.stage));

const { createLifeREChairService } = await import('../services/lifere-chair-service.js');
const chair = createLifeREChairService();
const brief = await chair.answerChairBrief({ userId: 'adam' });
step('RT-08_chair_brief', brief.ok && brief.what_should_i_do_next != null);

const { createLifeRECommandCenter } = await import('../services/lifere-command-center.js');
const cc = createLifeRECommandCenter();
const daily = await cc.buildDailyCommandCenter({ user_id: 'adam' });
step('RT-09_unified_command_center', Boolean(daily.chair));

const { createLifeRELearningPipeline } = await import('../services/lifere-learning-pipeline.js');
const learning = createLifeRELearningPipeline();
const cycle = await learning.runLearningCycle({
  userId: 'adam',
  variantA: 'hook_a',
  variantB: 'hook_b',
  metric: 'appointment_set_rate',
  winner: 'hook_b',
});
step('RT-10_learning_pipeline', cycle.ok && Boolean(cycle.experiment_id));

const { createLifeREOutreachBridge } = await import('../services/lifere-outreach-bridge.js');
const outBridge = createLifeREOutreachBridge();
const enq = await outBridge.enqueueSequence({
  userId: 'adam', sequenceId: 'rt-test', recipientRef: 'lead-1', draft: 'Follow up test',
});
step('RT-11_outreach_enqueue', enq.ok && enq.queued === true);

await dealSide.upsertBuyer({ userId: 'adam', clientRef: 'client-rt', patch: { search_criteria: { beds: 4 } } });
const listed = await dealSide.listBuyerClients({ userId: 'adam' });
step('RT-12_buyer_workflow_list', listed.clients?.some((c) => c.stage === 'searching'));

report.ok = report.failed.length === 0;
const out = path.join(ROOT, 'products/receipts/LIFERE_RUNTIME_INTEGRATION.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({ ...report, at: new Date().toISOString() }, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
