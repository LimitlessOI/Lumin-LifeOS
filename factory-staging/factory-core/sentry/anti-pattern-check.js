/**
 * SYNOPSIS: Exports antiPatternCheck — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/sentry/anti-pattern-check.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../repo-paths.js';

const FORBIDDEN_IN_FACTORY_JS = [
  /\bskip_sentry\s*=\s*true/i,
  /\bFULLY_MACHINE_READY\s*:\s*true/i,
  /\bverdict\s*:\s*['"]STAGING_READY['"]/i,
  /\beval\s*\(/,
];

export function antiPatternCheck({ step, builderResult, targetContent = null } = {}) {
  const matches = [];
  let content = targetContent;

  if (content == null && builderResult?.target_file) {
    const abs = path.join(REPO_ROOT, builderResult.target_file);
    if (fs.existsSync(abs) && /\.(js|mjs|cjs)$/i.test(abs)) {
      content = fs.readFileSync(abs, 'utf8');
    }
  }

  if (typeof content === 'string') {
    for (const pattern of FORBIDDEN_IN_FACTORY_JS) {
      if (pattern.test(content)) {
        matches.push({ pattern: pattern.source, severity: 'blocking' });
      }
    }
  }

  if (step?.non_goals?.some?.((g) => /invent|interpret/i.test(String(g)))) {
    matches.push({ pattern: 'step_allows_interpretation', severity: 'warning' });
  }

  const blocking = matches.filter((m) => m.severity === 'blocking');
  return {
    step_id: step?.step_id,
    compareAgainst: ['known_builder_antipatterns', 'fake_green', 'scope_expansion'],
    status: blocking.length ? 'FAIL' : matches.length ? 'WARN' : 'PASS',
    matches,
    pass: blocking.length === 0,
  };
}
