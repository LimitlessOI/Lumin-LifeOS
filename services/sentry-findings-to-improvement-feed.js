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

// root_cause_class distinguishes "code doesn't do what the blueprint asked"
// from "code correctly does what the blueprint asked, but the blueprint's
// own spec was wrong" -- founder, direct: "I could follow the blueprint,
// but the blueprint was poorly designed. That needs to be reported and
// fixed at the architect level." Before this, every finding was implicitly
// treated as a code problem to hand back to Builder, with no path to
// "revise the blueprint instead of retrying the code."
//
// Honest scope: Layer A (structural conformance -- does the route/export
// exist) failing is near-certain evidence of a CODE gap, since the
// blueprint did ask for the thing and it's simply missing/broken -- that
// classification is safe to assign automatically. Layer B / UX critique
// findings can be either a code-polish issue OR a genuine spec gap (the
// blueprint never asked for the thing a real user needed), and cannot be
// safely auto-classified from text alone without a real judgment call this
// function isn't positioned to make -- those are marked
// 'unclassified_needs_review' rather than guessed, so a human or a real
// model reviewing the finding (not a heuristic) makes the call. This is
// Tier-0: the schema and hard gate are real and live now; the deeper
// automatic classification is deliberately deferred, not faked.
function inferRootCauseClass(source) {
  if (source === 'layer-a') return 'code_defect';
  return 'unclassified_needs_review';
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

  const allowedClasses = new Set(['code_defect', 'blueprint_defect', 'unclassified_needs_review']);
  const declaredClass = trimOrEmpty(entry.root_cause_class);
  const root_cause_class = allowedClasses.has(declaredClass) ? declaredClass : inferRootCauseClass(source);

  const finding = {
    code,
    detail,
    proposed_solution,
    severity,
    source,
    root_cause_class
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
          source: 'uxCritique',
          root_cause_class: inferRootCauseClass('uxCritique')
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
      detail: trimOrEmpty(finding.detail) || trimOrEmpty(finding.proposed_solution) || 'Unspecified finding',
      root_cause_class: trimOrEmpty(finding.root_cause_class) || 'unclassified_needs_review'
    };

    if (safeSeverity(finding.severity) === 'error') {
      ready.blockers.push(entry);
    } else {
      ready.warnings.push(entry);
    }
  }

  return ready;
}

export { normalizeSentryFindings, toReadinessFindings, inferRootCauseClass };

export default {
  normalizeSentryFindings,
  toReadinessFindings,
  inferRootCauseClass
};