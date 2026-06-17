/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAdfPredictionLedger } from '../services/adf-prediction-ledger.js';

async function makeLedger() {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'adf-ledger-'));
  return { rootDir, ledger: createAdfPredictionLedger({ rootDir }) };
}

test('ADF prediction ledger rejects path-escape prediction ids', async () => {
  const { ledger } = await makeLedger();
  await assert.rejects(
    () => ledger.filePrediction({
      prediction_id: '../../routes/corrupt-me',
      prediction: { verdict: 'APPROVE' },
    }),
    (err) => err.message === 'invalid_prediction_id' && err.status === 400,
  );
});

test('ADF prediction ledger rejects duplicate ids without overwriting original receipt', async () => {
  const { ledger } = await makeLedger();
  const first = await ledger.filePrediction({
    prediction_id: 'pred_safe_1',
    prediction: { verdict: 'APPROVE', confidence: 0.9 },
  });
  await ledger.recordActual('pred_safe_1', { adam_verdict: 'APPROVE', adam_quote: 'ship it' });

  await assert.rejects(
    () => ledger.filePrediction({
      prediction_id: 'pred_safe_1',
      prediction: { verdict: 'REJECT', confidence: 0.1 },
    }),
    (err) => err.message === 'prediction_id_exists' && err.status === 409,
  );

  const persisted = JSON.parse(await readFile(first.filePath, 'utf8'));
  assert.equal(persisted.prediction.verdict, 'APPROVE');
  assert.equal(persisted.status, 'actual_recorded');
  assert.equal(persisted.actual.adam_verdict, 'APPROVE');
});
