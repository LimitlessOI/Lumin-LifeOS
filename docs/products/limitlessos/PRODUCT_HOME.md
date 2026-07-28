<!-- SYNOPSIS: Canonical product home — LimitlessOS business stack -->

# LimitlessOS Product Home

**Product id:** `limitlessos`  
**Parent platform:** Lumin / LifeOS ecosystem  
**Constitutional law:** `docs/constitution/NORTH_STAR_SSOT.md`  
**Machine manifest:** `docs/products/limitlessos/FILE_MANIFEST.json`  
**Last Updated:** 2026-07-23 — Go Vegas flagship site `/go-vegas` + recognition flywheel playbook (Best Of → join network).

| Field | Value |
|-------|-------|
| **Lifecycle** | `founder-vision` — not a separate runtime repo slice yet |
| **Status** | Business operating product (umbrella for business-facing modules) |
| **First modules** | MarketingOS, Business Tools, Site Builder, AI Receptionist, Outreach CRM, … |
| **Human layer** | LifeOS (employees + owners) |
| **Improvement engine** | BuilderOS |

---

## What LimitlessOS is (founder lock)

**Not** AI. **Not** software. **Not** CRM.

The business model:

> We continuously improve your business while continuously lowering your operating costs.

Everything else is a feature.

---

## The LimitlessOS Promise

**Build a better business, spend less money, save more time, and live a better life.**

---

## Philosophy (founder lock)

Most business software companies ask: *"How do we sell another subscription?"*

LimitlessOS asks: *"How do we eliminate another subscription?"*

If a business pays for five tools and we replace them with one, value is immediate. If we cannot replace a tool yet, we say so. That honesty builds trust.

---

## What we sell

Not software modules. **ROI reports and outcomes.**

1. **AI Business Audit** — living map of current stack, spend, usage, waste  
2. **Replacement plan** — what LimitlessOS can absorb today vs later  
3. **Continuous optimization** — cancel unused SaaS, consolidate duplicates, migrate when ready  
4. **Tiered services** — DIY guided (SocialMediaOS directs shoots) → done-for-you → full automation  

Example audit conversation (illustrative):

| Current stack | Monthly |
|---------------|--------:|
| CRM, scheduling, accounting, phone, website, marketing, texting, reviews, social agency | **$1,685** |
| LimitlessOS replacement bundle (CRM, scheduling, phone, text, AI receptionist, reviews, website, marketing, KB, social) | **$697** |
| **Annual savings** | **$11,856** |

Numbers are **examples** until wired to live audit APIs — the *shape* of the sale is canonical.

---

## Simplicity + progressive disclosure

Ask: **"What are you trying to accomplish?"** — not *"What feature do you want?"*

Industry-specific surfaces (restaurant, real estate, attorney, HVAC, medical) — not one airplane cockpit.

Beginners see five buttons. Experts unlock fifty. Complexity unfolds when needed.

---

## AI employees (owner-facing model)

Owners don't buy "CRM" or "scheduling." They hire:

| AI role | Underlying modules (examples) |
|---------|-------------------------------|
| Marketing Director AI | MarketingOS / SocialMediaOS |
| Sales Manager AI | Outreach CRM, LifeRE |
| Receptionist AI | AI Receptionist |
| Bookkeeper AI | Financial / token accounting |
| Operations Manager AI | Business Tools, automations |
| Customer Success AI | Review + comms stack |
| Content Producer AI | SocialMediaOS (producer/director) |
| CTO AI | Stack audit, migrations, cost optimization |

Each role: clear job description, scorecard, authority within limits. Software modules exist underneath; the owner talks to their **team**.

---

## Business Health Score

Weekly health — not revenue alone:

Marketing · Sales · Customer Service · Automation · Technology · Finance · Hiring · Owner Stress → **Overall**

AI proposes: *"If we improve these three things…"* → score rises.

When LifeOS is active for the owner, add **Life Score**, relationship, health, time freedom, financial balance — and flag **unbalanced success** (revenue up, marriage time down, vacation zero).

---

## Integrate first. Replace later.

| Phase | Behavior |
|-------|----------|
| 1 | Connect tools they already use (Canva, QuickBooks, Mailchimp, …) |
| 2 | Automate through those tools via LifeOS control layer |
| 3 | Learn what matters |
| 4 | Build better internal versions where we win on quality + cost |
| 5 | Offer migration: *"Save $X/month — switch?"* |

LifeOS acts; ChatGPT talks. Context: person, goals, business, tools, commitments, relationships.

---

## Ecosystem optimization guardrail

A decision succeeds only if it improves (or does not unnecessarily harm):

- the customer  
- the employee  
- the business  
- the community  
- long-term platform trust  

Never optimize for business profit alone.

---

## The Limitless Principle

> People should spend more time doing what they are uniquely good at and less time doing what machines can do better.

North Star question for every product decision:

**Did this give a human more time for what only a human can do?**

---

## Vision statement (founder lock)

We believe technology should not replace human potential — it should remove the barriers that prevent people from reaching it.

- **LifeOS** helps people become the best version of themselves.  
- **LimitlessOS** helps businesses become the best version of themselves.  
- **BuilderOS** continuously improves both.  
- **CityOS (Go Vegas)** — connects people, businesses, and communities through trusted local intelligence *(future)*.

Together: AI handles repetitive, disconnected, administrative work — humans focus on creativity, relationships, craftsmanship, leadership, and meaning.

---

## Child products (modules — not duplicated here)

| Module | Home |
|--------|------|
| MarketingOS | `docs/products/marketingos/PRODUCT_HOME.md` |
| SocialMediaOS | `docs/products/marketingos/socialmediaos/PRODUCT_HOME.md` |
| Business Tools | `docs/products/business-tools/PRODUCT_HOME.md` |
| Site Builder | `docs/products/site-builder/PRODUCT_HOME.md` |
| AI Receptionist | `docs/products/ai-receptionist/PRODUCT_HOME.md` |
| LifeOS (human) | `docs/products/lifeos/PRODUCT_HOME.md` |
| BuilderOS | `docs/products/builderos/PRODUCT_HOME.md` |

---

## Conversations

| Date | Topic |
|------|-------|
| 2026-06-29 | [`conversations/2026-06-29-founder-ecosystem-session.md`](conversations/2026-06-29-founder-ecosystem-session.md) |

**Master verbatim archive:** `docs/conversation_dumps/2026-06-29-limitlessos-ecosystem-founder-vision.md`

---

## Open decisions (not blueprint-ready)

- [ ] Canonical product id for "BusinessOS" vs "LimitlessOS" in customer-facing UI  
- [ ] Live audit data sources (Plaid? manual intake? OAuth per vendor?)  
- [ ] CityOS / Go Vegas product home creation *(outreach pipeline v1 shipped — see Change Receipts)*
- [ ] Sticker / physical marketing SKUs under MarketingOS commerce layer  
- [ ] Price book API for print partners (VistaPrint, Sticker Mule, …) in-app  

---

## Change Receipts

| Date | What | Why |
|------|------|-----|
| 2026-07-23 | **Automate daily pack (approve→paste).** `services/go-vegas-daily-pack.js` + `npm run go-vegas:daily-pack` writes 31+ staggered posts (Adam / SiteBuilder / Taloa Social) to `data/go-vegas-daily-packs/`. FB send stays human; emails/spec builds stay system. | Adam: no time for manual — automate prep. |
| 2026-07-23 | **FB growth deep dive + comment-weighted contest.** `docs/products/limitlessos/GO_VEGAS_FB_GROWTH_PLAYBOOK.md` — Meta ≥20 posts/day feed-ranking eligibility (Transparency), 31+ chip, MSI/comments≫likes, first-hour replies, native>links, quality score, badges, 14-day idle revival. Contest score `(comments×5)+(reactions×1)+(shares×3)` via `scoreBestPostContest`. | Adam: grow idle 16k group; winners by viral (comment-heavy) attention. |
| 2026-07-23 | **31+ daily activity + rec-ask soft open.** Playbook floor `groupOwnedPostsFloor: 31` (Meta “31+” chip) + `memberPostsTarget: 20`. `RECOMMENDATION_ASK_BANK` (plumber/HVAC/etc.) → `buildRecommendationSoftOpenEmail` (warm “X from Go Vegas thought we could help” + free spec + score vs competitors + upgrade bullets + preview link). | Adam: group must show 31+ to stay recommended; rec threads create soft SiteBuilder opens. |
| 2026-07-23 | **Go Vegas network site + recognition flywheel.** Public flagship `GET /go-vegas` (`public/overlay/go-vegas.html`) — Best Of, join CTA, powered by SiteBuilder by Taloa. Playbook `config/go-vegas-network-playbook.js`: Adam ~12/day discussion; product accounts 5–20 with own personality; daily recognition questions → outreach “Superior Place” + Best Of; rotating sub-promo threads; contest/surprise free-site rewards. | Adam: channel businesses into free network via recognition + hella-good site as SiteBuilder proof. |
| 2026-07-11 | **Go Vegas manual seed** — `POST /api/v1/go-vegas/prospects/seed` + export `upsertProspect`. Lets conductor enqueue LV leads without `GOOGLE_PLACES_KEY`. Invites still need Postmark approval for external domains. | Adam: path to money — Places key missing; seed unblocks pipeline fill. |
| 2026-07-09 | **gv-status-route DONE** — `GET /api/v1/go-vegas/scheduler` is live via founder-runtime `createGoVegasOutreachRoutes` (not auto-register). Cleared false `blocked` so never-stop stops thrashing queue-status commits that race founder builds. | A→Z trust — commit races were failing drawer builds with "Reference cannot be updated". |
| 2026-07-09 | **Go Vegas verify_script** — `scripts/verify-go-vegas-scheduler.mjs` (exports + useful-work-guard contract + boot wire + live `/scheduler`). | Close false-done on revenue slice; never-stop must re-gate after build. |
| 2026-07-09 | **Go Vegas revenue loop closed (scheduler + boot + status)** — never-stop authored `services/go-vegas-outreach-scheduler.js` but misused `createUsefulWorkGuard` (no `shouldRun`); conductor GAP-FILL rewrote it to the real guard contract, wired `startGoVegasOutreachScheduler` in founder runtime, and exposed `GET /api/v1/go-vegas/scheduler`. Queue steps gv-scheduler/boot-wire/status marked done. | Adam: do that while it's building — fix self-repair blockers and finish the revenue slice in parallel. |
| 2026-07-09 | **Go Vegas revenue queue enrolled** — `docs/products/limitlessos/BUILD_QUEUE.json` (gv-scheduler → boot wire → scheduler status route). Promoted `limitlessos` to #1 in `PRODUCT_BUILD_PRIORITY.json`. | Adam: take a revenue product end-to-end; nearest live money loop is Go Vegas outreach under daily caps. |
| 2026-07-07 | **Go Vegas sender + reputation guard** — invites send **from `Adam Hopkins <adam@hopkinsgroup.org>`** (override: `GO_VEGAS_FROM_EMAIL`). Hard daily caps: **8 new invites**, **5 follow-ups**, **12 total/day** (`GO_VEGAS_MAX_*` env). Stops automatically when cap hit. | Founder: personal direct email for invites; do not burn inbox reputation with bulk volume. |
| 2026-07-07 | **Go Vegas group URL locked** — default invite link `https://www.facebook.com/groups/govegas` in `config/go-vegas-campaign.js` (env override still supported). | Founder supplied canonical Facebook group for outreach CTAs. |
| 2026-07-07 | **Go Vegas outreach pipeline v1** — `config/go-vegas-campaign.js`, `services/go-vegas-outreach.js`, `services/go-vegas-email-finder.js`, `routes/go-vegas-outreach-routes.js`, `scripts/go-vegas-outreach-pilot.mjs`, migration `20260707_go_vegas_outreach.sql`. Discover Las Vegas businesses (Google Places), scrape contact emails, send free-network invite with benefits copy, auto follow-up on days 3/7/14, pipeline CRM at `/api/v1/go-vegas/*`. | Adam: grow Go Vegas Facebook business network — free invite, sell benefits, persistent follow-up until they join. |
| 2026-06-29 | Created LimitlessOS product home from ChatGPT founder session | Adam: preserve ecosystem business model as founder document; route multi-product conversation to correct folders |
