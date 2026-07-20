<!-- SYNOPSIS: Per-product path to first dollar — every concrete step from today to money collected -->

# Path to First Dollar — Per Product
**Date:** 2026-07-10 · **Author:** Devin · **Mode:** OBSERVE ONLY (deep dive; no repairs)
**Truth labels:** KNOW (verified this session) · THINK (strong inference) · GUESS · DON'T KNOW.

## The universal gate (applies to every product)
**KNOW:** Payment realness across the whole platform hinges on one thing — is `STRIPE_SECRET_KEY` an `sk_live_…` key? Nothing in code forces live mode. If it's a test key, every checkout below "succeeds" and **no money arrives**. **Step 0 for all products: confirm the live Stripe key.** Verify once; it unlocks all six.

**KNOW:** No product has a real revenue receipt on disk yet. Everything below is distance-to-first-dollar.

---

# 1. SITE BUILDER — therapist/psychiatry websites
**State:** closest to a real external dollar. Checkout is LIVE.
**Pricing (KNOW, founder-locked in `config/site-builder-pricing.js`):** $45 beta publish (incl. 2 months management), $35/mo care plan, template/color/brand upsells ($1–$1,497).
**Live proof (KNOW):** `GET /api/v1/sites/publish/pricing` returns 200 in production with the $45 offer. Checkout route `/api/v1/sites/publish/checkout` + `/success` + verify are wired (`routes/site-builder-checkout-routes.js`).

**Path to first dollar:**
1. [DONE] Product generates a real preview site (scrape → AI generate). *Evidence: prospect_sites tables live, preview served at `/previews/<clientId>/`.*
2. [DONE] Pricing set and live.
3. [DONE] Checkout session + success/verify wired and mounted on the founder lane.
4. [TODO — Step 0] Confirm `STRIPE_SECRET_KEY` is live.
5. [TODO] Set `SITE_BASE_URL` (revenue-blocking) — success page builds the live site URL from it; without it delivery link is broken.
6. [TODO] Set `POSTMARK_SERVER_TOKEN` + `EMAIL_FROM` (revenue-blocking) — required to *send* the cold outreach that drives a prospect to checkout.
7. [TODO] Generate a batch of real prospect previews for therapists (scrape Psychology Today / license lists).
8. [TODO] Send the "here's your site already built" outreach to that batch (link → `/publish/checkout`).
9. [TODO] Prospect pays $45 → **first dollar.**
10. [TODO] Deliver: publish the site live on their domain (confirm the publish/fulfillment step actually deploys the site, not just marks paid — VERIFY this end-to-end before charging).

**Single next blocking step:** confirm live Stripe key + set `SITE_BASE_URL` and `POSTMARK_SERVER_TOKEN`. **Then it can take money the same day.**
**Distance:** ~1 day of config + one outreach batch. **Shortest path on the board.**
**Watch:** verify the *delivery* step (paid → site actually live on their domain) works end-to-end; a paid customer with no live site is worse than no sale.

---

# 2. SOCIALMEDIAOS — content pack + downline revshare
**State:** a sellable one-time pack is LIVE; the downline engine is not built.
**Pricing (KNOW, `config/smos-pricing.js`):** $49 one-time "Social Media OS content pack" (one coached session → approved IG/LinkedIn/X posts to download).
**Live proof (KNOW):** `GET /api/v1/marketing/pack/pricing` returns 200 with the $49 pack. Checkout `services/smos-pack-checkout.js` creates a real `checkout.sessions.create` and records to `marketing_pack_checkouts`.

**Path to first dollar (the $49 pack — available now):**
1. [DONE] Pricing set + live; real Stripe checkout session creation.
2. [DONE] Public signup + pack checkout mounted at `/api/v1/marketing/pack/*`.
3. [TODO — Step 0] Confirm live Stripe key.
4. [TODO] Verify the fulfillment: after payment, does the coached session → posts actually get produced/delivered? (VERIFY the delivery loop.)
5. [TODO] Drive traffic (DM creators / side-hustle communities) to the pack checkout.
6. [TODO] First buyer pays $49 → **first dollar.**

**Path to the downline product (the bigger prize — NOT built):**
7. [TODO — founder decision] Subscription yes/no + price (downline only pays meaningfully on recurring revenue).
8. [TODO — founder decision] Stripe Connect approval (required for multi-party payouts + 1099s).
9. [TODO — founder decision] Confirm 30% / 5% / 3% split.
10. [TODO] Build affiliate runtime through the governed factory: referral links → click/signup/sale attribution → commission ledger → creator dashboard → Stripe Connect payouts. *Today only spec + schema exist (PR #360).*
11. [TODO] Fraud/clawback guardrails (self-referral detection, refund clawback, attribution window) before real payouts move.

**Single next blocking step:** for the $49 pack — confirm live Stripe + verify fulfillment (near-term dollar). For the downline — your 3 money decisions.
**Distance:** $49 pack ~days; full downline ~weeks (net-new build). Highest upside overall.

---

# 3. TC SERVICE — transaction coordination ($100 at closing)
**State:** most code built, but the billing path is NOT production-ready — it has placeholder Stripe IDs and the wrong price.
**Pricing (founder-locked 2026-07-10):** **$100 at closing per deal**; first deal free (solo), up to ~3 free across 3 agents for teams by volume.
**Reality check (KNOW):** `services/tc-stripe-service.js` uses **placeholder Stripe price IDs** (`price_123456789`, `price_987654321`, `price_111111111`) and a hardcoded **$349** closing fee (34900 cents) — **not** your $100. TC pricing endpoints 404 in production (not mounted/live).

**Path to first dollar:**
1. [DONE] Core services (40+), 3 live portals (`/tc` = 200), SkySlope/MLS/GLVAR integrations coded.
2. [TODO] **Set the $100 price** in code/config (replace the $349 hardcode) and create a **real Stripe product/price** (replace the placeholder `price_…` IDs).
3. [TODO] Mount + expose a working billing/checkout endpoint (currently 404) with a "charge at closing" flow.
4. [TODO — Step 0] Confirm live Stripe key.
5. [TODO] Set `TC_IMAP_*` credentials (revenue-blocking) — the deal-monitoring loop reads the mailbox; core product is dead without it.
6. [TODO] Test SkySlope/eXp Okta automation against a live session.
7. [TODO] Define the acceptance test ("TC Service worked for this deal").
8. [TODO] Sign one agent/team for a **free first deal** (the offer), run the full transaction.
9. [TODO] On close, charge **$100** → **first dollar.**

**Single next blocking step:** real Stripe price + $100 update + mount the billing route + IMAP creds.
**Distance:** ~1–2 weeks (needs real Stripe product wiring + credentials + one live deal cycle). High value, medium effort.
**Watch:** $100/deal must stay well above automation cost per deal to keep margin.

---

# 4. API COST SAVINGS — B2B token-cost reduction
**State:** working performance-based checkout exists; no customer, no pricing page live.
**Pricing (KNOW, `routes/api-cost-savings-routes.js`):** performance-based — **monthly fee = 25% of the savings** (`monthlyFee = savings_amount * 0.25`), charged via a real `checkout.sessions.create` with dynamic price. Landing + Stripe success/cancel pages exist.
**Reality check (KNOW):** no GET pricing endpoint live (404), but the POST checkout flow is coded.

**Path to first dollar:**
1. [DONE] 5-layer optimization stack coded; landing page; real 25%-of-savings checkout.
2. [TODO — Step 0] Confirm live Stripe key.
3. [TODO] Verify the "measure a prospect's current spend → compute savings" audit actually runs on real usage data (the number the whole sale depends on).
4. [TODO] Build a target list of companies with high LLM/API spend.
5. [TODO] Offer a **free cost audit**; produce one believable "% saved" number.
6. [TODO] Convert the audit into the 25%-of-savings checkout.
7. [TODO] First B2B customer pays → **first dollar.**

**Single next blocking step:** this is a **sales/pipeline** problem, not code — get one company to accept a free audit.
**Distance:** ~2–3 weeks (depends entirely on outreach, not build).

---

# 5. LIFERE — real-estate agent daily OS
**State:** most technically finished product, but **no external "buy it" path exists** — it's wired as the founder's own tool.
**Pricing:** UNDEFINED (no external price/checkout in code).
**Proof (KNOW):** 11/11 machine E2E pass (`products/receipts/LIFERE_ALPHA_E2E.json`), live on Railway, but `founder_usability_pass:false`.

**Path to first dollar:**
1. [DONE] Full product built + deployed + machine E2E green.
2. [TODO] Run founder usability confirm (unblocks "founder-done").
3. [TODO — founder decision] Decide the commercial model: sold to other agents? per-agent $/mo? team/brokerage license?
4. [TODO] Set a price + create a Stripe product.
5. [TODO] Build an external signup + subscription checkout (does not exist today).
6. [TODO] Needs per-user auth (shared with LifeOS — see #6) so a non-founder can have a paid account.
7. [TODO] Acquire one agent (warm network / brokerage) → subscribe → **first dollar.**

**Single next blocking step:** decide the commercial model + build an external subscription checkout (currently none).
**Distance:** ~3–4 weeks if sold externally (needs pricing + checkout + auth). Technically done, commercially greenfield.

---

# 6. LIFEOS — platform account/subscription layer
**State:** live front door; the paywall/account machinery is mid-build.
**Pricing:** UNDEFINED (no platform subscription price).
**Proof (KNOW):** Chair/Lumin live (`/overlay/lifeos-app.html` = 200); user-auth mission `PRODUCT-LIFEOS-USER-AUTH-V1-0001` actively building (step receipts UAT-006/007).

**Path to first dollar:**
1. [DONE] Front door + conversation/capture pipeline live.
2. [TODO] Finish user auth (in progress) — real per-user accounts.
3. [TODO] Set `GMAIL_SIGNUP_APP_PASSWORD` (signup email verification) + `LIFEOS_FOUNDER_LOGIN_EMAIL`.
4. [TODO — founder decision] Platform subscription price + tiers.
5. [TODO] Build subscription checkout + gate premium features behind it.
6. [TODO] First user subscribes → **first dollar.**

**Single next blocking step:** finish auth, then set a subscription price + checkout.
**Distance:** ~4–6 weeks. LifeOS is the account layer other products' paid accounts depend on, so its auth completion has leverage beyond itself.

---

# Other products — honest status (not near a first dollar)

**BoldTrail — THINK: live, but not a standalone paid product.** Live with real agent data; shared module powering LifeRE/TC. To collect a dollar it must be declared a **standalone** agent-subscription product ($97–197/mo) with its own pricing/checkout — a founder scope decision, then similar steps to LifeRE. Distance: medium, gated on the decision.

**ClientCare Billing Recovery — THINK: sensitive, human-gated.** Services + browser automation coded; billing routes mounted. Blockers: no vendor API (fragile browser automation), human-approval gate required (sensitive medical billing), no acceptance test defined with Sherry, and it's a success-fee model that needs a real recovered claim to bill against. Distance: medium-high; needs a defined acceptance + one real recovery.

**LimitlessOS ("Go Vegas") — THINK: vision umbrella, not a runtime SKU.** Product home says lifecycle `founder-vision — not a separate runtime slice yet`. Revenue would come through its modules (Site Builder, MarketingOS, AI Receptionist), not a standalone LimitlessOS checkout. Distance: it's a positioning layer; first dollar flows via the modules above.

**AI Receptionist — GUESS: coded, no live checkout verified.** Has Stripe references but no verified live pricing/checkout endpoint this session. Would need pricing + checkout + a live phone/booking demo. Distance: unknown, needs deeper audit.

**The long tail (~30 products: KidsOS, TeacherOS, WordKeeper, StoryStudio, FaithStudio, MusicTalentStudio, GamePublisher, PersonalFinanceOS, WellnessStudio, IdeaVault, etc.) — GUESS/DON'T KNOW: concept-to-early-code.** Per the blueprint readiness ranking most are 2–5/10: no FOUNDER_PACKET, no mission, no pricing, no checkout, several no product home. **None are near a first dollar.** They should not compete for attention with the 4 revenue-capable products (Site Builder, SMOS, TC, API Cost Savings) until those are collecting money.

---

# Bottom line — ranked by distance to first real dollar
| Rank | Product | Single blocking step | Distance |
|---|---|---|---|
| 1 | **Site Builder** | Live Stripe key + `SITE_BASE_URL` + `POSTMARK_SERVER_TOKEN`, then outreach | ~1 day |
| 2 | **SocialMediaOS ($49 pack)** | Live Stripe key + verify fulfillment, then drive traffic | ~days |
| 3 | **TC Service** | Real Stripe price @ $100 (kill placeholders/$349) + mount billing route + IMAP creds | ~1–2 wks |
| 4 | **API Cost Savings** | One company accepts a free audit (sales, not code) | ~2–3 wks |
| 5 | **LifeRE** | Decide commercial model + build external subscription checkout | ~3–4 wks |
| 6 | **LifeOS** | Finish auth + set subscription price/checkout | ~4–6 wks |
| — | SMOS downline, BoldTrail, ClientCare, LimitlessOS, long tail | founder decisions / net-new build / not near revenue | weeks–months |

**Do this first (unlocks the most, fastest):** (1) confirm the live Stripe key, (2) set Site Builder's 2 env vars and run one outreach batch, (3) verify the SMOS $49 fulfillment, (4) replace TC's placeholder Stripe price with a real $100 product. Steps 1–2 can produce a real first dollar within a day.
