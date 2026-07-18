<!-- SYNOPSIS: Founder runbook — create Stripe payment links for the Content Pack (no code) -->

# Stripe Payment Links — Founder Runbook (no code)

A Stripe **Payment Link** is a hosted checkout URL you create in the Stripe dashboard. It needs
**zero code** and no changes to the app. This is the fastest compliant way to take money for the
service today.

> KNOW: The repo already carries Stripe integration for other products (Site Builder, BoldTrail),
> so a live Stripe account almost certainly exists. Payment Links do not touch that code.

## Steps (~30 minutes, one time)

1. Log in to **https://dashboard.stripe.com** (use the LimitlessOS/Hopkins Group account).
2. Left nav → **Product catalog** → **+ Add product**. Create these three products:

   | Product name | Price | Type |
   |---|---|---|
   | Founder Voice Content Pack — Starter | $497 | One-time |
   | Founder Voice Content Pack — Full | $997 | One-time |
   | Founder Voice — Monthly | $297 / month | Recurring (monthly) |

   (Adjust monthly to $199 or $497 per the buyer; $297 is the recommended default.)

3. For each product → **Create payment link**. Recommended settings on each link:
   - **Collect customer name + email** (on by default).
   - **Add a custom field** (optional): "Business / handle" — text.
   - **After payment → Confirmation page → Redirect to a URL** = your intake form URL
     (from `INTAKE.md`). This makes buyers fill the brief immediately after paying.
   - Turn on **"Allow promotion codes"** if you want to offer launch discounts.
4. Copy the three payment-link URLs and paste them into `LINKS.local.md` (create it next to this
   file — it is git-ignored friendly; do **not** commit live links if you'd rather keep them private).
5. Test each link in a browser with Stripe in **test mode** first, then switch to **live**.

## Where the links go

- **Outreach messages** (`OUTREACH_TEMPLATES.md`) — paste the tier link directly.
- **Intake form** — put the "pay first" link at the top, or use the post-payment redirect above so
  the flow is: pay → auto-redirect to intake → you get the brief.

## Recommended money flow (simplest that works)

```
Warm DM/email  ──►  Stripe Payment Link (pick tier)  ──►  auto-redirect to Intake form
                                                              │
                                                              ▼
                                              You get email + brief  ──►  deliver via DELIVERY_SOP
```

## Optional (later, via governed factory — NOT now)

Wiring an in-app checkout + auto-routing to a delivery queue is Productized Sprint "Phase 2" and a
MarketingOS self-serve-billing build. That is a `routes/`/`services/` change and must go through the
governed factory + SENTRY (SO-001/SO-002). Do not hand-write it. Payment Links cover you until then.
