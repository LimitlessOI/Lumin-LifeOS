# Pre-Build Readiness Checklist
**Every amendment MUST complete this checklist before `build_ready` is set to TRUE.**
**The builder supervisor will not touch a project that has not passed this gate.**

---

## How to Use This

1. Copy the checklist section below into your amendment file under `## Pre-Build Readiness`
2. Fill each section honestly
3. When all checkboxes are ticked → call `POST /api/v1/projects/:slug/readiness/mark-ready`
4. The builder will automatically pick up your `stability_class = 'safe'` segments

---

## The Five Gates

### Gate 1 — Feature is brainstormed to implementation detail
The idea is not "add a CRM." It is "add a contact table with these columns, synced from these sources, surfaced via these endpoints, with this UI." You can hand it to an AI agent with no further questions.

**Checklist:**
- [ ] Every build-plan segment has a title + description specific enough for a headless AI to implement
- [ ] All required DB schema changes are documented or migrated
- [ ] API surface (endpoints, request/response shapes) is defined
- [ ] No segment says "figure out how" — they say "do this exact thing"

---

### Gate 2 — Competitor landscape is documented
You know who is doing something similar, what they do well, what they do poorly, and what their roadmap signals about where the space is going.

**Checklist:**
- [ ] At least 3 competitors (or analogous products) are identified and documented
- [ ] For each: strengths, weaknesses, pricing, target customer
- [ ] We know what features they are shipping next (public roadmaps, job postings, release notes)
- [ ] We know which of their features are genuinely better than ours right now

**Competitor table** (fill in amendment):
| Competitor | Strengths | Weaknesses | Their edge | Our edge |
|---|---|---|---|---|
| | | | | |

---

### Gate 3 — Future product risks are identified
The market moves. What does our feature look like in 18 months if a well-funded competitor goes all-in? What does it look like if AI capabilities jump another generation?

**Checklist:**
- [ ] "Nightmare scenario" is written out: what would kill this feature/project?
- [ ] We have identified the 1-2 things that would make our implementation obsolete
- [ ] We have a stated position on each risk: Accept / Mitigate / Monitor

**Risk table** (fill in amendment):
| Risk | Probability | Impact | Our position |
|---|---|---|---|
| | | | |

---

### Gate 4 — Adaptability strategy is defined
When a competitor ships a great idea we didn't think of, can we absorb it? Or would we have to rewrite? This gate forces us to build extensibly from day one.

**Checklist:**
- [ ] The system is designed so new AI models can be swapped in without rewrites (model-agnostic)
- [ ] Core business logic is in services, not hardcoded in routes or server.js
- [ ] Extension points are identified: where would a plugin or new feature attach?
- [ ] Adaptability score is set (0–100 in DB): how easily can we absorb a competitor's great idea?
- [ ] "If [Competitor] ships X, here's how we add it" is written for at least one scenario

**Adaptability score guide:**
- 90–100: New idea plugs in via config or a new service file. Zero existing code changes.
- 70–89: New idea requires a new service + one route file. No core files touched.
- 50–69: New idea requires touching 2–3 existing files + one migration.
- 30–49: New idea requires significant refactor of core logic.
- 0–29: New idea would require a rewrite. Architecture needs rethinking.

---

### Gate 5 — "How we beat them" is documented
Features without a differentiation strategy are commodities. This gate forces us to articulate not just what we build, but why ours is meaningfully better.

**Checklist:**
- [ ] Our unique advantage is written in one sentence
- [ ] We have identified at least one competitor feature we can do better and how
- [ ] The improvement is concrete and buildable, not vague ("we'll be faster")
- [ ] The "better version" is reflected in the build plan

**Example:** "Competitor X emails deadline reminders at 9am regardless of context. We send them at the moment a relevant document is opened, with the specific clause that's at risk — 10x more actionable."

---

## Marking Ready

When all 5 gates are complete, update the amendment file header:

```
Status: BUILD_READY
Build Ready Date: YYYY-MM-DD
Adaptability Score: XX/100
```

Then call the API:
```
POST /api/v1/projects/:slug/readiness/mark-ready
{
  "adaptability_score": 85,
  "notes": "Gates 1-5 complete. Competitor table in amendment section 4.",
  "competitor_analysis": [
    { "name": "Competitor X", "strengths": "...", "weaknesses": "...", "our_edge": "..." }
  ]
}
```

The builder supervisor will pick up your safe segments on the next run.

---

## Why This Exists

The builder runs while you sleep. An agent executing a half-baked idea costs real tokens, creates real PRs, and requires real review time to undo. This checklist ensures that every build cycle produces work that:

1. Is specific enough for a headless AI to implement correctly
2. Won't be thrown away because a competitor already solved it better
3. Is built to adapt when the landscape shifts
4. Has a clear reason to exist that goes beyond "it seemed like a good idea"

**The builder is fast. Your thinking is the bottleneck. This checklist makes your thinking durable.**
