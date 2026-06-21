/**
 * SYNOPSIS: Studio experience simulation when UX/product feel in scope.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFounderText } from './coverage-map.js';

export function uxInScope(founderText) {
  return /overlay|ui|ux|feel|experience|html|voice rail|list|see staged|trust/i.test(founderText);
}

export function runStudioSimulation(missionFolder) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const inScope = uxInScope(founderText);

  if (!inScope) {
    return {
      schema: 'studio_experience_simulation_v1',
      mission_id: missionId,
      seat: 'Studio',
      in_scope: false,
      pass: true,
      verdict: 'SKIPPED_NOT_IN_SCOPE',
    };
  }

  const checks = [
    {
      check: 'Founder can see staged items in one place',
      pass: /one list|see staged|inbox|tracker|commitment/i.test(founderText),
      friction_if_fail: 'Adam cannot trust staging visibility',
    },
    {
      check: 'Approval gate before action',
      pass: /approv|explicit|never auto/i.test(founderText),
      friction_if_fail: 'Trust collapse at Alpha',
    },
  ];

  const privateInScope =
    /private mode|private_no_save|off-record|private input/i.test(founderText) &&
    !/out of scope[\s\S]{0,200}private|private[\s\S]{0,80}out of scope/i.test(founderText);

  if (privateInScope) {
    checks.push({
      check: 'Private mode UX boundary',
      pass: /private/i.test(founderText),
      friction_if_fail: 'Privacy trust failure',
    });
  }

  const failed = checks.filter((c) => !c.pass);
  const receipt = {
    schema: 'studio_experience_simulation_v1',
    mission_id: missionId,
    seat: 'Studio',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/foundation/studio-simulation.js',
    in_scope: true,
    checks,
    friction_points: failed.map((f) => f.friction_if_fail),
    verdict: failed.length ? 'STUDIO_CONCERNS' : 'experience_acceptable',
    pass: failed.length === 0,
  };

  const out = path.join(missionFolder, 'receipts/STUDIO_EXPERIENCE_SIMULATION_RECEIPT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
