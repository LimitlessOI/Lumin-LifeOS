<!-- SYNOPSIS: Role-Based Council Routing — Build Spec (BPB input) -->

# Role-Based Council Routing — Build Spec (BPB input)

**Mission:** FACTORY-REBOOT-0031  
**Audience:** BPB → step-atomic BLUEPRINT.json  
**Law:** `prompts/00-PROVIDER-STRATEGY-LOCK.md`

---

## Architectural shift

```text
FROM:  task_type  → TASK_MODEL_MAP[task] → filter → call
TO:    department → DEPARTMENT_TARGETS[dept] → task refinement → filter → call
```

Departments: `AIC` | `BPB` | `Coder` | `SENTRY` | `Product` (LifeOS features, optional passthrough)

---

## Deliverables (implementation)

### D1 — Canon config

**File:** `config/department-provider-targets.js`

Export:

- `DEPARTMENTS` — enum
- `DEPARTMENT_PROVIDER_TARGETS` — primary, secondary, blocked arrays (member keys from `council-members.js`)
- `resolveDepartment({ routingKey, mode, targetFile, explicitDepartment })`

Default mapping from today's builder modes:

| Input | Department |
|-------|------------|
| `council.gate_change.debate`, multi-model council | AIC |
| `council.builder.plan`, blueprint tasks | BPB |
| `council.builder.code`, `code_execute` | Coder |
| `council.builder.review`, `code_review` | SENTRY |
| `lifeos.*` | Product (existing TASK_MODEL_MAP until product missions split) |

### D2 — Routing integration

**Files:**

- `config/task-model-routing.js` — add `council.aic.*`, `council.bpb.*`, `council.coder.*`, `council.sentry.*` keys OR delegate to department resolver
- `services/builderos-routing-policy.js` — accept `department`; align `allowedModels` with strategy lock
- `routes/lifeos-council-builder-routes.js` — accept optional `department` body field; log department + selected model to TSOS shadow routing

### D3 — API surface

**Extend:** `GET /api/v1/lifeos/builder/model-map`

Response must include:

```json
{
  "departments": {
    "AIC": { "primary": [], "secondary": [], "blocked": [] },
    "BPB": {},
    "Coder": {},
    "SENTRY": {}
  },
  "strategy_lock": "prompts/00-PROVIDER-STRATEGY-LOCK.md",
  "audit": "docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md"
}
```

### D4 — Downgrade control

**File:** `services/council-service.js`

When `options.department` is `AIC` or `SENTRY`, set `allowModelDowngrade: false` unless policy explicitly allows.

### D5 — Acceptance tests

| ID | Test |
|----|------|
| AT-0031-1 | `resolveDepartment({ mode: 'plan' })` → BPB |
| AT-0031-2 | `resolveDepartment({ mode: 'code_execute' })` → Coder |
| AT-0031-3 | Coder allowed pool includes `deepseek` when key present |
| AT-0031-4 | AIC allowed pool excludes `groq_llama` as primary |
| AT-0031-5 | `/builder/model-map` returns `departments` object |
| AT-0031-6 | Audit doc addendum: "post-0031 behavior" with date |

### D6 — Docs receipt

Update `docs/architecture/COUNCIL_ROUTING_AUDIT_V1.md` § Current routing behavior after merge.

---

## Suggested BLUEPRINT phases (for BPB)

| Phase | Steps |
|-------|-------|
| P1 | D1 canon config + unit tests |
| P2 | D2 routing integration |
| P3 | D3 model-map API |
| P4 | D4 downgrade control |
| P5 | D5 CI script `npm run council:routing:verify` |
| P6 | D6 audit refresh |

---

## Explicit non-goals

- New provider API key onboarding checklist
- Factory-staging council live wiring
- AIC multi-seat parallel debate (follow-on mission 0032+)

---

## Builder path

Prefer `POST /api/v1/lifeos/builder/build` with this spec as `spec` and domain `lifeos-council-builder` after preflight.

GAP-FILL only on documented builder failure.
