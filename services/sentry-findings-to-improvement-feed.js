/**
 * SYNOPSIS: Service module — Sentry Findings To Improvement Feed.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toString(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function trimOrEmpty(value) {
  return toString(value).trim();
}

function safeSeverity(value) {
  return value === 'error' ? 'error' : 'warning';
}

function synthesizeSolution(detail) {
  const text = trimOrEmpty(detail);
  if (text) {
    return `Investigate and address: ${text.slice(0, 140)}`;
  }
  return 'Inspect the failed gate output and fix the first failing step.';
}

function normalizeFinding(entry, fallbackSource) {
  if (!isObject(entry)) return null;

  const code = trimOrEmpty(entry.code) || trimOrEmpty(entry.step) || trimOrEmpty(entry.id) || 'sentry_finding';
  const detail = trimOrEmpty(entry.detail) || trimOrEmpty(entry.message) || trimOrEmpty(entry.reason) || code;
  const severity = safeSeverity(entry.severity);
  const source = trimOrEmpty(entry.source) || fallbackSource || 'sentry';

  let proposed_solution = trimOrEmpty(entry.proposed_solution);
  const proposed_solution_source = trimOrEmpty(entry.proposed_solution_source);

  if (!proposed_solution) {
    proposed_solution = synthesizeSolution(detail);
  }

  const finding = {
    code,
    detail,
    proposed_solution,
    severity,
    source
  };

  if (proposed_solution_source) {
    finding.proposed_solution_source = proposed_solution_source;
  } else if (!trimOrEmpty(entry.proposed_solution)) {
    finding.proposed_solution_source = 'synthesized';
  }

  return finding;
}

function normalizeSentryFindings(gateResult) {
  if (!isObject(gateResult)) return [];

  const findings = [];

  const layerA = Array.isArray(gateResult.steps) ? gateResult.steps : [];
  for (const step of layerA) {
    if (isObject(step) && step.failed) {
      const finding = normalizeFinding(
        {
          code: step.code || step.id || step.name || 'failed_step',
          detail: step.detail || step.message || step.reason || step.name || step.code,
          severity: 'error',
          source: 'layer-a'
        },
        'layer-a'
      );
      if (finding) findings.push(finding);
    }
  }

  const layerB = isObject(gateResult.response) ? gateResult.response : gateResult;
  const failed = Array.isArray(layerB.failed) ? layerB.failed : [];
  for (const item of failed) {
    const finding = normalizeFinding(item, 'layer-b');
    if (finding) findings.push(finding);
  }

  const uxCritique = isObject(layerB.uxCritique) ? layerB.uxCritique : null;
  if (uxCritique) {
    const frictionPoints = Array.isArray(uxCritique.friction_points) ? uxCritique.friction_points : [];
    const improvements = Array.isArray(uxCritique.improvements) ? uxCritique.improvements : [];
    const length = Math.max(frictionPoints.length, improvements.length);

    for (let i = 0; i < length; i += 1) {
      const friction = frictionPoints[i];
      const improvement = improvements[i];

      if (trimOrEmpty(friction)) {
        const detail = trimOrEmpty(friction);
        const proposed_solution = trimOrEmpty(improvement) || synthesizeSolution(detail);
        findings.push({
          code: `ux_friction_${i + 1}`,
          detail,
          proposed_solution,
          proposed_solution_source: trimOrEmpty(improvement) ? undefined : 'synthesized',
          severity: 'warning',
          source: 'uxCritique'
        });
        if (!trimOrEmpty(improvement)) {
          findings[findings.length - 1].proposed_solution_source = 'synthesized';
        }
      }
    }
  }

  return findings;
}

function toReadinessFindings(findings) {
  const ready = { blockers: [], warnings: [] };
  if (!Array.isArray(findings)) return ready;

  for (const finding of findings) {
    if (!isObject(finding)) continue;
    const entry = {
      code: trimOrEmpty(finding.code) || 'sentry_finding',
      detail: trimOrEmpty(finding.detail) || trimOrEmpty(finding.proposed_solution) || 'Unspecified finding'
    };

    if (safeSeverity(finding.severity) === 'error') {
      ready.blockers.push(entry);
    } else {
      ready.warnings.push(entry);
    }
  }

  return ready;
}

export { normalizeSentryFindings, toReadinessFindings };

export default {
  normalizeSentryFindings,
  toReadinessFindings
};