/**
 * SYNOPSIS: LifeRE founder attempt — runs alpha cycle and persists attempt receipt.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeREAlphaDailyCycle } from './lifere-alpha-daily-cycle.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(REPO_ROOT, 'products/receipts/LIFERE_FOUNDER_ATTEMPT.json');

export function createLifeREFounderAttempt({ pool = null, logger = console } = {}) {
  const alphaCycle = createLifeREAlphaDailyCycle({ pool, logger });

  async function recordAttempt({
    userId = 'adam',
    tenantId = 'default',
    goalGci = 30000,
    activityCounts = null,
    debriefNotes = 'Founder alpha attempt',
    source = 'api',
  } = {}) {
    const cycle = await alphaCycle.runDailyCycle({
      userId,
      tenantId,
      goalGci,
      activityCounts,
      debriefNotes,
    });

    const receipt = {
      schema: 'lifere_founder_attempt_v1',
      mission_id: 'PRODUCT-LIFERE-OS-V1-0001',
      at: new Date().toISOString(),
      user_id: userId,
      source,
      cycle_ok: cycle.ok === true,
      founder_usability_pass: false,
      founder_quote_required: true,
      steps: cycle.steps,
      daily_focus: cycle.daily_focus,
      debrief_summary: cycle.debrief?.summary || null,
      bottleneck: cycle.bottleneck || null,
      next: cycle.ok
        ? 'Adam: if usable, confirm via command control with founder quote (12+ chars)'
        : 'Fix failing steps and re-run',
    };

    fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
    fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);

    return { ...cycle, receipt_path: 'products/receipts/LIFERE_FOUNDER_ATTEMPT.json', receipt };
  }

  return { recordAttempt };
}
