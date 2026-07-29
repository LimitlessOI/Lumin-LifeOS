<!-- SYNOPSIS: What a Digital Twin is — universal template (Adam is the reference fill) -->

# Digital Twin Template

**Machine schema:** [`config/digital-twin-template-v1.json`](../../../../config/digital-twin-template-v1.json)  
**Reference fill (Adam):** [`data/twins/default/adam/`](../../../../data/twins/default/adam/)  
**Blank copy-me:** [`data/twins/_template/`](../../../../data/twins/_template/)  
**Assembly (cheap models):** [`TWIN_ASSEMBLY_PLAYBOOK.md`](TWIN_ASSEMBLY_PLAYBOOK.md)  
**Decision-identity deep spec:** [`docs/products/builderos/specs/FOUNDER_VIRTUAL_TWIN.md`](../../builderos/specs/FOUNDER_VIRTUAL_TWIN.md)  
**Doctrine:** [`docs/architecture/DIGITAL_TWIN_DOCTRINE.md`](../../../architecture/DIGITAL_TWIN_DOCTRINE.md)

**Status:** `ACTIVE TEMPLATE` — Adam's twin is the first filled instance. Every other person copies this shape.

---

## Plain English — what is a digital twin?

A **Digital Twin** is a living, structured model of **one person** so the system can help *them* — not a generic chatbot user.

It answers:

1. **Who are they?** (roles, constraints, energy)  
2. **What do they want — and why?** (goals + real emotional fuel)  
3. **How do they talk and want to be spoken to?**  
4. **How do they operate day-to-day?** (schedule, quotas, accountability)  
5. **How do they decide?** (values, vetoes, heuristics — *not* prediction until calibrated)  
6. **What may the system do without asking?** (permission ladder)  
7. **Where is the evidence?** (pointers to digests/capsules — not megabyte dumps in the twin)

It is **not**:

- A dump of every chat (chats are *intake*; the twin is the *compiled* model)  
- A mind-reader (no assumptive steering — mark UNKNOWN)  
- Permission to build/ship platform code (founders only, via governance)  
- A substitute for looking someone in the eye

**Cheap-model advantage:** A rich twin + small model beats a frontier model with amnesia. Fill the twin once; reuse it forever.

---

## File layout (every user)

```
data/twins/{tenant_id}/{user_id}/
  _meta.json                 # identity, sources, supervision status
  personal.json              # whole person
  personality.json           # character dials
  communication.json         # voice + framing
  goal.json                  # outcomes + weights
  operating_system.json      # day/week rhythm + A/B/C
  decision_identity.json     # six decision layers
  permission.json            # autonomy 0–5
  memory.json                # pointers only
  modules/{domain}.json      # optional (recruiting, gvbn, content, …)
```

Copy from `data/twins/_template/` → rename `{user_id}` → fill under supervision.

---

## Facet cheat sheet

| File | Job | Example (Adam) |
|------|-----|----------------|
| `_meta` | Provenance + review state | Sources = operator digests; status = review |
| `personal` | Whys, demotivators, busywork hates | Family eye-test; hates thumbnails/editing |
| `personality` | Warmth / directness / humor | Direct, warm, low theater |
| `communication` | Phrases, banned fluff, packet style | WHAT+PASS; step-by-step for money |
| `goal` | Numbers + horizons | $83K/mo, 185 lbs, #1 eXp recruiter |
| `operating_system` | Schedule, quotas, Frank loop | Viz → gym → expired/FSBO → recruit |
| `decision_identity` | Values / vetoes / heuristics | System-ship; no legacy overlays |
| `permission` | What AI may do alone | Env/redeploy OK; constitution = ask |
| `memory` | Digests + capsule refs | Compact digest path, not 968k paste |
| `modules/*` | Domain depth | GVBN, recruiting, content |

---

## Evidence rule (non-negotiable)

Every load-bearing field:

```json
{
  "value": "...",
  "evidence_level": "CLAIM|HYPOTHESIS|TESTED|RECEIPT|VERIFIED|FACT|INVARIANT",
  "source_ref": "path or batch id",
  "quote": "optional verbatim"
}
```

Or omit the field. **Silence beats fiction.**

---

## Founder vs member

| | Depth | Platform authority |
|--|-------|--------------------|
| **Adam (founder)** | Full facets + governance modules + decision compiler path | Yes — within North Star |
| **Any member** | Same facet files | No — help their life/business only |

Same **template**. Different **authority_scope** in `_meta`.

---

## Build order (this product)

| Phase | What | Status |
|-------|------|--------|
| **T0** | Template + blank `_template/` + Adam seed from digests | ✅ This ship |
| **T1** | Founder supervision pass (Adam corrects wrong fields) | 🔜 YOU |
| **T2** | Cheap-model assembly loop (playbook → propose diffs) | Playbook ready |
| **T3** | Decision Compiler → `decision_identity` patterns (factory, SO-001) | Spec exists |
| **T4** | Inject twin block into Chair / founder chat | After T1+T3 |
| **T5** | Prediction / “what would they do?” | Only after outcomes exist |

**Do not skip to T5.** Predicting before calibration is assumptive steering.

---

## Related twins (do not confuse)

| Name | What it is |
|------|------------|
| **This template** | Per-*person* life/decision model |
| **Founder Virtual Twin** | Decision-compiler deep spec (layers → patterns) |
| **BuilderOS `TWIN.md`** | Code/wiring twin of the *system*, not a human |
| **`adam_decisions` / profile** | Live ingest tables feeding the person twin |

---

## Change log

| Date | Change |
|------|--------|
| 2026-07-29 | Initial universal template. Adam reference fill from operator digests. |
