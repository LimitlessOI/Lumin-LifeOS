# Supervision = read, grade, fix (operator contract)

When Adam says **“supervise”** he means:

1. **Read** shipped code **linearly**, file by file, not skim — especially files the builder touched.
2. **Grade** plainly (e.g. **strong / OK / weak / unacceptable**) against **Brief + mockups** (`docs/LIFEOS_PROGRAM_MAP_SSOT.md`, `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`) and basic mechanical quality (parses, loads, no obvious breakage) — **evidence-linked**, not comfort.
3. If **below bar**, **say why** (specific lines / patterns / missing acceptance) — no vague “looks fine.”
4. **Fix** or queue a **GAP-FILL** receipt with builder failure evidence; iterate until bar is met (**rolling stone**).

5. **No drift / no hallucination** — The supervisor **stops the line** when truth channels disagree. This matches **`docs/SSOT_NORTH_STAR.md`** §2.6 (**evidence-bearing status only**).

6. **Measure every slice duration** — use **`npm run lifeos:builder:throughput-meter`** (**`docs/BUILDER_TRUTH_AND_THROUGHPUT.md`**). Variance is diagnostic: slower may mean heavier files, verifier discipline, retries, infra — correlate with **`/builder/gaps`**, not hope.

After each **`committed`** builder slice affecting product paths: **read `target_file` line-by-line**; note **good / bad / neutral** internally; **fix bad through the builder or platform** (**verifiers**, **gaps**, **routes**) per §2.11 — IDE patch only with **`GAP-FILL:`** receipt when **`/build`** failed or verifier gap is proven.

### Drift vs hallucination (what to hunt)

| Failure | Examples | Supervisor action |
|--------|----------|---------------------|
| **Drift** | SSOT says “shipped” but route missing / overlay stale; backlog order contradicts **`## Approved Product Backlog`**; Brief vs actual IA; two docs claim different authority | Pick **code or SSOT** as source for the slice; **correct the other**; one **`## Change Receipts`** row that names both sides |
| **Hallucination** | “Deployed,” “wired,” “passes,” “Council agreed” **without** checkable receipts; **`committed:true`** taken as proof the **right** file changed or matches spec; prose summary that doesn’t match **`git`** / on-disk body | Demand evidence: path + HTTP/script/audit row **or** label **THINK / GUESS** and **do not** ship as **KNOW** |

### Minimal multi-AI quorum (two models)

Supervisor drafts and reorders work; confirm or debate alpha scope **on Railway** (`npm run lifeos:gate-change-run -- --preset maturity` or `--preset program-start` with **`PUBLIC_BASE_URL`** + **`COMMAND_CENTER_KEY`**). That invokes **deployed council** with server keys—the second lineage without leaking secrets into chat presets.

### Minimum checks each supervision pass

- **SSOT ↔ repo** — For anything you claim **done** or **working**: spot-check the cited paths exist and say what they do (routes register, overlay loads, migration applied).
- **Builder story ↔ diff** — Read the **actual committed file(s)** or **`git show`**, not only the model’s closing paragraph.
- **Epistemic labels** — Thin evidence → **THINK / GUESS**, not **KNOW**; never **green-when-red** on gates you skipped (**`CLAUDE.md`**, **`prompts/00-LIFEOS-AGENT-CONTRACT.md`**).
- **Machine assists** — Use **`npm run zero-drift:check`** / **`npm run ssot:validate`** where they apply; deterministic overlay pass: **`npm run lifeos:supervise:static`**. Those catch **syntax/shape**, not Brief truth — still run when overlays moved.

Truth scope for autonomy + memory sits in **`docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md`** and Amendment 39’s evidence ladder — supervision must **not** smuggle “institutional fact” from model fluency.

This is **not** the same as **`BUILDER_DAEMON_SUPERVISE_MODE=probe`** (HTTP **`/ready` + `/domains`** only). Probe proves **reachability**, not **product quality** or **epistemic honesty**.

## What the unattended daemon can do today

With defaults, the daemon does **probe** supervise + autonomous queue. That **cannot** substitute for a human or Conductor reading code.

Optional **machine layer** (deterministic):

- **`BUILDER_DAEMON_STATIC_CODE_PASS=1`** — after a successful queue run, invokes **`npm run lifeos:supervise:static`** (`scripts/supervise-code-static-pass.mjs`): overlay JS compile check (**`check:overlay`**) + **`style`** line-level guards for invalid single-`/` “comments” + **`property; /`**; CSS-only bogus **`/ ──`** (**not** valid JS **`// ──`** headers).
- **`BUILDER_DAEMON_STATIC_CODE_PASS_STRICT=1`** — if the static pass fails, the daemon cycle marks **failure** (fail-closed) instead of only logging.

Optional **sync before static pass** (local checkout often lags **`origin/main`** after **`POST /build`** commits):

- **`BUILDER_DAEMON_PULL_MAIN_BEFORE_STATIC=1`** — best-effort **`git pull --ff-only origin main`** before the static pass (ignored if **`git`** missing or dirty edge cases).

**Still not** Brief/mockup conformance; that remains **supervisor `/build`** doc smoke, **`inner-review`**, or Conductor word-for-word read.

## Commands

```bash
npm run check:overlay              # Inline script syntax in configured overlay paths
npm run lifeos:supervise:static   # Overlay syntax + deterministic style-footgun scan (all *.html under public/overlay/)
npm run lifeos:builder:throughput-meter -- --write-receipt   # slice-time baseline vs MVP ETA (see BUILDER_TRUTH_AND_THROUGHPUT.md)
```

## Receipt expectation

Supervision outcomes belong in **`## Change Receipts`** (**`AMENDMENT_21_LIFEOS_CORE.md`) with **what was read**, **grade**, **issues fixed**, **what remains**. If you found **drift** (SSOT vs code) or **hallucinated claims** (no receipt), record that explicitly — **what was wrong**, **what now counts as KNOWN**, **what is still guess**.
