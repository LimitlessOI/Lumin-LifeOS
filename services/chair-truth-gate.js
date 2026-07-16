/**
 * SYNOPSIS: Fail-closed exit gate — no Chair response leaves without receipt-backed PASS.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

const FOUNDER_ALPHA_CLAIMS = [
  /founder success test satisfied/i,
  /\balpha reached\b/i,
  /\bpoint b reached\b/i,
  /acceptance and founder success/i,
];

export function executionKindForChannel(channel = '') {
  if (channel === 'mission_pipeline') return 'RECEIPT_SCAN_ONLY';
  if (['build_async', 'build_terminal', 'blueprint_execute', 'execute', 'terminal_default'].includes(channel)) {
    return 'CODE_EXECUTE';
  }
  if (channel === 'counsel' || channel === 'display' || channel === 'lumin' || channel === 'chair') return 'NO_COMMAND';
  if (channel === 'system_action') return 'SYSTEM_EXECUTE';
  if (channel === 'point_b') return 'NAVIGATOR';
  return 'UNKNOWN';
}

/**
 * Last gate before any founder-facing Chair reply. Downgrades illegal PASS claims.
 * @param {object} truth
 * @param {string} channel — classifyChairIntent result
 */
export function enforceChairTruthExit(truth = {}, channel = '') {
  const out = { ...truth };
  // Preserve an already-set execution_kind (e.g., life_admin command turns that
  // already ran through the chat intent executor); only fall back to channel inference.
  out.execution_kind = out.execution_kind || executionKindForChannel(channel);
  out.chair_channel = out.chair_channel || channel;

  const founderPass = out.founder_usability_pass === true;
  const machineOnly = out.receipt_truth === 'TECHNICAL_ONLY_AWAITING_FOUNDER'
    || (out.machine_path_pass === true && founderPass === false);

  if (channel === 'mission_pipeline') {
    out.receipt_scan_only = true;
    if (machineOnly || !founderPass) {
      out.pass_fail = out.pass_fail === 'RUNNING' ? 'RUNNING' : 'FAIL';
      out.ok = out.pass_fail === 'RUNNING' ? out.ok : false;
      out.point_b_reached = founderPass && out.machine_path_pass === true;
      if (machineOnly && out.receipt_truth === 'POINT_B_REACHED') {
        out.receipt_truth = 'TECHNICAL_ONLY_AWAITING_FOUNDER';
      }
    }
  }

  const blob = `${out.human_summary || ''}\n${out.human_summary_technical || ''}\n${out.done_synopsis || ''}`;
  const claimsFounderAlpha = FOUNDER_ALPHA_CLAIMS.some((re) => re.test(blob));
  if (claimsFounderAlpha && !founderPass) {
    out.pass_fail = 'FAIL';
    out.ok = false;
    out.point_b_reached = false;
    out.truth_gate_violation = 'FOUNDER_CLAIM_WITHOUT_RECEIPT';
    out.first_blocker = out.first_blocker
      || 'Blocked: claimed founder Alpha / Point B without founder_usability_pass in OBJECTIVE_VERDICT.json';
    if (!/TECHNICAL ONLY|RECEIPT_SCAN|founder_usability_pass/i.test(blob)) {
      out.human_summary_technical = [
        out.human_summary_technical || out.human_summary || '',
        'TRUTH GATE: founder usability NOT confirmed — Alpha NOT reached.',
      ].filter(Boolean).join('\n');
    }
  }

  if (out.pass_fail === 'PASS' && channel === 'mission_pipeline' && !founderPass) {
    out.pass_fail = 'FAIL';
    out.ok = false;
    out.truth_gate_violation = out.truth_gate_violation || 'PIPELINE_PASS_WITHOUT_FOUNDER';
  }

  if (out.pass_fail === 'PASS' && channel === 'build_async' && out.execution_kind === 'CODE_EXECUTE') {
    const hasShipProof = Boolean(out.sha || out.commit_sha) || out.committed === true || out.receipt_truth === 'COMMIT_SHA_PRESENT';
    if (!hasShipProof && !out.async) {
      out.pass_fail = 'FAIL';
      out.ok = false;
      out.truth_gate_violation = 'BUILD_PASS_WITHOUT_SHA';
      out.first_blocker = out.first_blocker || 'Build PASS requires commit SHA or committed:true';
    }
  }

  if (out.fp_v2_enforcement && out.fp_v2_enforcement.execute_cleared === false) {
    const execChannels = ['build_async', 'build_terminal', 'blueprint_execute', 'execute'];
    if (execChannels.includes(channel)) {
      out.pass_fail = 'FAIL';
      out.ok = false;
      out.truth_gate_violation = out.truth_gate_violation || 'BLOCKED_CHAIR_FP_V2';
      out.first_blocker = out.first_blocker || out.fp_v2_enforcement.violations?.[0] || 'Founder Packet V2 gate blocked execute';
    }
  }

  return out;
}
