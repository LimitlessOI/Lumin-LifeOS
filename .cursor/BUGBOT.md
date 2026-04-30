# Lumin-LifeOS Bugbot Review Rules

Prioritize real defects over style.

Review order:
1. Correctness and regressions
2. Security and privacy leaks
3. Runtime/deploy breakage
4. SSOT and truth-drift
5. Token/cost waste only when it materially affects behavior or economics

Project-specific rules:
- Findings must be evidence-based. Do not infer "green" from intent.
- Builder, supervisor, and daemon paths are load-bearing. Watch for fake health, misleading receipts, stale defaults, and route drift.
- For product code, prefer bugs and risks over formatting nits.
- Flag any change that claims automation, memory, or supervision behavior that is not actually wired.
- Flag any human-facing output that incorrectly uses TSOS machine language.
- Watch for missing route registration, missing migrations, missing env/threading, bad model defaults, and syntax/runtime boot risks.
- For Site Builder, watch for generic design output, fake proof, broken mobile behavior, inaccessible markup, and quality gates that are declared but not enforced.
- For memory/governance code, distinguish between facts, receipts, and law. Do not let evidence-ladder claims pretend to be governance truth.

When possible, cite:
- changed file
- approximate line or symbol
- why it matters in production
- smallest safe fix
