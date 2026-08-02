<!-- SYNOPSIS: Red-team analysis of CONSTITUTIONAL_FRAMEWORK_v1.md — ways it can be captured, gamed, bypassed, or made self-contradictory. -->

# Constitutional Framework v1.0 — Red-Team Report

This report lists ways the proposed framework could fail in practice. Each item is classified by whether it blocks ratification, is required before first production use, is an activation-threshold requirement, is operational design, or should be monitored through case law. It is an input to ratification, not a rejection of the framework.

## R-1. Founder override via emergency powers

**Classification:** Operational design (not a constitutional blocker)

**Attack:** The founder uses the emergency clause repeatedly for non-emergencies, invoking "latency" or "competitive pressure." Over time, every load-bearing decision becomes an emergency.

**Current guard:** §12 requires disclosure of retained powers and emergency boundaries; §15 requires expiration/review triggers for emergency measures.

**Gap:** No numeric limit on emergency invocations per time period; no mandatory cooling-off review by an unconflicted office.

**Recommendation:** Add an emergency budget (e.g., no more than N emergency measures per quarter) and a mandatory post-emergency review before the next ordinary decision can proceed.

## R-2. Metric gaming by offices

**Classification:** Operational design (not a constitutional blocker)

**Attack:** An office selects or redefines its own success metrics to show green while the underlying good degrades. The Office of Sentry stops reporting failures to maintain a high success rate.

**Current guard:** §6 protects the metric-integrity function without requiring a permanent office; no measured entity may define, alter, or exclusively evaluate its own metrics.

**Gap:** The rule is stated but has no assigned external evaluator, no metric rotation schedule, and no whistleblower protection.

**Recommendation:** Operations may satisfy the function through Sentry, independent evaluators, rotating reviewers, an audit function, or a dedicated office if reality shows one is needed.

## R-3. Correlated "independent" reasoning

**Classification:** Required before first meaningful production use

**Attack:** Five models from the same training distribution all produce the same biased conclusion, which is then treated as consensus. The council is five suits on one viewpoint.

**Current guard:** §5 requires scorer identity and §14 requires affected-party participation; §16 allows continued pluralism.

**Gap:** No formal test for source diversity; no requirement that major decisions include at least one adversarial or culturally different participant.

**Recommendation:** Add a "diversity of epistemic sources" check to the council protocol: model family, prompt framing, discipline, and affected-party input.

## R-4. Registry drift becomes the real Constitution

**Classification:** Ratification blocker

**Attack:** `REGISTRY.json` is updated to say something different from `NORTH_STAR_SSOT.md` or from runtime behavior. The verifier still passes because it checks schema, not semantic parity.

**Current guard:** §7 states parity as a rule and §11 requires `@ssot` tags.

**Gap:** No implemented parity test that reads human text, registry, and runtime and fails on divergence.

**Recommendation:** Build `verify-constitutional-parity` before ratification; make it fail-closed.

## R-5. Product-level rebellion

**Classification:** Required before first meaningful production use

**Attack:** A product mission declares its own "emergency" and builds a feature that contradicts the Constitution, arguing that product governance is "optional but subordinate."

**Current guard:** §10 states product governance cannot override higher authority; §11 says Level 7 code has no voice.

**Gap:** No mechanical enforcement that a product `GOVERNANCE.md` cannot declare an exemption; `builder:preflight` may not yet check product governance against constitutional registry.

**Recommendation:** Implement inheritance enforcement in the preflight gate: every product governance file must be parseable and must not contain clauses that contradict Level 0–4 authority.

## R-6. False precision in confidence scores

**Classification:** Required before first meaningful production use

**Attack:** Every score is an integer between 0 and 100 that looks scientific but is mostly judgment. The public treats 87% as a measured fact.

**Current guard:** §5 requires scoring metadata, uncertainty ranges, and scorer identity.

**Gap:** No calibration ledger exists yet; no requirement that a score without a documented scoring method be treated as a labeled inference (`THINK`) rather than `KNOW`.

**Recommendation:** Require the calibration ledger before any score is used to block or permit action. Uncertainty ranges must be displayed alongside point scores.

## R-7. Amendment process self-weakening

**Classification:** Ratification blocker

**Attack:** A future leader first uses the meta-amendment process to lower the threshold for meta-amendment, then removes protected clauses.

**Current guard:** §8.2 requires escalating thresholds for meta-amendment and anti-self-weakening protection.

**Gap:** Thresholds are not yet defined; sequential approval over time is not specified.

**Recommendation:** Fix concrete thresholds and require sequential approval (e.g., two readings separated by at least one review cycle) for any meta-amendment.

## R-8. Synthesis smoothing away decisive dissent

**Classification:** Ratification blocker

**Attack:** The synthesis process averages or smooths minority positions that later prove decisive. A warning about long-term dependency is labeled "noted" and dropped.

**Current guard:** §17 requires dissent escrow and reopening triggers.

**Gap:** No enforcement that dissent is actually preserved in the canonical decision record; the synthesis process could fail to record it.

**Recommendation:** Make dissent escrow a mandatory field in the decision record; the canonicalization gate rejects a decision without it.

## R-9. Provisional measures become permanent

**Classification:** Ratification blocker

**Attack:** A "temporary" rule is renewed indefinitely because review deadlines are missed and the default outcome is "continue unless reviewed."

**Current guard:** §15 requires expiration, review triggers, success/failure criteria, and a default outcome. It now states that the default for missed review is sunset or rollback.

**Gap:** The review office and extension process are not yet defined; an extension could still be rubber-stamped.

**Recommendation:** Define who may grant an extension, on what evidence, and with what dissent requirement.

## R-10. Public Constitution as marketing

**Classification:** Required before first meaningful production use

**Attack:** The Public Constitution is drafted to be inspiring rather than enforceable. Remedy clauses are vague; enforcement is "we will learn."

**Current guard:** §9 lists enforcement, remedy, and accountability as required sections; §8.11 details minimum viable remedy.

**Gap:** The framework does not require that remedy be funded, staffed, or accessible.

**Recommendation:** Add a staged remedy implementation plan with activation triggers, not just principles.

## R-11. Framing capture

**Classification:** Ratification blocker — addressed in v1 correction pass

**Attack:** Whoever frames the question controls the answer. A product proposal is titled "How do we increase engagement?" which assumes engagement is the goal.

**Current guard:** §8.1 now requires a mandatory frame-challenge record before independent reasoning.

**Gap:** Frame challenge is new and has not yet been tested in a real decision.

**Recommendation:** Include frame-challenge records in the adversarial ratification suite and in the first case-law entries.

## R-12. Legal embodiment deferred forever

**Classification:** Activation-threshold requirement

**Attack:** The Constitution says legal embodiment is "staged" but never reaches the trigger. The organization grows large without ever creating enforceable accountability.

**Current guard:** §18 requires activation triggers.

**Gap:** Triggers are open-ended; no hard trigger table (e.g., revenue, user count, data sensitivity) and no consequence for missing them.

**Recommendation:** Define a trigger table and require a constitutional review when any trigger is crossed.

## R-13. Paternalism in human-development products

**Classification:** Required before first meaningful production use

**Attack:** A product interprets "help people become who they say they want to be" as "we know better and will nudge them toward company-approved flourishing."

**Current guard:** §2 and §14 protect autonomy and consent; LifeOS doctrine says "Serve, don't decide"; §14 now includes a steering objection path.

**Gap:** The framework does not define a measurable test for paternalism or a protected channel for users to report "this is steering me."

**Recommendation:** Add a user-facing steering objection path and a metric for "user-perceived autonomy" as a protected counter-metric.

## R-14. Goodhart's law in reality scoring

**Classification:** Operational design (not a constitutional blocker)

**Attack:** "Reality is the scoreboard" becomes "we optimize whichever metric is easiest to move." User engagement replaces human flourishing.

**Current guard:** §5 requires intended outcome, proxy metrics, limitations, gaming behavior, and counter-metrics.

**Gap:** No office is responsible for declaring when a metric has become the target.

**Recommendation:** Assign the metric-integrity function to review metric substitution and require counter-metric dashboards. The function may be performed by Sentry, independent evaluators, rotating reviewers, an audit function, or a dedicated office later.

## R-15. Capture of the Chair office

**Classification:** Operational design (not a constitutional blocker)

**Attack:** The Chair office is assigned to a model that is persuasive, sycophantic, or conflicted, and the selection criterion is "best at producing decisions" rather than "best at preserving constitutional behavior."

**Current guard:** §6 requires office-holder selection by capability for the specific decision and evaluation by honesty, calibration, dissent, evidence handling, and resistance to manipulation.

**Gap:** No explicit scorecard weights these constitutional behaviors above task success.

**Recommendation:** Define a Chair selection scorecard where constitutional behavior is weighted at least as high as task output.

## R-16. Unanimity as veto capture

**Classification:** Ratification blocker

**Attack:** A single office-holder blocks strengthening a protection because consensus is required even when credible harm is demonstrated.

**Current guard:** §8.2 now explicitly states the asymmetry: weakening a protection requires the highest burden; strengthening a protection when credible harm is demonstrated may proceed under a lower but still high threshold.

**Gap:** The exact lower threshold and the evidence standard for "credible harm" are not yet defined.

**Recommendation:** Define the evidence standard and thresholds in UD-1.

## R-17. Public participation as theater

**Classification:** Activation-threshold requirement

**Attack:** Affected-party input is collected but ignored because it has no formal weight in the decision.

**Current guard:** §14 requires a meaningful path for objections and experiences to enter the process.

**Gap:** No rule specifies how input must be reflected in the decision record or what happens if it is overridden.

**Recommendation:** Require a public-participation impact statement: what input was received, what was adopted, what was rejected, and why.

## R-18. SENTRY and verifier capture

**Classification:** Required before first meaningful production use

**Attack:** Verifiers are written to pass theater: a route returns 200, a function exists, but the system does not actually work.

**Current guard:** `NORTH_STAR_SSOT.md` §2.10 and §2.12 require reality-aligned consensus and receipt-based verification. §11 now states that only behavior-level evidence may establish enforcement.

**Gap:** The preflight suite is not yet fully behavior-level for every protected surface.

**Recommendation:** Require `function_behavior_test` assertions in artifact proof, as recently implemented in `services/product-build-orchestrator.js`.

## R-19. Constitutional framework becomes the product

**Classification:** Operational design (not a constitutional blocker)

**Attack:** The organization spends all its energy perfecting the framework and stops building value for users.

**Current guard:** §8.12 requires governance proportionality; §10 distinguishes the framework from product governance.

**Gap:** No explicit constitutional budget or proportionality metric.

**Recommendation:** Add a governance-cost metric: for each decision, record governance effort and decision impact, and review the ratio.

## R-20. Founder retains too much; founder retains too little

**Classification:** Ratification blocker

**Attack:** If founder authority is too broad, the Constitution is theater. If too narrow, the organization cannot act quickly in early stages.

**Current guard:** §12 now formalizes Founder Authority Under Constitutional Scrutiny, including retained powers, powers the founder cannot exercise deceptively, consensus as default, founder-directed decisions without full consensus, the three acts, and reality as final arbiter.

**Gap:** Emergency powers and succession are still unresolved (UD-4, UD-5).

**Recommendation:** Resolve UD-4 and UD-5 before ratification.
