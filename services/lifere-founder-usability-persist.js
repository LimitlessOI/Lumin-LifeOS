/**
 * SYNOPSIS: Persist founder usability confirm to GitHub when deployment service available.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { confirmFounderUsability } from './founder-usability-confirm.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'PRODUCT-LIFERE-OS-V1-0001';

export async function confirmAndPersistFounderUsability({
  missionId = MISSION_ID,
  pass,
  quote = '',
  actor = 'founder',
  commitManyToGitHub = null,
  root = ROOT,
} = {}) {
  const result = confirmFounderUsability({ missionId, pass, quote, actor, root });
  if (!result.ok) return result;

  const files = [
    `builderos-reboot/MISSIONS/${missionId}/OBJECTIVE_VERDICT.json`,
    'builderos-reboot/BP_PRIORITY.json',
    result.receipt_path,
  ];

  const entries = [];
  for (const rel of files) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) {
      entries.push({ path: rel, content: fs.readFileSync(abs, 'utf8') });
    }
  }

  let git = { attempted: false, ok: false, reason: 'commitManyToGitHub not wired' };
  if (typeof commitManyToGitHub === 'function' && entries.length) {
    git.attempted = true;
    try {
      const msg = pass
        ? `founder-usability: PASS ${missionId} — ${String(quote).slice(0, 80)}`
        : `founder-usability: FAIL ${missionId}`;
      const commit = await commitManyToGitHub(entries, msg);
      git = { attempted: true, ok: true, sha: commit?.sha || commit?.commit_sha || null };
    } catch (err) {
      git = { attempted: true, ok: false, reason: err.message };
    }
  }

  return {
    ...result,
    git_persist: git,
    label: git.ok ? 'KNOW' : git.attempted ? 'THINK' : 'GUESS',
  };
}
