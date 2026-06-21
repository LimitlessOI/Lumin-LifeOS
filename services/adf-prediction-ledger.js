/**
 * SYNOPSIS: ADF Prediction Ledger — predict founder behavior, score against reality, adjust weights.
 * ADF Prediction Ledger — predict founder behavior, score against reality, adjust weights.
 * Assistive oracle only — predicted never overrides actual (NSSOT §2.0Q).
 *
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const PREDICTIONS_DIR = 'data/adf-predictions';
const LESSONS_FILE = 'data/adf-predictions/adf-lessons.json';

const VERDICT_ALIASES = {
  APPROVE: 'APPROVE',
  YES: 'APPROVE',
  IMPLEMENT: 'APPROVE',
  SHIP: 'APPROVE',
  REJECT: 'REJECT',
  NO: 'REJECT',
  DEFER: 'DEFER',
  LATER: 'DEFER',
  NOT_NOW: 'DEFER',
  ESCALATE: 'ESCALATE',
  COUNCIL: 'ESCALATE',
  'GAP-FILL_OK': 'GAP-FILL_OK',
  GAP_FILL: 'GAP-FILL_OK',
};

function normalizeVerdict(v) {
  if (!v) return null;
  const key = String(v).trim().toUpperCase().replace(/\s+/g, '_');
  return VERDICT_ALIASES[key] || key;
}

function monthDir(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function predictionsRoot(rootDir = DEFAULT_ROOT) {
  return path.join(rootDir, PREDICTIONS_DIR);
}

function lessonsPath(rootDir = DEFAULT_ROOT) {
  return path.join(rootDir, LESSONS_FILE);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function listReceiptFiles(rootDir = DEFAULT_ROOT) {
  const root = predictionsRoot(rootDir);
  let entries = [];
  try {
    const months = await fs.readdir(root);
    for (const month of months) {
      if (month === 'adf-lessons.json') continue;
      const monthPath = path.join(root, month);
      const stat = await fs.stat(monthPath);
      if (!stat.isDirectory()) continue;
      const files = await fs.readdir(monthPath);
      for (const f of files) {
        if (f.endsWith('.json')) entries.push(path.join(monthPath, f));
      }
    }
  } catch {
    return [];
  }
  return entries.sort();
}

async function loadReceipt(filePath) {
  return readJson(filePath);
}

async function saveReceipt(filePath, receipt) {
  await writeJson(filePath, receipt);
}

async function findReceiptById(predictionId, rootDir = DEFAULT_ROOT) {
  const files = await listReceiptFiles(rootDir);
  for (const f of files) {
    const r = await loadReceipt(f);
    if (r?.prediction_id === predictionId) return { filePath: f, receipt: r };
  }
  return null;
}

function nextPredictionId(rootDir, date = new Date()) {
  const prefix = `adf-pred-${monthDir(date).replace('-', '-')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  return `${prefix}-${Date.now().toString(36).slice(-4)}`;
}

export function scoreDirectionMatch(predictedVerdict, actualVerdict) {
  const p = normalizeVerdict(predictedVerdict);
  const a = normalizeVerdict(actualVerdict);
  if (!p || !a) return null;
  if (p === a) return 1.0;
  const approveFamily = new Set(['APPROVE', 'GAP-FILL_OK']);
  const rejectFamily = new Set(['REJECT']);
  const deferFamily = new Set(['DEFER', 'ESCALATE']);
  if (approveFamily.has(p) && approveFamily.has(a)) return 0.5;
  if (rejectFamily.has(p) && rejectFamily.has(a)) return 0.5;
  if (deferFamily.has(p) && deferFamily.has(a)) return 0.5;
  if (approveFamily.has(p) && deferFamily.has(a)) return 0.5;
  if (deferFamily.has(p) && approveFamily.has(a)) return 0.5;
  return 0.0;
}

export function inferVerdictFromQuote(quote) {
  if (!quote) return null;
  const q = quote.toLowerCase();
  if (/don'?t care.*doc|just needs to be implemented|implement and use|stop writing|no more prose|ship it|make it work/.test(q)) {
    return 'APPROVE';
  }
  if (/reject|no\b|don'?t do|stop that|wrong|not what i/.test(q)) return 'REJECT';
  if (/later|not now|defer|hold|wait/.test(q)) return 'DEFER';
  if (/council|escalate|run council/.test(q)) return 'ESCALATE';
  if (/gap-?fill/.test(q)) return 'GAP-FILL_OK';
  return null;
}

export function createAdfPredictionLedger({ rootDir = DEFAULT_ROOT } = {}) {
  async function loadLessons() {
    const data = await readJson(lessonsPath(rootDir), {
      schema: 'adf_lessons_v1',
      updated_at: null,
      driver_weights: {},
      lessons: [],
    });
    return data;
  }

  async function saveLessons(data) {
    data.updated_at = new Date().toISOString();
    await writeJson(lessonsPath(rootDir), data);
    return data;
  }

  async function filePrediction(input) {
    const now = new Date();
    const predictionId = input.prediction_id || nextPredictionId(rootDir, now);
    const receipt = {
      schema: 'adf_prediction_receipt_v1',
      prediction_id: predictionId,
      created_at: now.toISOString(),
      predictor: {
        model: input.predictor?.model || 'unknown',
        adf_version: input.predictor?.adf_version || 'merged_v1',
        agent_session: input.predictor?.agent_session || null,
      },
      context: {
        decision_class: input.context?.decision_class || 'founder_verdict',
        proposal_summary: input.context?.proposal_summary || '',
        mission_id: input.context?.mission_id || null,
        artifact_links: input.context?.artifact_links || [],
      },
      prediction: {
        verdict: normalizeVerdict(input.prediction?.verdict) || 'DEFER',
        confidence: input.prediction?.confidence ?? 0.5,
        confidence_label: input.prediction?.confidence_label || 'THINK',
        expected_adam_reaction: input.prediction?.expected_adam_reaction || '',
        expected_consumer_outcome: input.prediction?.expected_consumer_outcome || null,
        drivers_cited: input.prediction?.drivers_cited || [],
        evidence_ids: input.prediction?.evidence_ids || [],
        simulator_steps_fired: input.prediction?.simulator_steps_fired || [],
      },
      test_plan: {
        how_we_know_actual: input.test_plan?.how_we_know_actual || '',
        success_criteria: input.test_plan?.success_criteria || '',
        consumer_probe: input.test_plan?.consumer_probe || null,
      },
      actual: {
        recorded_at: null,
        recorder: null,
        adam_verdict: null,
        adam_quote: null,
        adam_action_evidence: [],
        consumer_outcome: null,
        consumer_evidence: [],
      },
      score: {
        scored_at: null,
        direction_match: null,
        timing_match: null,
        consumer_match: null,
        variance_notes: null,
        lesson: null,
        adf_weight_adjustment: null,
      },
      status: 'open',
    };

    const dir = path.join(predictionsRoot(rootDir), monthDir(now));
    const filePath = path.join(dir, `${predictionId}.json`);
    await saveReceipt(filePath, receipt);
    return { filePath, receipt };
  }

  async function recordActual(predictionId, actualInput) {
    const found = await findReceiptById(predictionId, rootDir);
    if (!found) throw new Error(`Prediction not found: ${predictionId}`);

    const { filePath, receipt } = found;
    const quote = actualInput.adam_quote || '';
    const verdict = normalizeVerdict(actualInput.adam_verdict) || inferVerdictFromQuote(quote);

    receipt.actual = {
      recorded_at: new Date().toISOString(),
      recorder: actualInput.recorder || 'hist',
      adam_verdict: verdict,
      adam_quote: quote || null,
      adam_action_evidence: actualInput.adam_action_evidence || [],
      consumer_outcome: actualInput.consumer_outcome || null,
      consumer_evidence: actualInput.consumer_evidence || [],
    };
    receipt.status = 'actual_recorded';
    await saveReceipt(filePath, receipt);
    return { filePath, receipt };
  }

  async function scorePrediction(predictionId, opts = {}) {
    const found = await findReceiptById(predictionId, rootDir);
    if (!found) throw new Error(`Prediction not found: ${predictionId}`);

    const { filePath, receipt } = found;
    if (!receipt.actual?.adam_verdict && !receipt.actual?.adam_quote) {
      throw new Error(`No actual recorded for ${predictionId}`);
    }

    const actualVerdict = receipt.actual.adam_verdict || inferVerdictFromQuote(receipt.actual.adam_quote);
    const directionMatch = scoreDirectionMatch(receipt.prediction.verdict, actualVerdict);
    const timingMatch = opts.timing_match ?? 1.0;
    const consumerMatch = opts.consumer_match ?? null;

    const varianceNotes = opts.variance_notes
      || (directionMatch === 1.0
        ? 'Direction match'
        : directionMatch === 0.5
          ? 'Same polarity, different shape'
          : 'Wrong polarity');

    const lesson = opts.lesson || (directionMatch < 1.0
      ? `Predicted ${receipt.prediction.verdict}, actual ${actualVerdict}: ${varianceNotes}`
      : null);

    receipt.score = {
      scored_at: new Date().toISOString(),
      direction_match: directionMatch,
      timing_match: timingMatch,
      consumer_match: consumerMatch,
      variance_notes: varianceNotes,
      lesson,
      adf_weight_adjustment: opts.adf_weight_adjustment || null,
    };
    receipt.status = 'scored';
    await saveReceipt(filePath, receipt);

    if (lesson) {
      await appendLesson({
        prediction_id: predictionId,
        decision_class: receipt.context.decision_class,
        lesson,
        direction_match: directionMatch,
        drivers: receipt.prediction.drivers_cited,
        weight_adjustment: opts.adf_weight_adjustment,
      });
    }

    return { filePath, receipt };
  }

  async function appendLesson({ prediction_id, decision_class, lesson, direction_match, drivers = [], weight_adjustment }) {
    const data = await loadLessons();
    data.lessons.push({
      at: new Date().toISOString(),
      prediction_id,
      decision_class,
      lesson,
      direction_match,
      drivers,
      weight_adjustment: weight_adjustment || null,
    });

    if (weight_adjustment && typeof weight_adjustment === 'object') {
      data.driver_weights = data.driver_weights || {};
      for (const [driver, delta] of Object.entries(weight_adjustment)) {
        const prev = data.driver_weights[driver] ?? 1.0;
        data.driver_weights[driver] = Math.max(0.1, Math.min(3.0, prev + delta));
      }
    }

    return saveLessons(data);
  }

  async function listPredictions({ status } = {}) {
    const files = await listReceiptFiles(rootDir);
    const out = [];
    for (const f of files) {
      const r = await loadReceipt(f);
      if (!r?.prediction_id) continue;
      if (status && r.status !== status) continue;
      out.push({ filePath: f, receipt: r });
    }
    return out.sort((a, b) => (b.receipt.created_at || '').localeCompare(a.receipt.created_at || ''));
  }

  async function getAccuracySummary() {
    const all = await listPredictions();
    const scored = all.filter(({ receipt }) => receipt.status === 'scored');
    const byClass = {};
    for (const { receipt } of scored) {
      const cls = receipt.context.decision_class || 'unknown';
      if (!byClass[cls]) byClass[cls] = { scored: 0, sum: 0 };
      byClass[cls].scored++;
      byClass[cls].sum += receipt.score.direction_match ?? 0;
    }
    const summary = {
      total: all.length,
      open: all.filter(({ receipt }) => receipt.status === 'open').length,
      scored: scored.length,
      headline_direction_accuracy: scored.length
        ? scored.reduce((s, { receipt }) => s + (receipt.score.direction_match ?? 0), 0) / scored.length
        : null,
      by_class: Object.fromEntries(
        Object.entries(byClass).map(([k, v]) => [k, { scored: v.scored, avg_direction: v.scored ? v.sum / v.scored : null }]),
      ),
    };
    return summary;
  }

  async function formatLessonsForPrompt() {
    const data = await loadLessons();
    const recent = (data.lessons || []).slice(-8);
    if (!recent.length && !Object.keys(data.driver_weights || {}).length) return '';

    const lines = ['ADF LEARNED ADJUSTMENTS (from scored predictions — assistive only):'];
    if (Object.keys(data.driver_weights || {}).length) {
      lines.push(`Driver weights: ${JSON.stringify(data.driver_weights)}`);
    }
    for (const l of recent) {
      lines.push(`- [${l.decision_class}] ${l.lesson}`);
    }
    return lines.join('\n');
  }

  async function recordAndScoreFromMessage(predictionId, quote, opts = {}) {
    const actualVerdict = opts.adam_verdict || inferVerdictFromQuote(quote);
    await recordActual(predictionId, {
      recorder: opts.recorder || 'hist',
      adam_verdict: actualVerdict,
      adam_quote: quote,
      adam_action_evidence: opts.adam_action_evidence || [],
    });
    return scorePrediction(predictionId, opts);
  }

  return {
    filePrediction,
    recordActual,
    scorePrediction,
    recordAndScoreFromMessage,
    listPredictions,
    getAccuracySummary,
    loadLessons,
    appendLesson,
    formatLessonsForPrompt,
    findReceiptById,
  };
}

export default createAdfPredictionLedger;
