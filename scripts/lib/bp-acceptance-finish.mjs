/**
 * SYNOPSIS: Mandatory BP sync on product acceptance PASS — single choke point (no oops path).
 * Mandatory BP sync on product acceptance PASS — single choke point (no oops path).
 * @ssot docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { syncMissionFromTechnicalReceipt } from '../../services/bp-priority-sync.js';

export const BP_SYNC_REQUIRED_PATH = 'builderos-reboot/BP_PRIORITY.json';
export const BP_SYNC_TEST_ID = 'bp_sync_mandatory';

/**
 * Write receipt + OBJECTIVE_VERDICT, run BP sync, fail closed if sync misses queue.
 */
export function finishBpAcceptance({
  root,
  missionId,
  report,
  receiptAbsPath,
  receiptRelPath,
  verdictAbsPath,
  objectiveName,
  objectiveVerdictOnPass,
  base,
  buildRecord = {},
  verdictExtra = {},
  passPredicate,
  syncTestId = BP_SYNC_TEST_ID,
}) {
  let pass = passPredicate
    ? passPredicate(report)
    : report.tests_failed.length === 0 && report.tests_passed.length > 0;

  let gitSha = '';
  try {
    gitSha = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
  } catch {
    /* offline */
  }

  report.completed_at = new Date().toISOString();
  report.git_sha = gitSha;
  if (base) report.production_base = base;

  const writeArtifacts = () => {
    report.verdict = pass ? 'PASS' : 'FAIL';
    fs.mkdirSync(path.dirname(receiptAbsPath), { recursive: true });
    fs.writeFileSync(receiptAbsPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(
      verdictAbsPath,
      `${JSON.stringify(
        {
          schema: 'objective_verdict_v1',
          generated_at: report.completed_at,
          objective_id: missionId,
          objective_name: objectiveName,
          verdict: pass ? objectiveVerdictOnPass : 'NOT_COMPLETE',
          receipt: receiptRelPath,
          production_base: base || report.production_base,
          git_sha: gitSha,
          tests_passed: report.tests_passed,
          tests_failed: report.tests_failed,
          founder_usability_pass: report.founder_usability_pass === true,
          ...verdictExtra,
        },
        null,
        2,
      )}\n`,
    );
  };

  writeArtifacts();

  if (pass) {
    try {
      const sync = syncMissionFromTechnicalReceipt({
        missionId,
        receipt: report,
        root,
        buildRecord: { git_sha: gitSha, production_base: base || report.production_base, ...buildRecord },
      });
      report.bp_sync = sync;
      const synced = (sync.updated || []).includes(BP_SYNC_REQUIRED_PATH);
      if (synced) {
        for (const id of new Set([BP_SYNC_TEST_ID, syncTestId])) {
          if (id && !report.tests_passed.includes(id)) {
            report.tests_passed.push(id);
          }
        }
      } else {
        if (!report.tests_failed.includes(BP_SYNC_TEST_ID)) {
          report.tests_failed.push(BP_SYNC_TEST_ID);
        }
        report[`fail_${BP_SYNC_TEST_ID}`] = sync.reason || 'BP_PRIORITY not updated';
        pass = false;
      }
      writeArtifacts();
    } catch (err) {
      if (!report.tests_failed.includes(BP_SYNC_TEST_ID)) {
        report.tests_failed.push(BP_SYNC_TEST_ID);
      }
      report[`fail_${BP_SYNC_TEST_ID}`] = err.message;
      pass = false;
      writeArtifacts();
    }
  }

  return { pass, gitSha };
}
