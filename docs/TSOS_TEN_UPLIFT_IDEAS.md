# TSOS — push grades toward 10 and beyond (idea bank)

**Purpose:** Concrete levers beyond “try harder.” Mix of **repo-native** work and **industry patterns** (routing, caching, SRE). Not all apply at once — pick slices.

**Last updated:** 2026-04-30

---

## Already shipped in repo (this wave)

1. **Doctor probe retries** — transient **502/503/504** on GET so Railway jitter does not false-negative scores (`scripts/tsos-doctor.mjs`).
2. **Daemon leg uses rolling window** — last **N** `cycle_ok` / `cycle_failed` from **`data/builder-daemon-log.jsonl`** when ≥8 events (`TSOS_DAEMON_GRADE_WINDOW`, default **40**); lifetime totals are fallback only (`scripts/tsos-suite-self-grade.mjs`).
3. **Token score** — softer **day-over-day** bands + **7d stability bonus** when rolling average savings stays high (`scripts/tsos-token-efficiency.mjs`).

---

## 25 ideas — go further (creative + external patterns)

1. **Cheap-then-escalate router** — classify task complexity with a **small** model; escalate to Sonnet/Opus only on failure or low confidence (common production pattern).
2. **Semantic response cache** — embed recent prompts; skip repeat council calls above **0.93** similarity (industry: semantic caching cuts repeat spend).
3. **Exact prompt cache** — hash `(system + domain + spec fingerprint)` for deterministic **`/build`** retries.
4. **Batch non-urgent council calls** — queue similar **`/task`** reviews into one council round with explicit batch delimiter (careful with context limits).
5. **Provider-local failover budget** — cap expensive provider retries per hour in **`task-model-routing`** with receipts when exhausted.
6. **Useful-work guard audit** — sweep **`register-schedulers.js`** for any cron AI not wrapped in **`createUsefulWorkGuard`** (Zero Waste rule).
7. **Synthetic journey monitors** — hourly **`POST /health`** + **`/builder/ready`** + one **`/build` dry** from Railway cron or GitHub Action with **`COMMAND_CENTER_KEY`** secret.
8. **Error budget file** — weekly allowed **`/builder/gaps`** syntax-class rows; crossing budget triggers **`gate-change`** proposal automatically (SRE-style).
9. **Daemon pause on gap signature** — already partially there — tighten **`failureSignatureStreak`** → pause queue until **`/gaps`** triage receipt.
10. **Preview deploy lane** — branch previews so **`/build`** targets preview URL before **`main`** merge (reduces prod HTML thrash).
11. **Inner-review on routes-only slices** — **`npm run lifeos:builder:inner-review`** mandatory when **`target_file`** under **`routes/`** (cheap quality gate).
12. **Cost attribution tags** — tag council audit rows with **`routing_key`** + **`intent`** for dashboard of spend by feature (truth for tuning).
13. **Rolling token dashboard** — expose **`stability_bonus`** + components on **`/api/v1/twin/tokens`** UI so Adam sees *why* grade moves.
14. **Night/off-peak heavy builds** — shift large HTML regen to window when Railway cold starts are rarer (operational, not moral).
15. **Compress injected **`files[]`** — strip comments / minify injected MD for token-heavy **`/build`** when spec allows (platform option).
16. **Structured output JSON mode** — where providers support **`response_format`**, force JSON plans before codegen to reduce repair loops.
17. **Post-commit verifier webhook** — on GitHub **`push`**, run **`npm run tsos:builder`** from Actions against **`PUBLIC_BASE_URL`** (secret).
18. **Chaos probe** — monthly **`502`** injection test on staging to verify doctor retries + supervisor backoff (Netflix-style discipline, lighter form).
19. **Council “shadow” grade** — sample 1% of **`/build`** outputs with **`mode: review`** logging score without blocking ship (continuous quality signal).
20. **Twin-derived savings floor** — if **`avg_savings_pct`** stuck low, alert when **`freeCalls`** drop (provider pricing drift).
21. **Human-readable gap taxonomy** — map **`/gaps`** **`reason`** regex buckets to owner prompts (`prompts/lifeos-council-builder.md` tweaks).
22. **Railway min instances** — if cold **`502`** persists, **min 1** instance cost vs reliability tradeoff (vendor knob).
23. **Edge CDN for overlays** — static **`/overlay/*.html`** behind CDN cache headers for faster UX (does not fix council cost but improves perceived health).
24. **Adam-visible “next slice” RSS** — trivial JSON feed from **`LIFEOS_PROGRAM_MAP_SSOT.md`** + queue cursor for operator glanceability.
25. **Annual vendor review** — quarterly compare OpenRouter/Gemini/Groq pricing vs **`config/task-model-routing.js`** defaults (spreadsheet + receipt row).

---

## Pointers

- **≥75% savings brainstorm (TCO + TSOS, 50 ideas in two batches):** **`docs/projects/TCO_TSOS_75_PERCENT_SAVINGS_BRAINSTORM.md`**
- Program map SSOT: **`docs/LIFEOS_PROGRAM_MAP_SSOT.md`**
- Compound loop: **`docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`**
- Operator env (daemon window): **`docs/BUILDER_OPERATOR_ENV.md`**
