<!-- SYNOPSIS: LifeRE — Builder Digital Twin (complete A-to-Z, zero product decisions) -->

# LifeRE — Builder Digital Twin (Complete A-to-Z)

**Audience:** Coder / Builder — execute waves W1–W6 without product decisions
**Authority chain:** `docs/LIFERE_MASTER_BLUEPRINT.md` → this file → locked `config/lifere-*.json`
**Twin law:** `docs/LIFERE_FULL_DIGITAL_TWIN_BLUEPRINT.md`
**Feature map:** `docs/LIFERE_A_TO_Z_FEATURE_MAP.md`
**Last Updated:** 2026-06-13
**Status:** Point B blueprint — **complete**. Coder implements wave-by-wave; scope is **not** reduced.

---

## 0. CODER RULE

Do **not** decide: product scope, metrics defaults, permissions, API shapes, UI behavior, workflow order, success tests, or build sequence. All locked below.

If a spec conflicts with code, **spec wins** — file a GAP receipt, do not improvise.

Every new `.js` file:

```js
/** @ssot docs/projects/AMENDMENT_LIFERE.md */
```

---

## 1. STORAGE CONVENTION (all waves)

```
data/twins/{tenant_id}/{user_id}/personal.json
data/twins/{tenant_id}/{user_id}/personality.json
data/twins/{tenant_id}/{user_id}/communication.json
data/twins/{tenant_id}/{user_id}/goal.json
data/twins/{tenant_id}/{user_id}/skill.json
data/twins/{tenant_id}/{user_id}/performance.json
data/twins/{tenant_id}/{user_id}/future.json
data/twins/{tenant_id}/{user_id}/memory.json
data/twins/{tenant_id}/{user_id}/permission.json
data/twins/{tenant_id}/{user_id}/modules/{module_key}.json
data/twins/{tenant_id}/relationships/{edge_id}.json
data/twins/founder/adam/adam.json
data/twins/founder/sherry/sherry.json
data/twins/founder/household/marriage.json
data/twins/founder/household/family.json
data/twins/founder/household/household.json
data/twins/founder/governance/founder.json
data/lifere-scenarios/{user_id}/{scenario_id}.json
data/lifere-experiments/{user_id}/{experiment_id}.json
products/receipts/LIFERE_*.json
```

**DECISION MADE:** File-backed twins v1; Postgres mirror tables for query/reporting from W2 onward.

---

## 2. UNIVERSAL TWIN JSON SCHEMAS (copy exactly)

### 2.1 Personal Twin (`personal.json`)

```json
{
  "schema": "lifere_personal_twin_v1",
  "name": "",
  "roles": [],
  "timezone": "America/Chicago",
  "energy_pattern": { "peak_hours": [], "low_hours": [], "cycle_notes": "" },
  "motivations": [],
  "demotivators": [],
  "decision_patterns": [],
  "blind_spots": [],
  "strengths": [],
  "weaknesses": [],
  "fears": [],
  "constraints": [],
  "updated_at": null,
  "label": "THINK"
}
```

### 2.2 Personality Twin (`personality.json`)

```json
{
  "schema": "lifere_personality_twin_v1",
  "humor": 0.5,
  "beliefs": [],
  "confidence": 0.5,
  "warmth": 0.5,
  "directness": 0.5,
  "calibration_drafts_rated": 0,
  "updated_at": null
}
```

### 2.3 Communication Twin (`communication.json`)

```json
{
  "schema": "lifere_communication_twin_v1",
  "phrases": [],
  "tone_vector": { "formal": 0.3, "casual": 0.7, "empathy": 0.8 },
  "story_style": "conversational",
  "banned_phrases": ["As an AI", "I hope this email finds you well"],
  "channel_prefs": { "sms_max_chars": 320, "email_signature": "" },
  "updated_at": null
}
```

### 2.4 Goal Twin (`goal.json`)

```json
{
  "schema": "lifere_goal_twin_v1",
  "horizons": {
    "90d": { "income_gci": 30000, "family": "", "health": "", "freedom": "" },
    "1y": {},
    "5y": {}
  },
  "weights": { "income": 0.35, "family": 0.25, "freedom": 0.2, "health": 0.2 },
  "updated_at": null
}
```

### 2.5 Skill Twin (`skill.json`)

```json
{
  "schema": "lifere_skill_twin_v1",
  "modules": {},
  "scores": {},
  "practice_hours": {},
  "last_drill": null,
  "updated_at": null
}
```

Keys in `modules` match `config/lifere-coaching-modules.json` `id` values.

### 2.6 Performance Twin (`performance.json`)

```json
{
  "schema": "lifere_performance_twin_v1",
  "funnel_counts": {},
  "conversion_rates": {},
  "source_roi": {},
  "bottleneck_stage": null,
  "income_goal_monthly": 30000,
  "updated_at": null
}
```

### 2.7 Future Twin (`future.json`)

```json
{
  "schema": "lifere_future_twin_v1",
  "current_path_projection": { "90d": {}, "1y": {} },
  "confidence": 0.0,
  "assumptions": [],
  "updated_at": null,
  "label": "THINK"
}
```

### 2.8 Memory Twin (`memory.json`)

```json
{
  "schema": "lifere_memory_twin_v1",
  "capsule_refs": [],
  "episodic_summaries": [],
  "updated_at": null
}
```

### 2.9 Permission Twin (`permission.json`)

Mirror of DB `lifere_permission_grants` for file fallback. Schema matches `config/lifere-action-types.json`.

---

## 3. MODULE TWIN KEYS (optional, under `modules/`)

| File | module_key |
|------|------------|
| `modules/business.json` | business |
| `modules/marketing.json` | marketing |
| `modules/client.json` | client |
| `modules/lead.json` | lead |
| `modules/buyer.json` | buyer |
| `modules/seller.json` | seller |
| `modules/listing.json` | listing |
| `modules/transaction.json` | transaction |
| `modules/market.json` | market |
| `modules/content.json` | content |
| `modules/recruiting.json` | recruiting |
| `modules/finance.json` | finance |
| `modules/motivation.json` | motivation |

**Agent Twin (RE):** Not a file — runtime composition of Personal + Personality + Communication + Business + Performance.

---

## 4. FOUNDER EXTENSION SCHEMAS (founder_extension only)

### 4.1 Adam Twin (`data/twins/founder/adam/adam.json`)

```json
{
  "schema": "lifere_adam_twin_v1",
  "owner": "adam",
  "goals": [],
  "motivations": [],
  "demotivators": [],
  "fears": [],
  "strengths": [],
  "weaknesses": [],
  "decision_patterns": [],
  "blind_spots": [],
  "energy_cycles": { "peak": [], "crash_triggers": [] },
  "opportunity_cost_notes": [],
  "time_allocation_historical": {},
  "builderos_telemetry_consent": false,
  "sherry_relationship_ref": "adam_sherry_marriage",
  "updated_at": null,
  "label": "THINK"
}
```

### 4.2 Sherry Twin (`data/twins/founder/sherry/sherry.json`)

```json
{
  "schema": "lifere_sherry_twin_v1",
  "owner": "sherry",
  "wisdom_signals_consent": false,
  "household_goals": [],
  "communication_prefs": {},
  "private_wall": true,
  "updated_at": null
}
```

**DECISION MADE:** No broker/agent reads Sherry private fields. Consent gate on `wisdom_signals_consent`.

### 4.3 Marriage Twin (`data/twins/founder/household/marriage.json`)

```json
{
  "schema": "lifere_marriage_twin_v1",
  "edge_id": "adam_sherry_marriage",
  "parties": ["adam", "sherry"],
  "shared_goals": [],
  "conflict_calibration": [],
  "tradeoff_rules": [],
  "updated_at": null
}
```

### 4.4 Family Twin (`family.json`)

```json
{
  "schema": "lifere_family_twin_v1",
  "children_goals": [],
  "family_events": [],
  "calendar_protection_rules": [],
  "updated_at": null
}
```

### 4.5 Household Twin (`household.json`)

```json
{
  "schema": "lifere_household_twin_v1",
  "shared_calendar_blocks": [],
  "shared_finance_view_ref": null,
  "weekly_plan": {},
  "updated_at": null
}
```

### 4.6 Founder Governance Twin (`governance/founder.json`)

```json
{
  "schema": "lifere_founder_governance_twin_v1",
  "bp_priority_ref": "builderos-reboot/BP_PRIORITY.json",
  "point_b_missions": [],
  "receipt_index_ref": "products/receipts/",
  "no_personal_secrets": true,
  "updated_at": null
}
```

---

## 5. RELATIONSHIP TWIN (`relationships/{edge_id}.json`)

```json
{
  "schema": "lifere_relationship_twin_v1",
  "edge_id": "",
  "type": "marriage|client|team|broker|coach|recruit",
  "parties": [],
  "trust_level": 0.0,
  "communication_style": "",
  "friction_points": [],
  "motivations": [],
  "history_summary_ref": "",
  "updated_at": null
}
```

---

## 6. ENGINES (services + APIs)

### 6.1 Scenario Twin + Opportunity Cost Engine

**Service:** `services/lifere-scenario-engine.js`

Exports:
- `projectFuturePath({ userId, horizonDays }) → FutureTwin update`
- `compareScenarios({ userId, paths[], goalWeights }) → ranked paths`
- `computeOpportunityCost({ baselinePath, altPath, goalWeights }) → notes[]`

**Route:** `POST /api/v1/lifere/scenario/compare`

```json
{
  "user_id": "adam",
  "horizon_days": 90,
  "paths": [
    { "id": "builderos_20h", "allocations": { "builderos_hours": 20, "prospecting_hours": 0, "family_hours": 0 } },
    { "id": "prospect_20h", "allocations": { "builderos_hours": 0, "prospecting_hours": 20, "family_hours": 0 } },
    { "id": "mixed", "allocations": { "builderos_hours": 10, "prospecting_hours": 10, "family_hours": 5 } }
  ],
  "goal_weights": { "income": 0.4, "family": 0.35, "freedom": 0.25 }
}
```

Response: `{ ok, paths[], ranked_by_goal, opportunity_cost_notes[], label }`

**Chair questions (must answer via API):**
- What happens if current behavior continues?
- What happens if priorities shift?
- What path most likely reaches $30k/month?
- What path most likely reaches family goals?
- What path most likely reaches long-term freedom?

### 6.2 Learning Engine trio

**Services:**
- `services/lifere-experiment-engine.js` — A/B hooks, scripts, follow-ups
- `services/lifere-best-practice-engine.js` — promote winners to playbooks
- `services/lifere-strategy-evolution-engine.js` — update recommendation weights

**Table:** `lifere_experiments` (see W6 migration)

**Rule:** Learning updates weights only — never auto-executes outbound without Autonomy check.

**Inputs:** content performance, sales performance, recruiting performance, coaching performance, conversion performance.

---

## 7. LUMIN COUNCIL

**Config (locked):** `config/lifere-council-roles.json`

**Service:** `services/lifere-council-router.js`

```js
export function selectCouncilRoles({ intent, twins, costSensitive }) {
  // load config/lifere-council-roles.json intent_regex_map
}
export async function runCouncilDeliberation({ roles, context, userId }) {
  // returns { chair_answer, role_outputs[], receipt_path }
}
```

**Dispute order:** Sentry → CFO → Advocate → Chair → Adam

**Model router:** `services/lifere-model-router.js` — cheap model first (CFO ladder).

---

## 8. AUTONOMY LADDER

**Config (locked):** `config/lifere-action-types.json`

**Service:** `services/lifere-permission-twin.js`

```js
export function getAutonomyLevel({ tenantId, userId, actionType }) → 0|1|2|3|4|5
export function assertCanExecute({ level, actionType, draft }) → { allowed, reason }
```

| Level | Behavior |
|-------|----------|
| 0 | Suggest only |
| 1 | Draft |
| 2 | Draft + queue |
| 3 | Execute approved patterns (template hash match) |
| 4 | Execute bounded actions (caps in bounds JSON) |
| 5 | Full autonomy in defined domain |

**DECISION MADE:** Default outbound = **1**. Adam founder overrides in config file.

---

## 9. LIFEOS INTEGRATION

**Service:** `services/lifere-lifeos-crosscheck.js`

Before ranking business action #1:

1. Load Goal Twin weights
2. Load LifeOS calendar + health + family signals (consent)
3. Load Marriage Twin tradeoff rules if founder household
4. If conflict → return `{ recommendation, tradeoff_prose, life_optimal_alternate }`

**LifeOS inputs (read-only):** commitments, calendar blocks, health check-ins, family goals, finance mirror.

**Route:** `GET /api/v1/lifere/lifeos/crosscheck?user_id=`

---

## 10. DATABASE MIGRATIONS (exact)

### 10.1 W1 — `db/migrations/20260613_lifere_twin_framework.sql`

```sql
CREATE TABLE IF NOT EXISTS lifere_activity_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  conversations INT NOT NULL DEFAULT 0,
  calls INT NOT NULL DEFAULT 0,
  texts INT NOT NULL DEFAULT 0,
  emails INT NOT NULL DEFAULT 0,
  appointments_set INT NOT NULL DEFAULT 0,
  appointments_held INT NOT NULL DEFAULT 0,
  buyer_consults INT NOT NULL DEFAULT 0,
  listing_appointments INT NOT NULL DEFAULT 0,
  signed_clients INT NOT NULL DEFAULT 0,
  signed_listings INT NOT NULL DEFAULT 0,
  offers_written INT NOT NULL DEFAULT 0,
  contracts INT NOT NULL DEFAULT 0,
  closings INT NOT NULL DEFAULT 0,
  commission_gci NUMERIC(12,2) NOT NULL DEFAULT 0,
  skill_practice_minutes INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS lifere_performance_snapshot (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  funnel JSONB NOT NULL,
  conversion_rates JSONB NOT NULL,
  bottleneck_stage TEXT NOT NULL,
  income_goal_monthly NUMERIC(12,2) NOT NULL DEFAULT 30000,
  activities_to_goal JSONB NOT NULL,
  next_hour_recommendation JSONB NOT NULL,
  label TEXT NOT NULL DEFAULT 'THINK'
);

CREATE TABLE IF NOT EXISTS lifere_permission_grants (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  autonomy_level SMALLINT NOT NULL CHECK (autonomy_level BETWEEN 0 AND 5),
  bounds JSONB NOT NULL DEFAULT '{}',
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, action_type)
);

INSERT INTO lifere_permission_grants (user_id, action_type, autonomy_level, bounds, granted_by)
VALUES
  ('adam', 'boldtrail_note', 2, '{"max_per_day": 50}', 'system_default'),
  ('adam', 'sms_client', 1, '{}', 'system_default'),
  ('adam', 'email_lead', 1, '{}', 'system_default'),
  ('adam', 'post_social', 1, '{}', 'system_default')
ON CONFLICT DO NOTHING;
```

### 10.2 W2 — `db/migrations/20260620_lifere_permissions_comms.sql`

```sql
CREATE TABLE IF NOT EXISTS lifere_approval_queue (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  draft_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  autonomy_level_required SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS lifere_client_comms_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  client_ref TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email')),
  template_id TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  approval_queue_id BIGINT REFERENCES lifere_approval_queue(id)
);

CREATE TABLE IF NOT EXISTS lifere_twin_pg_mirror (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  twin_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, twin_key)
);
```

### 10.3 W3 — `db/migrations/20260627_lifere_skill_coaching.sql`

```sql
CREATE TABLE IF NOT EXISTS lifere_skill_drill_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  score NUMERIC(5,2),
  duration_minutes INT NOT NULL,
  debrief TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_voice_calibration (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 10.4 W4 — `db/migrations/20260704_lifere_marketing.sql`

```sql
CREATE TABLE IF NOT EXISTS lifere_content_calendar (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  video_type_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned',
  script_ref TEXT,
  hook_ref TEXT,
  channels JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS lifere_hook_library (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  niche TEXT,
  performance_score NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  funnel_id TEXT NOT NULL,
  step TEXT NOT NULL,
  lead_ref TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_ad_spend (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  spend_usd NUMERIC(12,2) NOT NULL,
  leads_count INT NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);
```

### 10.5 W5 — `db/migrations/20260711_lifere_ops.sql`

```sql
CREATE TABLE IF NOT EXISTS lifere_recruiting_pipeline (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_opportunity_signals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  address_or_mls TEXT,
  score NUMERIC(8,4),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_finance_forecast (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  forecast_month DATE NOT NULL,
  projected_gci NUMERIC(12,2) NOT NULL,
  pipeline_weighted NUMERIC(12,2) NOT NULL,
  runway_months NUMERIC(6,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 10.6 W6 — `db/migrations/20260718_lifere_engines.sql`

```sql
CREATE TABLE IF NOT EXISTS lifere_scenarios (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_experiments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  metric TEXT NOT NULL,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lifere_relationship_edges (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  edge_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 11. SERVICES (complete file list)

| File | Wave | Exports (minimum) |
|------|------|-------------------|
| `services/lifere-twin-store.js` | W1 | readTwin, writeTwin, listModuleTwins |
| `services/lifere-performance-twin.js` | W1 | recordActivity, computeFunnel, findBottleneck, activitiesToGoal, skillDeltaImpact, recommendNextHour, buildSnapshot |
| `services/lifere-permission-twin.js` | W2 | getAutonomyLevel, assertCanExecute, seedDefaults |
| `services/lifere-client-comms.js` | W2 | renderTemplate, queueDraft, templates registry |
| `services/lifere-boldtrail-bridge.js` | W1+ | existing + syncNotes |
| `services/lifere-follow-up-os.js` | W2 | prioritizeQueue, draftMessage |
| `services/lifere-personality-calibration.js` | W3 | recordDraftRating, updateCommunicationTwin |
| `services/lifere-skill-coaching.js` | W3 | runDrill, scoreDrill, linkToPerformance |
| `services/lifere-marketing-module.js` | W4 | researchHooks, generateScript, planCalendar |
| `services/lifere-funnel-ingress.js` | W4 | handleClickFunnelsWebhook |
| `services/lifere-social-engagement.js` | W4 | suggestCommentReply, queueDmReply |
| `services/lifere-youtube-research.js` | W4 | analyzeChannel, suggestTopics |
| `services/lifere-transaction-surface.js` | W5 | wrap Am17 status for LifeRE UI |
| `services/lifere-recruiting-os.js` | W5 | pipeline CRUD, agenda drafts |
| `services/lifere-finance-runway.js` | W5 | forecastGci, runwayMonths |
| `services/lifere-opportunity-os.js` | W5 | scanSignals, rankOpportunities |
| `services/lifere-receptionist-bridge.js` | W5 | inboundSummary, handoffToLeadTwin |
| `services/lifere-outreach-bridge.js` | W5 | wrap Am08 sequences |
| `services/lifere-scenario-engine.js` | W6 | projectFuturePath, compareScenarios, computeOpportunityCost |
| `services/lifere-experiment-engine.js` | W6 | startExperiment, recordResult |
| `services/lifere-best-practice-engine.js` | W6 | promoteWinner |
| `services/lifere-strategy-evolution-engine.js` | W6 | updateWeights |
| `services/lifere-relationship-twin.js` | W6 | readEdge, writeEdge, listEdgesForUser |
| `services/lifere-founder-extensions.js` | W6 | loadFounderTwin, assertFounderAccess |
| `services/lifere-council-router.js` | W6 | selectCouncilRoles, runCouncilDeliberation |
| `services/lifere-model-router.js` | W6 | pickModel |
| `services/lifere-lifeos-crosscheck.js` | W2+ | crosscheckBeforeRecommend |

Extend existing `services/lifere-os-v1.js` only where wave spec says — do not duplicate.

---

## 12. ROUTES (complete table — mount `/api/v1/lifere`)

All routes use `requireKey` unless noted.

### 12.1 Existing (keep)

| Method | Path | Module |
|--------|------|--------|
| GET | `/health` | core |
| GET | `/boldtrail/status` | 2 |
| GET | `/boldtrail/pipeline` | 2 |
| POST | `/daily-command-center` | 1 |
| GET/POST | `/top-3` | 1 |
| POST | `/nightly-debrief` | 1 |
| POST | `/education/context` | 24 |
| POST | `/sales/coach` | 24 |
| POST | `/social/lite` | 8 |
| POST | `/follow-up/lite` | 3 |
| POST | `/follow-up/approve` | 3 |
| POST | `/tc/extract-lite` | 7 |
| POST | `/compliance/guardrails` | 38 |
| POST | `/recruiting/lite` | 25 |
| POST | `/finance/lite` | 29 |
| POST | `/accountability` | 22 |

### 12.2 W1 (new)

| Method | Path | Body/Query |
|--------|------|------------|
| POST | `/activity/log` | `{ user_id, date?, counts{} }` |
| GET | `/performance/snapshot` | `user_id`, `window_days?` |
| GET | `/performance/bottleneck` | `user_id` |
| GET | `/performance/next-hour` | `user_id` |
| GET | `/performance/goal-math` | `user_id`, `goal_gci?` |
| POST | `/performance/skill-delta` | `{ baseline_rate, improved_rate, goal_gci? }` |
| GET | `/twins/:twin_key` | `user_id` |
| PUT | `/twins/:twin_key` | `{ user_id, payload, receipt_meta }` |

### 12.3 W2 (new)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/permissions/:action_type` | current autonomy level |
| POST | `/approval-queue` | enqueue draft |
| GET | `/approval-queue` | list pending |
| POST | `/approval-queue/:id/resolve` | approve/reject |
| POST | `/client-comms/draft` | `{ template_id, client_ref, channel }` |
| POST | `/client-comms/send` | requires approved queue id |
| GET | `/lifeos/crosscheck` | life-optimal check |

**Templates (locked IDs):** `status_update`, `showing_feedback`, `missing_doc`, `milestone`, `weekly_seller_report`

### 12.4 W3 (new)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/personality/calibrate` | `{ draft_text, rating 1-5, feedback? }` |
| GET | `/coaching/modules` | returns config/lifere-coaching-modules.json |
| POST | `/coaching/drill/start` | `{ module_id }` |
| POST | `/coaching/drill/complete` | `{ module_id, score, debrief }` |
| GET | `/coaching/skill-impact` | links drill to performance delta |

### 12.5 W4 (new)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/marketing/video-types` | config/lifere-video-types.json |
| POST | `/marketing/research/hooks` | `{ niche, market, count }` |
| POST | `/marketing/research/youtube` | `{ channel_url?, query? }` — 501 without API key |
| POST | `/marketing/script/generate` | `{ video_type_id, hook_id? }` |
| POST | `/marketing/calendar/plan` | `{ weeks, channels[] }` |
| GET | `/marketing/calendar` | list rows |
| POST | `/marketing/social/suggest-reply` | `{ platform, context }` |
| POST | `/marketing/funnel/webhook` | ClickFunnels ingress — 501 without secret |
| GET | `/marketing/ads/roi` | `user_id`, `period` |

### 12.6 W5 (new)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/buyer/:client_ref` | Buyer OS projection |
| GET | `/seller/:listing_ref` | Seller OS projection |
| GET | `/transaction/:deal_id` | TC surface from Am17 |
| GET | `/recruiting/pipeline` | list |
| POST | `/recruiting/pipeline` | upsert candidate |
| GET | `/finance/forecast` | runway + GCI |
| GET | `/opportunity/signals` | ranked list |
| POST | `/receptionist/summary` | bridge Am29 |
| POST | `/outreach/enqueue` | bridge Am08 |

### 12.7 W6 (new)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/scenario/compare` | scenario engine |
| GET | `/scenario/future` | current path projection |
| POST | `/experiments/start` | experiment engine |
| POST | `/experiments/:id/result` | record result |
| GET | `/relationships` | list edges for user |
| PUT | `/relationships/:edge_id` | upsert edge |
| GET | `/founder/adam` | founder only |
| GET | `/founder/sherry` | sherry or adam household |
| POST | `/council/deliberate` | `{ intent, message }` |

---

## 13. UI SURFACES (`public/overlay/lifeos-lifere.html`)

| Section ID | Module | Wave | Data source |
|------------|--------|------|-------------|
| `#lifere-command-header` | 1 | exists | daily-command-center |
| `#lifere-boldtrail-strip` | 2 | exists | boldtrail/pipeline |
| `#lifere-top3` | 1 | exists | top-3 |
| `#lifere-performance-panel` | 23 | W1 | performance/* |
| `#perf-bottleneck` | 23 | W1 | data-lifere-perf="bottleneck" |
| `#perf-next-hour` | 23 | W1 | data-lifere-perf="next-hour" |
| `#perf-goal-math` | 23 | W1 | goal-math |
| `#activity-form` | 23 | W1 | activity/log |
| `#lifere-approval-queue` | 38 | W2 | approval-queue |
| `#lifere-client-comms` | 4 | W2 | client-comms |
| `#lifere-follow-up-queue` | 3 | W2 | follow-up/lite |
| `#lifere-personality-calibration` | 21 | W3 | personality/calibrate |
| `#lifere-coaching-panel` | 24 | W3 | coaching/* |
| `#lifere-marketing-panel` | 8–20 | W4 | marketing/* |
| `#lifere-content-calendar` | 19 | W4 | marketing/calendar |
| `#lifere-buyer-panel` | 5 | W5 | buyer/* |
| `#lifere-seller-panel` | 6 | W5 | seller/* |
| `#lifere-transaction-panel` | 7 | W5 | transaction/* |
| `#lifere-recruiting-panel` | 25 | W5 | recruiting/* |
| `#lifere-finance-panel` | 29 | W5 | finance/* |
| `#lifere-opportunity-panel` | 30 | W5 | opportunity/* |
| `#lifere-scenario-panel` | Future | W6 | scenario/* |
| `#lifere-lifeos-tradeoff` | 40 | W2+ | lifeos/crosscheck |
| `#lifere-council-trace` | 37 | W6 | council/deliberate (debug) |

---

## 14. MODULE SPECS 1–40 (locked)

Each row: **Feature map ID** → implementation anchor.

| ID | Name | Service | Route prefix | Twin(s) | Autonomy | Wave |
|----|------|---------|--------------|---------|----------|------|
| 1 | Daily Command Center | lifere-os-v1 + performance | `/daily-command-center`, `/top-3` | Performance, Future | 0 | W1 |
| 2 | BoldTrail CRM Intel | lifere-boldtrail-bridge | `/boldtrail/*` | Lead, Business | 1–2 | W1 |
| 3 | Lead Follow-Up OS | lifere-follow-up-os | `/follow-up/*` | Lead, Communication | 2 | W2 |
| 4 | Client Communication OS | lifere-client-comms | `/client-comms/*` | Client, Relationship | 2 | W2 |
| 5 | Buyer OS | lifere-os-v1 + buyer panel | `/buyer/*` | Buyer, Client | 1 | W5 |
| 6 | Seller / Listing OS | lifere-os-v1 + seller panel | `/seller/*` | Seller, Listing, Market | 1 | W5 |
| 7 | Transaction / TC OS | lifere-transaction-surface | `/transaction/*`, `/tc/*` | Transaction | 2 | W5 |
| 8 | MarketingModule | lifere-marketing-module | `/marketing/*` | Marketing, Content | 1–2 | W4 |
| 9 | ClickFunnels | lifere-funnel-ingress | `/marketing/funnel/webhook` | Lead, Marketing | 1 | W4 |
| 10 | Facebook group | lifere-marketing-module | `/marketing/calendar` | Marketing | 2 | W4 |
| 11 | Comment / DM | lifere-social-engagement | `/marketing/social/*` | Communication | 2 | W4 |
| 12 | YouTube strategy | lifere-youtube-research | `/marketing/research/youtube` | Content | 0 | W4 |
| 13 | Video topic research | lifere-youtube-research | `/marketing/research/*` | Content, Market | 0 | W4 |
| 14 | Hook research | lifere-marketing-module | `/marketing/research/hooks` | Content | 0 | W4 |
| 15 | Script creation | lifere-marketing-module | `/marketing/script/*` | Communication, Content | 1 | W4 |
| 16 | Recording coaching | lifere-skill-coaching | `/coaching/*` | Skill, Communication | 0 | W3 |
| 17 | B-roll direction | lifere-marketing-module | script metadata `b_roll_beats[]` | Content | 0 | W4 |
| 18 | Thumbnail / title / SEO | lifere-marketing-module | script response fields | Marketing | 1 | W4 |
| 19 | Posting calendar | lifere-marketing-module | `/marketing/calendar/*` | Content | 2 | W4 |
| 20 | Ad spend / ROI | lifere-marketing-module | `/marketing/ads/roi` | Marketing, Performance | 0 | W4 |
| 21 | Agent personality | lifere-personality-calibration | `/personality/*` | Personality, Communication | learns | W3 |
| 22 | Motivation / rewards | lifere-os-v1 accountability | `/accountability` | Motivation, Goal | 0 | W3 |
| 23 | Performance math | lifere-performance-twin | `/performance/*` | Performance | n/a | W1 |
| 24 | Skill practice / coaching | lifere-skill-coaching | `/coaching/*`, `/education/*` | Skill | 0 | W3 |
| 25 | Recruiting OS | lifere-recruiting-os | `/recruiting/*` | Recruiting | 2 | W5 |
| 26 | Onboarding / training | lifere-skill-coaching + Am15 | `/coaching/modules` | Skill | 1 | W5 |
| 27 | AI Receptionist | lifere-receptionist-bridge | `/receptionist/*` | Lead | 3 | W5 |
| 28 | Outreach OS | lifere-outreach-bridge | `/outreach/*` | Lead, Marketing | 2 | W5 |
| 29 | Finance / runway | lifere-finance-runway | `/finance/*` | Finance | 0 | W5 |
| 30 | Opportunity OS | lifere-opportunity-os | `/opportunity/*` | Market, Lead | 0 | W5 |
| 31 | Market intelligence | lifere-opportunity-os | `/opportunity/signals` | Market | 0 | W5 |
| 32–36 | Core twins | lifere-twin-store | `/twins/*` | all | per Permission | W1+ |
| 37 | Lumin Chair | lifere-council-router + chair services | `/council/*` | all scoped | orchestrate | W6 |
| 38 | Approval gates | lifere-permission-twin | `/permissions/*`, `/approval-queue/*` | Permission | n/a | W2 |
| 39 | Receipts | existing FP V2 | products/receipts/ | n/a | n/a | W1+ |
| 40 | LifeOS integration | lifere-lifeos-crosscheck | `/lifeos/crosscheck` | Goal, Marriage | n/a | W2 |

---

## 15. PERFORMANCE TWIN (locked math)

**Funnel order:**

`conversations → calls → texts → emails → appointments_set → appointments_held → buyer_consults | listing_appointments → signed_clients | signed_listings → offers_written → contracts → closings → commission_gci`

**Defaults:**
- `income_goal_monthly`: 30000
- `avg_commission_per_closing`: 8500 (ASSUMPTION — overridable via API)
- `window_days`: 30
- **Bottleneck:** lowest conversion among stages with volume ≥ 5

**skillDeltaImpact example:** objection 8% → 12% on appointments_set → compute conversations_saved for same GCI goal.

---

## 16. MARKETING MODULE (locked)

**Video types:** `config/lifere-video-types.json` — exactly 30 entries.

**Coaching modules:** `config/lifere-coaching-modules.json` — exactly 24 entries.

**Research outputs must include:** hook_text, retention_pattern_notes, thumbnail_notes, title_variants[], script_outline, b_roll_beats[], conversational_prompts[], label (KNOW|THINK|GUESS).

---

## 17. WAVE ACCEPTANCE (exact test IDs)

### W1 — `npm run lifeos:lifere-w1-acceptance`

LRE-W1-T01 migration exists · T02 performance exports · T03 routes · T04 HTML markers · T05 unit bottleneck · T06 @ssot AMENDMENT_LIFERE

### W2 — `npm run lifeos:lifere-w2-acceptance`

LRE-W2-T01 approval_queue table · T02 getAutonomyLevel default 1 · T03 templates 5 ids · T04 UI #lifere-approval-queue · T05 crosscheck returns tradeoff when family conflict fixture

### W3 — `npm run lifeos:lifere-w3-acceptance`

LRE-W3-T01 24 coaching modules loaded · T02 calibration updates communication twin · T03 drill log row · T04 skill-impact endpoint

### W4 — `npm run lifeos:lifere-w4-acceptance`

LRE-W4-T01 30 video types · T02 hook research returns ranked array · T03 calendar CRUD · T04 funnel webhook 501 without secret · T05 script generate includes b_roll_beats

### W5 — `npm run lifeos:lifere-w5-acceptance`

LRE-W5-T01 transaction surface wraps Am17 · T02 recruiting pipeline CRUD · T03 finance forecast row · T04 opportunity signals ranked · T05 receptionist bridge stub

### W6 — `npm run lifeos:lifere-w6-acceptance`

LRE-W6-T01 scenario compare 3 paths ranked · T02 founder twin 403 for non-founder · T03 relationship edge CRUD · T04 experiment start/result · T05 council router selects Marketing_Director for content intent · T06 learning does not execute outbound without permission check

**Receipt paths:** `products/receipts/LIFERE_W{n}_ACCEPTANCE.json`

---

## 18. BUILD SEQUENCE (coder)

1. W1 migration + twin-store + performance + UI panel + W1 acceptance PASS
2. W2 permissions + approval queue + client comms + lifeos crosscheck + W2 PASS
3. W3 personality + coaching + W3 PASS
4. W4 marketing module full + W4 PASS
5. W5 TC/recruiting/finance/opportunity/receptionist/outreach + W5 PASS
6. W6 founder/scenario/learning/council + W6 PASS
7. Update AMENDMENT_LIFERE Change Receipt after each wave

**Do not skip waves.** **Do not reduce end-state scope.**

---

## 19. ASSUMPTIONS (labeled)

| ID | Assumption | Confidence |
|----|------------|------------|
| A-01 | File twins + PG mirror | THINK |
| A-02 | $30k/mo default goal | KNOW |
| A-03 | $8500 avg commission | GUESS |
| A-04 | 30-day funnel window | THINK |
| A-05 | user_id `adam` until auth unify | KNOW |
| A-06 | ClickFunnels 501 until secret | DON'T KNOW |
| A-07 | YouTube manual CSV fallback W4 | THINK |
| A-08 | Am41 shares hook schema W4 | THINK |

---

## 20. TRUE BLOCKERS (credential only)

- ClickFunnels webhook secret → stub 501
- YouTube Data API key → manual CSV fallback
- BoldTrail live token scope → probe route exists
- Sherry LifeOS account provisioning → separate login

These do **not** block blueprint completeness or W1–W3 build.

---

## 21. CHAIR QUESTIONS (API must answer)

- What should Adam do next?
- What gets closest to $30k/month?
- What is the bottleneck?
- How many conversations are needed?
- What conversion rate is weak?
- What skill practice improves numbers fastest?
- What content should be made next?
- Which leads need attention?
- Which clients need communication?
- What busywork should Lumin handle?
- What happens if current behavior continues?
- What path reaches family goals vs income vs freedom?

Mapped to: `/performance/*`, `/top-3`, `/follow-up/lite`, `/marketing/calendar`, `/scenario/*`, `/lifeos/crosscheck`, `/council/deliberate`.
