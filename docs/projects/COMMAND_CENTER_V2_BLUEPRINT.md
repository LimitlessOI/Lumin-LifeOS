<!-- SYNOPSIS: Lumin Command & Control Center v2 — Builder Blueprint -->

# Lumin Command & Control Center v2 — Builder Blueprint

**Status:** Builder handoff — ready for `POST /api/v1/lifeos/builder/build`
**Target file:** `public/overlay/lifeos-command-center.html`
**SSOT:** `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`
**Governs:** Adam's executive oversight cockpit for Builder, OIL, AI Council, queues, runtime health, and product progress

## Canonical Boundary

Older command/control/dashboard attempts are legacy or reference material only unless explicitly called out here.

Canonical Command Center V2 frontend target:
- `public/overlay/lifeos-command-center.html`

Canonical Command Center V2 backend sources:
- `/api/v1/lifeos/command-center/*`
- OIL receipt endpoints

Non-canonical legacy surfaces:
- `public/overlay/command-center.html`
- `routes/command-center-routes.js`
- older quick-start/test-report docs

Those legacy surfaces may remain live for operator continuity, but they are not the source of truth for V2 design or Builder implementation.

---

## What Already Exists (Do Not Duplicate)

`public/overlay/command-center.html` is the **operational admin dashboard** — it has:
chat, ideas queue, conversation history, secrets vault, improvement proposals,
builder run/pause/resume controls, pending-adam list, projects list, and token optimizer.

The v2 cockpit (`lifeos-command-center.html`) is the **executive oversight layer** —
it emphasizes surveillance over operation. Fewer inputs, more signal. It reads from
the same endpoints but presents them as a system health map, not a control panel.

Do not duplicate: secrets vault, ideas submission form, conversation history, or
raw builder run/pause buttons. Those live in command-center.html.

---

## Auth Contract

```html
<!-- localStorage key name matches existing cc_key pattern -->
<script>
const KEY = localStorage.getItem('cc_key') || '';
const headers = { 'Content-Type': 'application/json', 'x-command-key': KEY };
// OIL/Gemini routes also accept x-command-key via authMiddleware alias
</script>
```

Show a compact key input bar at the top (same pattern as command-center.html).
Save to `localStorage.setItem('cc_key', value)`. Auto-reload after save.

---

## Design System

Match `public/overlay/command-center.html` exactly:

```css
:root {
  --bg:          #0a0e27;
  --card-bg:     #1a1f3a;
  --border:      #2a3f5f;
  --text:        #e0e0e0;
  --text-muted:  #888;
  --accent:      #4fc3f7;   /* cyan — primary state */
  --success:     #81c784;   /* green — VERIFIED / healthy */
  --warning:     #f59e0b;   /* amber — CONDITIONAL / paused */
  --error:       #e53935;   /* red — BLOCKER / fail */
  --missing:     #555;      /* gray — no data yet */
}

body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       background: var(--bg); color: var(--text); margin: 0; padding: 16px; }
.card { background: var(--card-bg); border: 1px solid var(--border);
        border-radius: 10px; padding: 18px; }
.card:hover { border-color: var(--accent); transition: border-color 0.2s; }
.section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
                 font-weight: 700; color: var(--text-muted); margin-bottom: 12px; }
.status-pill { padding: 2px 10px; border-radius: 999px; font-size: 11px;
               font-weight: 700; letter-spacing: 0.08em; }
```

**Ring component** (SVG, reused across all snapshot cards):
```html
<svg viewBox="0 0 36 36" width="52" height="52">
  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1f3a" stroke-width="3.8"/>
  <circle cx="18" cy="18" r="15.9" fill="none" stroke="VAR_COLOR" stroke-width="3.8"
          stroke-dasharray="PCT 100" stroke-dashoffset="25"
          style="transition: stroke-dasharray 0.6s ease;" />
</svg>
```
Color: success for healthy, warning for conditional, error for blocked, missing for unknown.

---

## Layout

```
┌─ Auth Bar ─────────────────────────────────────────────────────────────────────┐
│ Key: [input] [Save]  Last refresh: 14:32  [⟳ Refresh] [Auto: ON]              │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ A: Executive Snapshot ────────────────────────────────────────────────────────┐
│ [Builder Mode]  [Alpha Cert]  [OIL Health]  [Railway]  [Neon]  [Adam Queue]   │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ B: Builder Control ──────────┐  ┌─ C: OIL Phase Wheel ──────────────────────┐
│ Mode · Scope · Queue · Last   │  │  14-segment ring   Phase ledger list       │
│ build · Rollback SHA          │  │  Hover=detail      Click=full evidence     │
└───────────────────────────────┘  └────────────────────────────────────────────┘

┌─ D: Adam Decision Queue ──────────────────────────────────────────────────────┐
│ P0 (urgent)  →  P1 (normal)  →  P2 (low)  →  Idea                            │
│ Each: title · why · risk · recommended · [Approve] [Reject] [Defer]           │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ E: AI Council Hub ───────────┐  ┌─ F: Product Progress Map ─────────────────┐
│ Send direction · Ask status   │  │ Cards per product lane: phase · % · next   │
│ Council member responses      │  │ blocker · revenue relevance · risk         │
│ Consensus · Dissent           │  │                                            │
└───────────────────────────────┘  └────────────────────────────────────────────┘

┌─ G: Infrastructure Health ────┐  ┌─ H: OIL Security Alpha ───────────────────┐
│ Node map: GitHub→Railway→Neon │  │ Receipt stream: gemini_proof · supervised  │
│ SSOT→Builder→OIL Receipts     │  │ canary · daily summary · mode changes      │
└───────────────────────────────┘  └────────────────────────────────────────────┘

┌─ I: Token Economics ──────────┐  ┌─ J: Model Performance ────────────────────┐
│ 30-day savings sparkline      │  │ Leaderboard · win rate · quality score     │
│ Daily cost · free model %     │  │ Task type breakdown by model               │
└───────────────────────────────┘  └────────────────────────────────────────────┘
```

Grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 16px;`
Single column on mobile (`@media (max-width: 700px)`).
Sections A and D are full-width rows.

---

## Section A — Executive System Snapshot

**Purpose:** Glance at the whole system in under 10 seconds.

**7 cards in a row** (use `grid-template-columns: repeat(7, 1fr)` at ≥1400px,
collapse to 3–4 at 900–1400px, 2 at mobile):

| Card | Data Source | Healthy | Warning | Error |
|------|-------------|---------|---------|-------|
| Builder Mode | `GET /api/v1/lifeos/builder/ready` → `.builder.callCouncilMember` | SUPERVISED | MANUAL | AUTONOMOUS |
| Alpha Cert | `GET /api/v1/builder/cert/phase14` *(new)* | ALPHA_READY | NOT_READY | MISSING |
| OIL Health | `GET /api/v1/oil/receipts/type/daily_oil_summary?limit=1` | receipts > 0 | receipts = 0 (no data) | error |
| Railway SHA | `GET /api/v1/lifeos/builder/ready` → `.codegen.deploy_commit_sha` | sha present | — | error |
| Gemini Live | `GET /api/v1/gemini/proof/status` → `.last_proof` | confirmed=true, <2h ago | confirmed=true, >2h | no proof |
| Neon DB | `GET /api/health` → `.database` | connected | — | error |
| Adam Queue | `GET /api/v1/pending-adam` → count | 0 | 1–3 | 4+ |

Each card:
```html
<div class="snap-card" data-section="builder-mode">
  <div class="snap-ring"><!-- SVG ring --></div>
  <div class="snap-label">Builder Mode</div>
  <div class="snap-value">SUPERVISED</div>
  <div class="snap-detail">click for detail</div>
</div>
```

Click → opens a slide-in detail drawer on the right (fixed position, 340px wide,
slides in from right: -340px → 0). Drawer contains: last fetched timestamp,
full JSON response snippet, relevant receipt IDs, and one recommended action.

---

## Section B — Builder Control Panel

**Purpose:** Current authority, mode, scope, queue state.

**API endpoints:**
```
GET  /api/v1/lifeos/builder/ready       — mode fields, SHA, github_token, policy_revision
GET  /api/v1/builder/status             — paused boolean, last_run summary, queue depth
GET  /api/v1/builder/queue              — active/queued segments list
GET  /api/v1/lifeos/builder/gaps        — recent failures and GAP-FILL events
GET  /api/v1/builder/mode      (NEW)    — { mode: "SUPERVISED", rules: {...} }
POST /api/v1/builder/mode      (NEW)    — body: { mode: "MANUAL" } → writes BUILDER_MODE_CHANGE receipt
POST /api/v1/builder/pause              — pause
POST /api/v1/builder/resume             — resume
```

**UI Elements:**
- **Mode badge** (MANUAL/SUPERVISED/AUTONOMOUS) with color pill — pull from new `GET /builder/mode`
- **Safe-scope status** — "19 allowed paths, 8 blocked paths" (static from config, or from new endpoint)
- **Queue depth** — number from `GET /builder/queue` response array length
- **Last build result** — from `GET /builder/status` → `.last_run.status`
- **Last commit SHA** — from `GET /lifeos/builder/ready` → `.codegen.deploy_commit_sha` (first 8 chars)
- **Paused indicator** — from `GET /builder/status` → `.paused`

**Actions (each requires confirmation dialog):**
- `[Change Mode]` → dropdown (MANUAL / SUPERVISED / AUTONOMOUS) → POST /builder/mode
- `[Pause Builder]` → POST /builder/pause
- `[Resume Builder]` → POST /builder/resume
- `[View Rollback]` → link to builder_replay_baselines table (read-only display)
- `[Send Direction]` → textarea → POST /lifeos/builder/task

**Confirmation pattern:**
```html
<div class="confirm-overlay" style="display:none">
  <div class="confirm-box">
    <p class="confirm-msg"></p>
    <button onclick="confirmAction()">Confirm</button>
    <button onclick="cancelConfirm()">Cancel</button>
  </div>
</div>
```

---

## Section C — OIL Phase Verification Wheel

**Purpose:** Visual proof that all 14 phases of Builder governance are certified.

**API endpoint:**
```
GET /api/v1/builder/cert/phase14  (NEW)
```

**Response shape this endpoint should return:**
```json
{
  "alpha_ready": true,
  "status": "ALPHA_READY",
  "verified": 13,
  "conditional": 0,
  "blockers": 0,
  "certified_at": "2026-05-22T...",
  "receipt_id": 48,
  "phase_ledger": [
    { "phase": 1, "label": "Serial Execution...", "status": "VERIFIED", "notes": "...", "confidence": 94 },
    { "phase": 2, "label": "Token Budget...",     "status": "VERIFIED", "notes": "...", "confidence": 93 },
    ...
  ]
}
```

**Implementation note for the backend:** Query `builder_audit_receipts WHERE findings LIKE 'Phase 14%' AND written_by='OIL' ORDER BY audited_at DESC LIMIT 1` — the findings_json for Phase 14 cert receipts does not store the full phase_ledger (it's only in the markdown file). The endpoint should re-derive phase status live using the same `readCanonicalPhase7RuntimeProof` + `readFallbackPhaseReceiptFromDb` logic from `scripts/oil-proof-phase14-alpha-certification.mjs`, exposed as a lightweight read-only query. Do NOT re-run probes — just read existing DB receipts.

**Phase wheel UI:**
```
      Phase 1 (top)
  13              2
12                  3
11                  4
10                  5
   9              6
      8      7
        (center)
    ALPHA_READY
    13 / 13 phases
```

SVG polar wheel, 13 segments at 360/13° = 27.7° each. Each segment:
- `stroke` = var(--success) for VERIFIED, var(--warning) for CONDITIONAL, var(--error) for BLOCKER/MISSING

Center circle shows: status text + verified count.

On hover over a segment: tooltip shows phase number, label, status, confidence, notes.
On click: opens detail drawer with full evidence (receipt ID, audit_session_id, findings).

Below wheel: scrollable list of all 13 phases with status icons and one-line notes.

**Daily OIL summary strip** (below phase wheel):
```
GET /api/v1/oil/receipts/type/daily_oil_summary?limit=1
→ show: total receipts in last 24h, by-type breakdown as small pills
```

---

## Section D — Adam Decision Queue

**Purpose:** Show only what Adam needs to decide. Nothing else.

**API endpoints:**
```
GET  /api/v1/pending-adam                      — all pending items (priority-sorted by DB)
POST /api/v1/pending-adam/:id/resolve          — body: { actual_choice, resolved_notes }
```

**Data shape returned:**
```json
[
  {
    "id": "...",
    "title": "...",
    "description": "...",
    "type": "approval|decision|credential|review|other",
    "priority": "urgent|normal|low",
    "context": { "segmentId": "...", "projectSlug": "..." },
    "created_at": "..."
  }
]
```

**Priority mapping:**
- `urgent` → P0 (red badge — blocks production/trust/security)
- `normal` → P1 (amber badge — needed before next supervised run)
- `low`    → P2 (blue badge — can wait)
- `type=idea` → Idea (gray badge — not urgent)

**Each item card:**
```
[P0] Approve Builder mode change to AUTONOMOUS
     Needed because: Builder supervisor requested escalation after 3 supervised builds
     Risk if ignored: Builder stays paused, no autonomous work proceeds
     Recommended: Approve (council consensus 4/5)
     [✓ Approve]  [✗ Reject]  [→ Defer]
```

One-click actions map to `actual_choice` values:
- Approve → `{ actual_choice: "approve", resolved_notes: "Adam approved via cockpit" }`
- Reject  → `{ actual_choice: "reject", resolved_notes: "Adam rejected via cockpit" }`
- Defer   → moves item to bottom of list client-side (does not resolve in DB)

Show empty state clearly: "No pending decisions — system is operating cleanly."

---

## Section E — AI Council Communication Hub

**Purpose:** Adam talks to the council and sees their structured response without leaving the cockpit.

**API endpoints:**
```
POST /api/v1/lifeos/builder/task        — dispatch task/direction to council
POST /api/v1/lifeos/builder/review      — request code review from council
GET  /api/v1/lifeos/builder/history     — builder audit trail (last N)
GET  /api/v1/model-performance/leaderboard   — current model rankings
GET  /api/v1/ai/performance             — per-member accuracy scores
```

**Input panel (compact):**
```
Domain: [dropdown — pulls from GET /lifeos/builder/domains]
Message: [textarea — "What should we build next?" / "Review this plan..." / etc.]
[Ask Council]  [Get Status Summary]  [Request Dissent]
```

**Response display:**
Parse the council response and display:
- Which members contributed (from `model_used` field in history)
- The consensus recommendation (bold)
- Any dissent or alternative views (italic)
- Confidence level (if present in response)
- Whether recommendation affects: Builder | OIL | SSOT | Product (tag pills)
- One recommended next action with `[Queue This Task]` button

History strip (last 5 council interactions):
```
GET /api/v1/lifeos/builder/history → show task, domain, committed, created_at
```

---

## Section F — Product / Project Progress Map

**Purpose:** Where are we with each product lane?

**API endpoints:**
```
GET /api/v1/projects                    — all projects: id, name, status, phase, completion_pct
GET /api/v1/projects/:id               — drill-down: segments, last shipped, next task, blockers
GET /api/v1/projects/readiness/queue    — which projects are build-ready
```

**Product lanes to show** (use project slugs from DB, or hardcode initial set):
```
builder-oil-governance    Builder / OIL governance
lifeos-core               LifeOS core domains
memory-capsules           Memory Capsule Alpha
command-center            Command Center (this page!)
tc-coordinator            Transaction Coordinator / TC
clientcare-billing        ClientCare / billing
tsos                      TokenSaverOS / TSOS
security-alpha            OIL Security Alpha
```

**Each project card:**
```
[●●●●●●○○○○]  Builder / OIL Governance   60%
Phase 14: ALPHA_READY
Last shipped: cert script BLOCKED_RUNTIME fix
Next: builder mode endpoint + cockpit wire
Blockers: none
Revenue relevance: LOW (infrastructure)
Risk: LOW
[→ Drill down]
```

Progress bar: `width: X%` with gradient fill.
Drill-down click: opens detail drawer with segment list from `GET /projects/:id/segments`.

---

## Section G — Infrastructure Health Map

**Purpose:** See the stack as a connected system. One visual, no logs.

**API endpoints:**
```
GET /api/health                         — server health + DB connected
GET /api/v1/lifeos/builder/ready        — github_token, callCouncilMember, SHA
GET /api/v1/gemini/proof/status         — AI council connectivity
GET /api/v1/reality/snapshot            — route integrity hash
```

**Node graph (SVG or HTML + CSS flexbox):**

```
  [GitHub]───────deploy───────▶[Railway]────────▶[Neon DB]
     │                              │
  (source truth)               (runtime truth)   (data truth)
     │                              │
  [SSOT Docs]──governs──────▶[Builder]──writes──▶[OIL Receipts]
                                    │
                              [AI Council]──advises──┘
```

Each node is a clickable box:
- Green border = healthy
- Amber border = degraded / conditional
- Red border = down / error

Hover: shows basic health + last checked timestamp.
Click: opens detail drawer with full API response, related receipts, action buttons.

**Health mapping:**
- GitHub: `builder/ready.builder.github_token === true`
- Railway: `builder/ready.codegen.deploy_commit_sha` present
- Neon DB: `GET /api/health.database === "connected"` (or similar)
- AI Council (Gemini): `gemini/proof/status.last_proof` exists + recent
- SSOT: always green (local static — if this page loads, SSOT is accessible)
- OIL Receipts: `oil/receipts?limit=1` returns at least one row

---

## Section H — OIL Security Alpha

**Purpose:** Live feed of security receipts. Awareness, not action.

**API endpoints:**
```
GET /api/v1/oil/receipts?limit=20                         — all recent receipts
GET /api/v1/oil/receipts/type/gemini_live_proof?limit=5   — Gemini proofs
GET /api/v1/oil/receipts/type/builder_supervised_build    — supervised build events
GET /api/v1/oil/receipts/type/canary_trip                 — canary events
GET /api/v1/oil/receipts/type/daily_oil_summary?limit=1   — daily summary
GET /api/v1/gemini/proof/status                           — latest proof status
```

**Layout:**
Left: scrollable receipt stream (newest first). Each receipt row:
```
[TYPE PILL]  2026-05-22 14:31  receipt_id: 219b5cc7
             payload summary (first 80 chars)
```
Color-coded type pills:
- `gemini_live_proof` → cyan
- `builder_supervised_build` → green
- `daily_oil_summary` → blue
- `canary_trip` → red
- `builder_mode_change` → amber

Right: summary counters for last 24h (from `daily_oil_summary`):
```
Gemini proofs:        3
Supervised builds:    7
Daily summaries:      1
Canary trips:         0
Red team findings:    0
```

Gemini proof status card:
```
Last proof: 14:31  (42 min ago)
Response:   CONFIRMED
Latency:    890ms
Receipt:    219b5cc7
```
Status: green if < 4h, amber if 4–12h, red if > 12h or no proof.

**Stage 1 placeholders** (show with "Coming soon" label):
- Honeypot probes
- Open red team findings
- Secret inventory status

---

## Section I — Token Economics (NEW — not in GPT blueprint)

**Purpose:** Show the cost of running the system and what free-tier routing is saving.

**API endpoint:**
```
GET /api/v1/optimizer/stats    — { today: { tokens_saved, cost_saved_usd, free_pct },
                                    trend: [ { date, tokens_saved, cost_saved_usd } × 30 ] }
```

**UI:**
- Large number: total USD saved (all time or 30 days)
- Sparkline: 30-day cost-saved trend (SVG path, no external charting library)
- Today's stats: tokens saved · cost saved · % on free models
- Ratio pill: "X% of today's AI calls were free"

**Sparkline implementation (pure SVG, no external deps):**
```js
function sparkline(data, width=200, height=40) {
  const max = Math.max(...data);
  const pts = data.map((v,i) =>
    `${i * (width/(data.length-1))},${height - (v/max)*height}`
  ).join(' ');
  return `<polyline points="${pts}" fill="none" stroke="#4fc3f7" stroke-width="1.5"/>`;
}
```

---

## Section J — Model Performance Leaderboard (NEW — not in GPT blueprint)

**Purpose:** Which AI model is actually winning? Accountability for the council.

**API endpoints:**
```
GET /api/v1/model-performance/leaderboard   — ranked list: model, win_rate, avg_quality, task_count
GET /api/v1/ai/performance                  — per-member accuracy scores
GET /api/v1/model-performance/winners       — recent winners per lens
```

**UI:**
```
RANK  MODEL             WIN RATE  AVG QUALITY  TASKS
 1    gemini_flash      67%       8.4/10       142
 2    claude_sonnet     58%       8.7/10        89
 3    groq_llama        44%       7.1/10       201
 4    ollama_deepseek   31%       6.8/10        55
```

Progress bars for win rate (out of 100%).
Click a row: shows recent task list for that model.

Below table: AI Council member accuracy scores from `/ai/performance`:
- Accuracy per member (if they predicted correctly vs Adam's actual choice)

---

## New Endpoints Required (Build Before UI)

These 3 endpoints do not exist. They must be added before the cockpit can wire sections B and C.

### 1. `GET /api/v1/builder/cert/phase14`

**File:** `routes/lifeos-council-builder-routes.js` (or a new `routes/builder-cert-routes.js`)
**Auth:** `requireKey` middleware

**Logic:**
```js
// 1. Get the most recent Phase 14 OIL cert receipt
const { rows: [latest] } = await pool.query(`
  SELECT id, verdict, findings, findings_json, audited_at
  FROM builder_audit_receipts
  WHERE written_by = 'OIL'
    AND findings ILIKE 'Phase 14 Alpha-Ready Certification%'
  ORDER BY audited_at DESC LIMIT 1
`);

// 2. Get phase-by-phase status from individual phase receipts
// (same logic as the cert script — read builder_audit_receipts for each phase pattern)
// Return a lightweight phase_ledger array

// 3. Return:
res.json({
  alpha_ready: latest ? latest.findings_json?.alpha_ready : false,
  status: latest ? (latest.findings_json?.alpha_ready ? 'ALPHA_READY' : 'NOT_ALPHA_READY') : 'UNKNOWN',
  verified: latest?.findings_json?.verified ?? 0,
  conditional: latest?.findings_json?.conditional ?? 0,
  blockers: latest?.findings_json?.blockers ?? 0,
  certified_at: latest?.audited_at ?? null,
  receipt_id: latest?.id ?? null,
  phase_ledger: [], // populate from phase_ledger in findings_json if stored, else empty
});
```

The Phase 14 cert script should be updated to write `phase_ledger` into `findings_json` when it writes the receipt. This makes the endpoint trivial.

### 2. `GET /api/v1/builder/mode`

**File:** `routes/lifeos-council-builder-routes.js`
**Auth:** `requireKey`

```js
import { DEFAULT_BUILDER_MODE, BUILDER_MODE_RULES } from '../config/builder-release-modes.js';

router.get('/mode', requireKey, (req, res) => {
  res.json({
    mode: DEFAULT_BUILDER_MODE,
    rules: BUILDER_MODE_RULES[DEFAULT_BUILDER_MODE],
    all_modes: Object.keys(BUILDER_MODE_RULES),
  });
});
```

Note: `DEFAULT_BUILDER_MODE` is a module-level constant, not runtime-mutable. If mode-switching is needed at runtime, a DB-backed or in-memory override table should be added. For v1, returning the compiled default is sufficient.

### 3. `POST /api/v1/builder/mode`

**File:** `routes/lifeos-council-builder-routes.js`
**Auth:** `requireKey`

```js
import { BUILDER_MODE, BUILDER_MODE_RULES } from '../config/builder-release-modes.js';
import { writeSecurityReceipt, SECURITY_RECEIPT_TYPES } from '../services/oil-security-receipts.js';
import { pool } from '../core/database.js';

router.post('/mode', requireKey, async (req, res, next) => {
  try {
    const { mode } = req.body;
    if (!BUILDER_MODE[mode]) {
      return res.status(400).json({ error: `Invalid mode: ${mode}` });
    }
    const { receipt_id } = await writeSecurityReceipt(
      SECURITY_RECEIPT_TYPES.BUILDER_MODE_CHANGE,
      { requested_mode: mode, requested_at: new Date().toISOString(), source: 'cockpit' },
      pool
    );
    // TODO: persist active mode to a builder_runtime_config table for true runtime switching
    res.json({ ok: true, mode, receipt_id, note: 'Mode change receipt written. Restart required for compiled default to change.' });
  } catch (err) { next(err); }
});
```

---

## Phase 14 Cert Script Update (minor — store phase_ledger in findings_json)

In `scripts/oil-proof-phase14-alpha-certification.mjs`, update the `writeOILAuditReceipt` call to include `phase_ledger` in `findingsJson`:

```js
findingsJson: {
  alpha_ready: alphaReady,
  verified: verified.length,
  conditional: conditional.length,
  blockers: blockers.length,
  phase_ledger: phaseResults,  // ← ADD THIS
},
```

This allows `GET /api/v1/builder/cert/phase14` to return the full ledger without re-querying all phase receipts.

---

## Build Sequence

**Phase 1 — Maximum value, minimum build** (build these first):

1. Update cert script to store `phase_ledger` in `findingsJson` (1 line)
2. Add `GET /builder/cert/phase14` endpoint
3. Add `GET /builder/mode` + `POST /builder/mode` endpoints
4. Build `public/overlay/lifeos-command-center.html` with sections A, B, C, D (snapshot + builder + phase wheel + decision queue)

**Phase 2 — System awareness:**

5. Add sections F (projects) + H (security receipts)

**Phase 3 — Intelligence layer:**

6. Add sections E (council hub) + G (infra map) + I (token economics) + J (model leaderboard)

**Phase 4 — Navigation integration:**

7. Add link in `public/overlay/index.html` to lifeos-command-center.html
8. Mount a `GET /api/v1/lifeos/command-center/summary` aggregate endpoint that rolls up sections A–D in one call (reduces page-load requests from 7+ to 1)

---

## Aggregate Summary Endpoint (Phase 4)

`GET /api/v1/lifeos/command-center/summary` — single call that returns:

```json
{
  "builder": { "mode": "SUPERVISED", "paused": false, "sha": "6061d1a2", "queue_depth": 0 },
  "cert": { "alpha_ready": true, "verified": 13, "blockers": 0 },
  "oil": { "last_summary": { "total_receipts": 12, "by_type": {...} } },
  "gemini": { "last_proof": { "confirmed": true, "latency_ms": 890, "age_minutes": 42 } },
  "adam_queue": { "count": 2, "urgent_count": 0 },
  "health": { "database": "connected", "github_token": true }
}
```

This halves page-load time and simplifies client JS.

---

## SSOT Amendment Additions Needed

Add to `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`:

**Owned Files (add):**
- `public/overlay/lifeos-command-center.html` — v2 executive oversight cockpit

**API Surface (add):**
- `GET /api/v1/builder/cert/phase14` — Phase 14 cert status + phase ledger
- `GET /api/v1/builder/mode` — Current builder release mode
- `POST /api/v1/builder/mode` — Change builder release mode (writes BUILDER_MODE_CHANGE receipt)
- `GET /api/v1/lifeos/command-center/summary` — Aggregate snapshot (Phase 4)

**Build Plan (add):**
- [ ] Build `lifeos-command-center.html` Phase 1 (sections A, B, C, D)
- [ ] Add 3 new endpoints to builder routes
- [ ] Update cert script to write phase_ledger to findingsJson
- [ ] Build Phase 2 (sections F, H)
- [ ] Build Phase 3 (sections E, G, I, J)
- [ ] Add aggregate summary endpoint
- [ ] Wire nav link from index.html

---

## What the GPT Blueprint Was Missing (Summary)

| Missing Item | Impact | Added In |
|---|---|---|
| Section I: Token Economics | Shows TSOS value; endpoint already exists | New section I |
| Section J: Model Performance Leaderboard | Council accountability; endpoints exist | New section J |
| Exact API endpoint per section | Builder can't code without these | Every section |
| New endpoints needed | Page would 404 without these | Separate spec section |
| Auth contract (x-command-key / localStorage) | Builder would pick wrong header | Auth Contract section |
| CSS design tokens | Would look inconsistent with command-center.html | Design System section |
| Relationship to existing command-center.html | Would duplicate panels | What Already Exists section |
| Phase 14 cert script update | Endpoint would need complex re-query | Cert Script Update section |
| Aggregate summary endpoint | Page load would make 7+ serial requests | Phase 4 section |
| Phase-by-phase build sequence | Blueprint had no priority order | Build Sequence section |
| SSOT amendment additions | Governance gap | SSOT section |
