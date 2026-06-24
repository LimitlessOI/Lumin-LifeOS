/**
 * SYNOPSIS: LifeOS context router v1 — suggest active stack from utterance or page.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STACK_KEYWORDS = {
  lifere: /\b(lifere|life re|real estate|realtor|gci|listing|buyer|seller|boldtrail|go vegas|tc deal|outreach queue|commission)\b/i,
  socialmediaos: /\b(socialmediaos|smos|content brief|youtube|shorts|tiktok|hook|b-roll|transcript|go viral|reel)\b/i,
  builderos: /\b(builderos|blueprint|mission|deploy|railway|commit|ssot|amendment|preflight)\b/i,
};

export function loadStackRegistry() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config/lifeos-stack-registry.json'), 'utf8'));
}

export function suggestStack({ text = '', explicitStack = null, page = null } = {}) {
  if (explicitStack) {
    return {
      stack_id: explicitStack,
      shell_entry: resolveShellEntry(explicitStack),
      reason: 'explicit',
      label: 'KNOW',
    };
  }

  if (page === 'lifeos-lifere.html') {
    return {
      stack_id: 'lifere',
      shell_entry: '/overlay/lifeos-app.html?page=lifeos-lifere.html',
      reason: 'page_param',
      label: 'KNOW',
    };
  }

  const scores = Object.entries(STACK_KEYWORDS).map(([stackId, re]) => ({
    stackId,
    score: re.test(text) ? 1 : 0,
  }));
  const winner = scores.sort((a, b) => b.score - a.score).find((s) => s.score > 0);

  if (winner) {
    return {
      stack_id: winner.stackId,
      shell_entry: resolveShellEntry(winner.stackId),
      reason: 'keyword_match',
      label: 'THINK',
    };
  }

  return {
    stack_id: 'lifeos',
    shell_entry: '/overlay/lifeos-app.html',
    reason: 'default_platform',
    label: 'KNOW',
  };
}

function resolveShellEntry(stackId) {
  const reg = loadStackRegistry();
  const stack = reg.stacks?.find((s) => s.stack_id === stackId);
  return stack?.shell_entry || reg.platform?.canonical_shell?.replace(/^public/, '/overlay') || '/overlay/lifeos-app.html';
}
