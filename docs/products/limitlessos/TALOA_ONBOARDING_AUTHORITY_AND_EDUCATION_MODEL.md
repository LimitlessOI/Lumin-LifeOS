<!-- SYNOPSIS: Founder vision — the onboarding/Authority Map/education funnel that makes LimitlessOS a demonstrated service instead of a sold product. -->

# Taloa Onboarding, Authority Map & Education Model

**Status:** founder-vision, not yet blueprint-ready. Captured verbatim-in-substance from a live founder strategy session, 2026-08-09.
**Parent:** [`limitlessos/PRODUCT_HOME.md`](PRODUCT_HOME.md) — this is the go-to-market and onboarding motion for the whole LimitlessOS business stack, not a single feature.

---

## The core reframe

Don't sell "Taloa AI" as a decision a company has to make on faith. **Onboard the company into Taloa while doing real, useful work for them.** They experience the system before they have to decide anything.

> "Let us run part of your business for you for 30 days. You'll see exactly what Taloa can do before you decide whether you want the system."

The onboarding *is* the demonstration. The company never has to say "we trust an AI with our company" — only "we trust Taloa with this specific thing, within these specific limits." Trust compounds through demonstrated competence, not a sales pitch.

---

## The six-phase onboarding (productized as "Taloa Business Launch")

1. **Discover** — Taloa interviews the owner/management: what generates revenue, what tasks consume time, what decisions repeat, what requires human judgment, what systems they already use, who has approval authority.
2. **Demonstrate** — identify one high-value workflow to prove the model on (e.g. "give us your incoming leads").
3. **Delegate** — the company grants narrowly scoped authority via the Authority Map (below), not blanket access.
4. **Operate** — Taloa performs the real work, not a demo, on their actual leads/tickets/inquiries.
5. **Measure** — Taloa keeps the receipts. Real before/after numbers, not vibes:

   | | Before Taloa | With Taloa |
   |---|---:|---:|
   | Leads | 183 | 183 |
   | Contacted | 71 | 183 |
   | Followed up | 34 | 171 |
   | Appointments | 19 | 57 |

6. **Expand** — the company authorizes additional departments once the first one proves out.

Customer journey: **free/low-cost assessment → paid pilot → recurring subscription → expanded delegation → deeper integration.** Every successful expansion embeds Taloa further into the business.

---

## The Authority Map

Instead of asking "what may Taloa do?" as one blanket yes/no, permissions are granted **by function**, explicitly enumerated per department:

**Customer Service** — read inquiries ✅, respond to routine questions ✅, schedule appointments ✅, offer discounts ❌, issue refunds ❌
**Purchasing** — research suppliers ✅, request quotes ✅, negotiate within 5% ✅, purchase under $100 ✅, purchase over $100 ❌, sign contracts ❌
**Sales** — qualify leads ✅, follow up ✅, schedule appointments ✅, make offers ❌, sign agreements ❌

**This is not a new concept for us — it's already built and live.** `services/general-browser-agent.js`'s risk gate (`RISKY_ACTION_LABEL_PATTERNS`, `isRiskyClick`, `allowRiskyActions`) is the exact same pattern in miniature: a real observed action gets checked against a boundary of what's authorized before it's allowed to execute, and the gate blocks with a named reason (`risky_action_requires_authorization:<label>`) rather than silently proceeding or silently failing. Shipped tonight (`OVERLAY-ENGINE-RISK-GATE-0001`), reused unchanged in `OVERLAY-DRIVE-CHANNEL-0001`. **The Authority Map, at the technical level, is this same mechanism generalized from "one risky click" to "a per-department permission table."** The build path from here to there is extension, not invention: turn `RISKY_ACTION_LABEL_PATTERNS` from a fixed regex list into a per-client, per-function table loaded at session start.

---

## The Education Layer ("Taloa Academy")

Onboarding a company doesn't just teach Taloa the company's processes — it turns those processes into **teachable knowledge Taloa can hand back to the company's own people, forever.**

A new employee asks "Teach me how to create a service ticket," and instead of a 40-page manual, Taloa walks them through it live: "Open the service-management screen. See this button? Click here. Enter the customer's information here. This field matters because it determines dispatch. Now you do the next one" — then watches the result and corrects them. **Instruction + demonstration + practice + verification**, not a document dump.

This extends naturally to camera/AR: "You're looking at the compressor. This is the pressure gauge. Point to it. Show me what you're seeing." — verified visually, not just described. Not phased or scoped yet; named here so it isn't lost.

**The differentiator over generic AI tutoring:** Taloa doesn't teach someone *how to do something* — it teaches them **how *this company* does it.** Institutional knowledge (owner's head, tribal knowledge, old PDFs, SOPs, training videos) becomes a living, queryable, teachable organizational knowledge base.

**Self-improving via struggle detection:** if 12 employees separately ask Taloa the same "how do I do X" question, that's a real, measurable signal — "your employees are repeatedly struggling with Step 4 of the purchasing procedure" — and Taloa can proactively propose a short training module. This reuses the exact struggle-detection primitive already built in the Universal Overlay extension (`content.js`'s `STRUGGLE_SIGNAL` — dwell time, repeat clicks, edit cycles — see `docs/products/universal-overlay/PRODUCT_HOME.md`), generalized from "a person struggling with a web page" to "an organization struggling with a procedure."

---

## Education as the front door, not the destination

A company's first purchase can be something small and already-obviously-needed — "train our new salespeople on the CRM" — not a leap-of-faith AI platform decision. Coaching/training is itself a recurring subscription (**Taloa Coach** — an always-available AI coach any employee can ask "how do I do this / why do we do it this way / quiz me / help me prepare for this call"), and building that training is *itself* how Taloa learns the business well enough to spot real operational gaps:

Training reveals problems → Taloa observes a real inefficiency (e.g. "your lead follow-up is inconsistent") → offers the next service as an observed solution, not a hard sell → **Training → Consulting → Implementation → Automation → Delegation → Ongoing operations.**

> "We sell the first thing they already know they need. Then Taloa earns the right to help with everything else."

---

## Full adoption funnel (for reference)

```
Taloa enters the company through education
  -> Learns the organization
  -> Creates its knowledge model
  -> Trains employees
  -> Employees begin asking Taloa questions
  -> Taloa becomes their persistent organizational assistant
  -> The company begins delegating tasks to Taloa
  -> Taloa operates within explicit Authority Map boundaries
  -> Taloa measures results (real before/after receipts)
  -> The company grants more responsibility
  -> Taloa becomes part of the company's operating infrastructure
```

---

## Connection to what's already real, tonight

- **Authority Map** ≈ generalization of the already-shipped, already-live browser-agent risk gate (`services/general-browser-agent.js`).
- **"Do real work during onboarding, not a demo"** is exactly what the Site Builder automation-services landing page (built tonight, live at `/previews/prev_1786305721372_vlzi/`) is a first small instance of: a real, working lead-capture form wired to real infrastructure, not a mockup.
- **Struggle detection → training gap discovery** reuses the Universal Overlay's existing `STRUGGLE_SIGNAL` mechanism, already built and shipped.

## Explicitly not yet scoped

No blueprint, no BP_PRIORITY entry, no schema for the Authority Map data model, no design for the Education Layer's content pipeline (how a company's PDFs/videos/SOPs actually become interactive lessons), no AR/camera integration plan. This document exists so none of it gets lost before that work is scoped — not to claim any of it is built.
