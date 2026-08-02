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
  const failures = [];

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
        entry.status = 'pass';
        entry.evidence = { runtime_artifact: principle.runtime_artifact, measurement: principle.measurement, pass_criteria: principle.pass_criteria, duration_ms: Date.now() - start };
        passed++;
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
    schema: 'constitutional_observability_report_v0',
    version: map.version,
    generated_at: new Date().toISOString(),
    source_map: MAP_PATH,
    summary: { total: map.principles.length, pass: passed, fail: failed, no_verifier: map.principles.length - passed - failed },
    results,
    failures
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (failed > 0) {
    console.error('CONSTITUTIONAL_OBSERVABILITY: FAIL');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`CONSTITUTIONAL_OBSERVABILITY: PASS (${passed}/${map.principles.length})`);
  console.log(`  report: ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error('CONSTITUTIONAL_OBSERVABILITY: ERROR', err.message);
  process.exit(1);
});
