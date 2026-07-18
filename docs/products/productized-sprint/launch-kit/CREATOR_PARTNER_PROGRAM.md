<!-- SYNOPSIS: Creator Partner Program — eXp-style 5-level creator revenue-share spec (GTM + billing requirements). @ssot docs/products/productized-sprint/PRODUCT_HOME.md -->

# Creator Partner Program (eXp-style creator rev-share)

**Owner product home:** `docs/products/productized-sprint/PRODUCT_HOME.md`
**Engine spec (governed factory):** `docs/products/creator-media-os/PRODUCT_HOME.md` → `services/creatorPartnerProgram.js` + `routes/creatorPartnerRoutes.js`
**Status:** SPEC. Not live. Requires Stripe + self-serve auth + **counsel review** before launch.

---

## Why

Big creators already have audiences. Give them a direct affiliate cut **plus** a deep downline they earn on, and every creator becomes a recruiter — the same lever that took eXp Realty from 0 → 90k+ agents. This is the single highest-leverage growth mechanic for SMOS / Creator Media OS.

## What we copy from eXp (and what we do NOT)

- **Copy:** rev-share is paid **out of company margin**, never out of the downline creator's earnings; the person below never earns less. Deeper levels **unlock by how many creators you directly sponsor** (frontline). No fee to join the tree.
- **Do NOT copy / hard line:** compensation is tied **only to real paid, active product subscriptions/usage** — never to recruitment fees or a pay-to-join buy-in. The moment people earn mainly for signing others up rather than for product sold, it is an **FTC pyramid scheme**. Free to join; earn only on actual paid, active creators.

## Two stacked layers

1. **First-sale affiliate (one-time):** 30–40% of the first purchase to the direct referrer. e.g. $997 pack → ~$300–$400.
2. **Downline rev-share (recurring):** 5 levels deep, paid monthly from margin, while both earner and downline stay subscribed.

### Rev-share table (tunable config — not hard-coded)

| Level | % of that creator's sub revenue | Unlock requirement |
|---|---|---|
| L1 (direct) | 20% | sponsor 1 active creator |
| L2 | 7% | 5 active frontline |
| L3 | 5% | 10 active frontline |
| L4 | 4% | 15 active frontline |
| L5 | 4% | 20+ active frontline |

Total distributed ≈ **40% of sub revenue** — viable because software margin is ~85% (real cost = API/render). Tune `%`, unlock thresholds, and caps to margin.

### Guardrails

- **"Active"** = paying + used the product in the last 30 days (kills dead-weight signups).
- **Annual cap per downline seat** (e.g. $X/creator/yr) so a few whales don't blow up unit economics.
- Payout monthly; only while **both** earner and downline are subscribed + active.
- Full audit trail per payout (who earned, from which downline sub, which period).
- Percentages, thresholds, and caps live in config so they can be dialed without a redeploy.

## Big-creator tiers (who we recruit first)

- **Mid-tier (10k–200k):** convert best on affiliate % + downline. Primary target.
- **Mega-creators:** flat sponsorship + a code + free ambassador seat; their content is the ad.
- Free ambassador (creator) seat for selected larger creators — their usage is our best marketing.

## Billing / auth requirements (feed the self-serve build)

- Stripe subscriptions (`STRIPE_SECRET_KEY`) with metadata linking each sub to its sponsor chain.
- Sponsor attribution captured at signup (referral code / link) and immutable thereafter.
- Rev-share ledger (`services/creatorPartnerProgram.js`) computes monthly payouts from active subs, applies unlock + cap rules, and writes an auditable record.
- Partner dashboard (`routes/creatorPartnerRoutes.js`): downline tree, active seats, earnings, payout status.
- Payouts execution (Stripe Connect / manual batch initially) — out of scope for v1 ledger; ledger produces the payable amounts.

## ⚠️ Legal (KNOW — not legal advice)

Get counsel to review the plan for FTC compliance and state MLM/anti-pyramid statutes **before launch**. The defensible position: no buy-in, comp tied to real product sold to active paying users, income disclosures published, and no earnings for recruitment alone.
