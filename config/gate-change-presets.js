/**
 * Named bodies for POST /api/v1/lifeos/gate-change/run-preset
 * (shared with scripts/council-gate-change-run.mjs via same keys).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export const GATE_CHANGE_PRESETS = {
  maturity: {
    title: 'System maturity rubric — request real council debate',
    hypothesis_label: 'THINK',
    pain_summary: `Context: A prior assistant (single model in IDE) published aspect scores 0-10 and "synthetic consensus" text — that was NOT a run of this system's multi-model gate-change API.

Request to council:
1) Review the rubric (platform vs revenue vs verification vs security vs autonomy) — what is missing or mis-weighted?
2) What would you change in scoring or in process to move toward 10/10?
3) Do you agree the honest gap is "verifiable closure" (CI, remote verify, data in DB) more than "more features"?
4) List concrete risks of trusting single-model "consensus" language without POST .../run-council.

Rules: use KNOW/THINK/GUESS. End with VERDICT line per rubric.
`,
    steps_to_remove: [
      'Confusing "synthetic agreement" in chat with multi-model run-council results',
    ],
    created_by: 'config/gate-change-presets.js — maturity',
  },
  'program-start': {
    title: 'SYSTEM MATURITY PROGRAM — council review of plan and gaps',
    hypothesis_label: 'THINK',
    pain_summary: `We are driving every platform aspect toward receipted 10/10: SSOT, CI, lifeos-verify, remote verify-project, ClientCare A→B→C, security, autonomy guards, Lumin metrics, observability.

Full program (phases, aspect table, "what 10 means"): docs/SYSTEM_MATURITY_PROGRAM.md in the repo.

ASK THE COUNCIL:
1) What is wrong or missing in the phase order or weighting?
2) What will burn us if we only automate CI and skip remote verify / production DB truth?
3) What should "better than a single model" require as minimum evidence in gate_change_proposals + receipts?
4) Steel-man: why we should NOT add more CI (latency, false confidence). Then your VERDICT (APPROVE/REJECT/DEFER) on adopting this program for the next 90 days.

End each model output with a VERDICT line per lifeos-gate-change rubric.`,
    steps_to_remove: [
      'Relying on one IDE session for "the council said"',
      'Shipping without npm run verify:maturity or equivalent',
    ],
    created_by: 'config/gate-change-presets.js — program-start',
  },
};
