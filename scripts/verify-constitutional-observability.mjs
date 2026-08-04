/**
 * SYNOPSIS: Runtime observability gate — prove each constitutional principle is backed by an executable behavior and a measurement.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'data', 'constitutional-framework', 'PRINCIPLE_RUNTIME_MAP.json');
const REPORT_PATH = path.join(ROOT, 'data', 'constitutional-framework', 'reports', 'CONSTITUTIONAL_OBSERVABILITY_REPORT.json');
const NORTH_STAR = path.join(ROOT, 'docs', 'constitution', 'NORTH_STAR_SSOT.md');
const FRAMEWORK = path.join(ROOT, 'docs', 'constitution', 'CONSTITUTIONAL_FRAMEWORK_v1.md');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return ''; }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// GAP-FILL, 2026-08-03: independent audit finding F-07 -- every verifier below
// (except north_star_present, which has its own fix) only imports a service
// file directly and asserts it behaves sanely in isolation. That proves the
// library works; it does NOT prove anything in the live system ever calls it.
// The audit's own repair order, item 2: "until PASS means a runtime action
// was observed citing its governing principle, every other number is
// untrustworthy." This adds that missing half: a real grep-based check of
// whether the runtime dirs (not scripts/, not tests/) actually import each
// service. Deliberately NOT changed: the exit-code gate this script already
// enforces in builder:preflight. Flipping "runtime unreachable" into a hard
// FAIL today would immediately block every commit repo-wide (all 9 engines
// checked are currently unreachable, confirmed independently) over a finding
// the founder hasn't yet decided how to act on -- same non-blocking pattern
// already used for scripts/check-orphaned-duplicates.mjs. This makes the
// report honest; it does not unilaterally expand the gate's blast radius.
const RUNTIME_GLOBS = ['routes', 'startup', 'core', 'middleware'];

function checkRuntimeReachable(serviceRelPath) {
  // serviceRelPath like 'services/reality-alignment.js'
  const base = path.basename(serviceRelPath, '.js');
  const importers = [];
  for (const dir of RUNTIME_GLOBS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.js')) continue;
      const fp = path.join(dirPath, file);
      const text = readText(fp);
      if (text.includes(`services/${base}.js'`) || text.includes(`services/${base}.js"`) || text.includes(`services/${base}'`) || text.includes(`services/${base}"`)) {
        importers.push(`${dir}/${file}`);
      }
    }
  }
  const serverText = readText(path.join(ROOT, 'server.js'));
  if (serverText.includes(`services/${base}.js`) || serverText.includes(`services/${base}'`)) {
    importers.push('server.js');
  }
  return { reachable: importers.length > 0, importers };
}

function runParity() {
  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/verify-constitutional-parity.mjs'], { cwd: ROOT });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.on('close', (code) => resolve({ ok: code === 0, stdout, code }));
    child.on('error', () => resolve({ ok: false, stdout: '', code: -1 }));
  });
}

const verifiers = {
  async north_star_present() {
    const text = readText(NORTH_STAR) + ' ' + readText(FRAMEWORK);
    assert(text.toLowerCase().includes('constitutional learning institution'), 'Mission phrase not found');
  },

  async design_equation_reality() {
    const { computeRealityAlignment } = await import('../services/reality-alignment.js');
    const pkg = {
      observed: ['deadline met'],
      experienced: ['relief'],
      remembered: ['past pressure'],
      predicted: ['stable launch'],
      shared: ['launch is on track']
    };
    const result = computeRealityAlignment(pkg, 'launch is on track');
    assert(typeof result.alignment_score === 'number' && result.alignment_score >= 0 && result.alignment_score <= 1, 'alignment_score invalid');
    assert(Array.isArray(result.drift_report), 'drift_report missing');
    assert(typeof result.reconciliation === 'string', 'reconciliation missing');
  },

  async coaching_protocol_empowerment() {
    const { observe, becomeCurious, helpFeelUnderstood, expandLandscape, verifySharedUnderstanding, explorePaths } = await import('../services/lifeos-coaching-protocol.js');
    const observed = observe('I feel stuck at work');
    assert(typeof observed.observation === 'string' && observed.observation.length > 0, 'observe failed');
    const question = becomeCurious(observed.observation);
    assert(typeof question === 'string' && question.length > 0, 'becomeCurious failed');
    const reflection = helpFeelUnderstood({ nodes: [], edges: [] }, 'I feel stuck at work');
    assert(typeof reflection === 'string' && reflection.length > 0, 'helpFeelUnderstood failed');
    const expansion = expandLandscape({ nodes: [], edges: [] }, 'work');
    assert(Array.isArray(expansion.perspectives), 'expandLandscape failed');
    const shared = verifySharedUnderstanding('You feel stuck at work', 'Yes');
    assert(typeof shared.aligned === 'boolean', 'verifySharedUnderstanding failed');
    const paths = explorePaths({ nodes: [], edges: [] }, 'work', true);
    assert(Array.isArray(paths.paths), 'explorePaths failed');
  },

  async solomon_withholds_recommendation() {
    const { createEvidencePackage, addFinding, addRecommendation, getRevelation } = await import('../services/solomon-wisdom-lab.js');
    let pkg = createEvidencePackage('Should we expand?');
    pkg = addFinding(pkg, { type: 'evidence', content: 'Builder velocity is slowing.' });
    pkg = addRecommendation(pkg, 'Do not expand unless reality demonstrates a missing capability.', true);
    assert(getRevelation(pkg, null) === null, 'Solomon did not withhold recommendation before chair decision');
    assert(typeof getRevelation(pkg, 'Chair chooses to wait') === 'string', 'Solomon did not reveal recommendation after chair decision');
  },

  async independent_judgment_gate() {
    await verifiers.solomon_withholds_recommendation();
  },

  async solomon_charter_shape() {
    const { createEvidencePackage, addFinding } = await import('../services/solomon-wisdom-lab.js');
    let pkg = createEvidencePackage('Test topic');
    pkg = addFinding(pkg, { type: 'evidence', content: 'x' });
    assert(Array.isArray(pkg.findings), 'findings missing');
    assert(Array.isArray(pkg.models), 'models missing');
    assert(Array.isArray(pkg.constitutionalTensions), 'constitutionalTensions missing');
    assert(pkg.confidence && typeof pkg.confidence === 'object', 'confidence missing');
    assert('recommendation' in pkg, 'recommendation field missing');
  },

  async solomon_deliverables() {
    await verifiers.solomon_charter_shape();
  },

  async chair_solomon_calibration() {
    const { recordPrediction, recordOutcome, getCalibrationScore } = await import('../services/calibration-ledger.js');
    const chairId = recordPrediction({ officeId: 'chair', modelId: 'm1', prediction: 'success' });
    const solomonId = recordPrediction({ officeId: 'solomon', modelId: 'm2', prediction: 'caution' });
    assert(recordOutcome(chairId, 'success'), 'chair outcome not recorded');
    assert(recordOutcome(solomonId, 'caution'), 'solomon outcome not recorded');
    assert(getCalibrationScore('chair') === 1, 'chair calibration score incorrect');
    assert(getCalibrationScore('solomon') === 1, 'solomon calibration score incorrect');
  },

  async least_invasive_readiness() {
    const { assessReadiness } = await import('../services/readiness-engine.js');
    const recipient = { emotionalState: 'calm', cognitiveLoad: 0.3, context: {}, history: [], constellation: { avoidances: [] } };
    const insight = { topic: 'test', complexity: 'low', emotionalWeight: 'low' };
    const result = assessReadiness(recipient, insight);
    assert(typeof result.readiness_score === 'number' && result.readiness_score >= 0 && result.readiness_score <= 1, 'readiness_score invalid');
    assert(typeof result.risk_if_forced === 'string' && result.risk_if_forced.length > 0, 'risk_if_forced missing');
  },

  async builder_simplicity_reuse() {
    const cv = await import('../services/confidence-vectors.js');
    assert(typeof cv.computeConfidenceVector === 'function', 'computeConfidenceVector missing');
    assert(typeof cv.combineConfidenceVectors === 'function', 'combineConfidenceVectors missing');
    assert(typeof cv.calibrateConfidence === 'function', 'calibrateConfidence missing');
    assert(Array.isArray(cv.DIMENSIONS) && cv.DIMENSIONS.length > 0, 'DIMENSIONS missing');
  },

  async human_constellation_canonical() {
    const { createConstellation, addObservation, weightEdge, projectForProduct } = await import('../services/human-constellation.js');
    const c = createConstellation('u1');
    const value = addObservation(c, 'value', { label: 'family' });
    const goal = addObservation(c, 'goal', { label: 'health' });
    weightEdge(c, value.id, goal.id, { strength: 0.85, stability: 0.9 });
    assert(c.nodes.size === 2, 'nodes not added');
    assert(c.edges.get(value.id).get(goal.id).strength === 0.85, 'edge weight not set');
    const projection = projectForProduct(c, 'lifeos');
    assert(Array.isArray(projection.nodes), 'projection missing nodes');
  },

  async quality_of_questions() {
    const { askBetterQuestion } = await import('../services/perspective-expansion.js');
    const constellation = {
      nodes: [
        { type: 'needs', name: 'autonomy' },
        { type: 'goals', name: 'career growth' },
        { type: 'values', name: 'integrity' }
      ],
      edges: []
    };
    const question = askBetterQuestion(constellation);
    assert(typeof question === 'string' && question.length > 0, 'no better question generated');
  },

  async entity_twin_framework() {
    const { createInstitutionalConstellation, addBelief, addOffice, recordPrediction, recordOutcome, getCalibrationReport } = await import('../services/institutional-constellation.js');
    const c = createInstitutionalConstellation();
    const belief = addBelief(c, 'Mission is stable', [], 0.9);
    const office = addOffice(c, 'chair', { scope: 'decision' });
    const prediction = recordPrediction(c, office.id, 'velocity improves', 0.7);
    assert(prediction && prediction.id, 'recordPrediction did not return a prediction node');
    recordOutcome(c, prediction.id, { matching_score: 0.6 });
    const report = getCalibrationReport(c);
    assert(report.total_nodes > 0, 'no institutional nodes');
    assert(report.total_edges > 0, 'no institutional edges');
    assert(typeof report.accuracy === 'number', 'accuracy missing');
  },

  async constitutional_parity() {
    const result = await runParity();
    assert(result.ok, `constitutional parity gate failed: ${result.stdout}`);
  }
};

async function main() {
  const map = readJson(MAP_PATH);
  if (!map) {
    console.error(`CONSTITUTIONAL_OBSERVABILITY: FAIL — map not found at ${MAP_PATH}`);
    process.exit(1);
  }

  const results = [];
  let passed = 0;
  let failed = 0;
  let behaviorOkRuntimeUnreachable = 0;
  let documentOnly = 0;
  const failures = [];
  const unreachableWarnings = [];

  for (const principle of map.principles) {
    const verifier = verifiers[principle.verifier];
    const entry = { id: principle.id, section: principle.section, principle: principle.principle, verifier: principle.verifier, status: 'unknown', evidence: null, error: null };
    if (!verifier) {
      entry.status = 'no_verifier';
      entry.error = `Verifier ${principle.verifier} not implemented`;
      failures.push(`${principle.id}: ${entry.error}`);
      failed++;
    } else {
      try {
        const start = Date.now();
        await verifier();
        const evidence = { runtime_artifact: principle.runtime_artifact, measurement: principle.measurement, pass_criteria: principle.pass_criteria, duration_ms: Date.now() - start };

        // GAP-FILL, 2026-08-03 (audit finding F-07): behavior-in-isolation is
        // necessary but not sufficient. A principle only genuinely "passes"
        // when its required service is also reachable from a real runtime
        // path -- otherwise this is a library unit test, not proof the
        // constitution governs anything the system actually does.
        if (principle.required_service?.startsWith('scripts/')) {
          // A scripts/*.mjs required_service is a CI-gate verifier, not a
          // business-logic module -- its correct invocation path is being
          // spawned from builder:preflight (as this principle's own verifier
          // already does above via runParity()), not being imported from
          // routes/. The routes/startup/core/middleware check is a category
          // error for this shape; being wired into builder:preflight IS its
          // real reachability.
          evidence.runtime_reachable = true;
          evidence.runtime_wiring = 'invoked from builder:preflight (CI gate), not a routes/ import';
          entry.status = 'pass';
          passed++;
        } else if (principle.required_service) {
          const { reachable, importers } = checkRuntimeReachable(principle.required_service);
          evidence.runtime_reachable = reachable;
          evidence.runtime_importers = importers;
          if (reachable) {
            entry.status = 'pass';
            passed++;
          } else {
            entry.status = 'behavior_ok_runtime_unreachable';
            unreachableWarnings.push(`${principle.id}: ${principle.required_service} has zero real callers in routes/startup/core/middleware/server.js`);
            behaviorOkRuntimeUnreachable++;
          }
        } else {
          // No required_service means this principle can't be behaviorally
          // wired at all (e.g. a mission statement) -- document presence is
          // real, but it is not "installed" in the governing standard's
          // sense (enforceable rule / runtime behavior / calibration loop).
          entry.status = 'document_only';
          documentOnly++;
        }
        entry.evidence = evidence;
      } catch (err) {
        entry.status = 'fail';
        entry.error = err.message;
        failures.push(`${principle.id}: ${err.message}`);
        failed++;
      }
    }
    results.push(entry);
  }

  const report = {
    schema: 'constitutional_observability_report_v1',
    version: map.version,
    generated_at: new Date().toISOString(),
    source_map: MAP_PATH,
    summary: {
      total: map.principles.length,
      pass: passed,
      behavior_ok_runtime_unreachable: behaviorOkRuntimeUnreachable,
      document_only: documentOnly,
      fail: failed,
      no_verifier: map.principles.length - passed - behaviorOkRuntimeUnreachable - documentOnly - failed,
    },
    results,
    failures,
    unreachable_warnings: unreachableWarnings,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  // Gate behavior is deliberately UNCHANGED from before this fix: only a
  // thrown behavioral assertion (or a missing verifier) hard-fails
  // builder:preflight. `behavior_ok_runtime_unreachable` is reported loudly
  // but does not block -- flipping that today would hard-fail every commit
  // repo-wide over a finding (F-03: 9/9 checked engines currently
  // unreachable) the founder has not yet decided how to act on. Same
  // non-blocking precedent as scripts/check-orphaned-duplicates.mjs.
  if (failed > 0) {
    console.error('CONSTITUTIONAL_OBSERVABILITY: FAIL');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  if (unreachableWarnings.length) {
    console.warn(`CONSTITUTIONAL_OBSERVABILITY: ${unreachableWarnings.length} principle(s) pass behavior-in-isolation but are NOT runtime-reachable (not a block, see report):`);
    for (const w of unreachableWarnings) console.warn(`  - ${w}`);
  }

  console.log(`CONSTITUTIONAL_OBSERVABILITY: PASS (${passed} fully wired, ${behaviorOkRuntimeUnreachable} behavior-only, ${documentOnly} document-only, of ${map.principles.length})`);
  console.log(`  report: ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error('CONSTITUTIONAL_OBSERVABILITY: ERROR', err.message);
  process.exit(1);
});
