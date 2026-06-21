<!-- SYNOPSIS: SNT_INTENT_ATTACK_RECEIPT — FOUNDER_PACKET_V2 -->

# SNT_INTENT_ATTACK_RECEIPT — FOUNDER_PACKET_V2

**Role played by:** Claude (Sonnet 4.6), simulating SNT per V2's Bootstrap Protocol ("Manual simulation is acceptable until automated simulation exists")
**Subject under attack:** FOUNDER_PACKET_V2 itself, as the intent document feeding the first ARC translation (Chair + IDC + ARC Intake Loop v1)
**SNT core question, asked of every claim below:** *If this claim is wrong, how would we know?*

---

## Attack 1 — Money/risk veto silently dropped

- **Claim attacked:** CFO and the Builder Entry Gate can clear a path to Builder without any explicit check against Article III (money >$100 / irreversible / data destruction / public release without proof).
- **Failure scenario:** An autonomous run reaches consensus inside CFO+Chair+ARC, clears the Builder Entry Gate, and executes a spend or an irreversible action before Adam ever sees it — because nothing in the gate checklist forces that check.
- **Evidence that would reveal failure:** A BUILD_PASS or REALITY_UPDATE_RECEIPT exists for a >$100 spend or irreversible action with no corresponding Adam veto-window receipt.
- **Severity:** HIGH
- **Classification:** BLOCKING for unattended runs; advisory for supervised runs (Adam is watching live anyway)
- **Recommended next action:** Add the Article III veto clause to V2 (already proposed in critique item #1) before this packet is treated as ARC-ready for any unsupervised lap.

## Attack 2 — Constitutional-floor missions can be starved by ROI logic

- **Claim attacked:** CFO's ROI/opportunity-cost framing and PRIORITY_MAP scoring will naturally produce good prioritization.
- **Failure scenario:** Healing, Education, or Hardship-adjacent work scores near-zero on every CFO dimension (revenue, adoption, speed-to-market) and is silently deprioritized for quarters in favor of higher-ROI features — technically "consensus," constitutionally a violation of NORTH_STAR Article I §1.1/§1.2 and Article V-B.
- **Evidence that would reveal failure:** PRIORITY_MAP history shows zero Healing/Education/Hardship items scheduled across N consecutive priority cycles while other lanes advance.
- **Severity:** HIGH
- **Classification:** BLOCKING — this is a constitutional-fidelity risk, not a process nicety.
- **Recommended next action:** Constitutional Floor clause (critique item #2) must be in the version ARC receives. Until then, any PRIORITY_MAP run must be manually checked by Adam or Wisdom for Healing/Education/Hardship starvation before being trusted.

## Attack 3 — Queue authority ambiguity reintroduced by a new artifact name

- **Claim attacked:** PRIORITY_MAP is a new, additive artifact that doesn't conflict with anything.
- **Failure scenario:** Two "true" priority orderings exist simultaneously (BP_PRIORITY.json and PRIORITY_MAP), and whichever one a given agent reads first becomes the de facto order — silent drift, no contradiction ever surfaces because nobody is required to reconcile them.
- **Evidence that would reveal failure:** PRIORITY_MAP and BP_PRIORITY.json disagree on rank-1 item at any point in time.
- **Severity:** MEDIUM-HIGH
- **Classification:** BLOCKING before PRIORITY_MAP is used for any real ordering decision; non-blocking for documentation-only use.
- **Recommended next action:** Subordination clause (critique item #3) — PRIORITY_MAP is a read-only projection, BP_PRIORITY.json stays canonical.

## Attack 4 — Self-graded coverage map exits without independent challenge

- **Claim attacked:** IDC's own INTENT_COVERAGE_MAP grading is sufficient to pass the IDC Exit Gate.
- **Failure scenario:** IDC marks a dimension SUFFICIENT because the conversation touched on it, not because a third party could actually restate it — same failure mode Codex's PREDICTIVE_ACCURACY_REPORT_ADF_V1.md exhibited (self-scored 92.5% with zero independent per-case citations). ARC then inherits an intent baseline that looks complete but isn't, and invents the missing 20%.
- **Evidence that would reveal failure:** Post-ARC, Builder's ambiguity report (BUILDER_SIMULATION_REPORT) surfaces decision gaps that trace back to a dimension IDC had marked SUFFICIENT.
- **Severity:** HIGH
- **Classification:** BLOCKING for IDC Exit Gate closure on any load-bearing mission.
- **Recommended next action:** SNT independent re-grade requirement (critique item #5) before IDC Exit Gate can close.

## Attack 5 — "Predicted Adam" has no defined fallback when Adam is absent

- **Claim attacked:** Adam Filter safely reduces unnecessary interruptions without ever acting as a silent authority.
- **Failure scenario:** An autonomous run hits a decision that genuinely needs founder judgment, Adam is unreachable, and under time/push-by-default pressure the system leans on Predicted Adam as if it were Actual Adam, producing an action Adam would not have approved.
- **Evidence that would reveal failure:** Any REALITY_UPDATE_RECEIPT or BUILD_PASS where Adam was not reachable, no BLOCKED_INTENT_AMBIGUITY was filed, and the action later required a correction/rollback.
- **Severity:** HIGH for unattended operations specifically (push-by-default standing order makes this not hypothetical)
- **Classification:** BLOCKING for unattended runs.
- **Recommended next action:** Explicit fail-closed fallback (critique item #7) — unreachable Adam + founder-level decision = HALT, not guess.

## Non-blocking findings (advisory only)

- Mode A→B transition has no named owner (critique #4) — advisory, slows things down more than it risks intent fidelity.
- Builder Interchangeability doctrine is unattached to its own existing test runbook (critique #8) — advisory, a documentation-linking fix only.
- Hardship-detection owner not named (critique #9) — advisory until any paid surface is touched, at which point it becomes blocking.
- Memory section internal inconsistency (critique #10) — cosmetic.

---

## SNT Verdict

**5 attacks filed, all 5 map 1:1 to the 5 BLOCKING items in the Claude Review section of FOUNDER_PACKET_V2.** No new blocking finding emerged that wasn't already in the critique — this receipt exists to formalize those critique items as attacks with failure scenarios and detection evidence, per V2's own required SNT format.

**Recommendation:** Packet is not yet safe for an unattended/unsupervised first lap. Packet IS safe for a supervised first lap (Chair + IDC + ARC Intake Loop v1) where Adam is present and the lap does not touch money, billing, hardship signals, or priority reordering — consistent with the Claude Review verdict.
