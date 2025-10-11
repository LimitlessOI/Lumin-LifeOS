# MASTER TODO SEED (ALL CARDS IN ONE FILE)
# The builder will parse each section as an atomic card.
# Do NOT edit tonight. Commit and let Night Runner work.

---

# CARD: 001_money_cards
## Title
Money Offer Pages (TC $200 • Setup $149 • Receptionist $99/mo)
## Files
- docs/offers/tc_200.md
- docs/offers/setup_149.md
- docs/offers/receptionist_99.md
## Hints
- Each file structure: Problem → Promise → Proof → Price → CTA.
- Add 3 DM variants + 1 short email with placeholders:
  - {TC_LINK}, {SETUP_LINK}, {RECEPTION_LINK}
- Include 3 objection/response pairs.
- Tone: helpful, zero hype. Paste-ready.

---

# CARD: 002_sales_copy_realtors
## Title
Realtor DM/Email Scripts (Team Alpha)
## Files
- docs/scripts/realtor_dm.md
- docs/scripts/realtor_email.md
## Hints
- Offers: TC $200 and Setup $149.
- Include booking CTA with {TC_LINK} and {SETUP_LINK}.
- Produce 5 short DMs (≤280 chars) + 2 emails with subject lines.
- Add a 3-message reply sequence for “interested” leads.

---

# CARD: 003_sales_copy_clinics
## Title
Clinic/Home Services Scripts (Team Bravo)
## Files
- docs/scripts/clinic_dm.md
- docs/scripts/clinic_email.md
## Hints
- Offers: Receptionist $99/mo and Setup $149.
- Include booking CTA with {RECEPTION_LINK} and {SETUP_LINK}.
- 5 DMs + 2 emails; angle: “missed calls = missed clients.”
- Add a 3-message reply sequence for “interested” leads.

---

# CARD: 004_delivery_checklists
## Title
Delivery Checklists (run-of-show)
## Files
- docs/checklists/tc_kickoff.md
- docs/checklists/setup_runbook.md
- docs/checklists/receptionist_rollout.md
## Hints
- 7 steps each. Include:
  - Preflight/requirements
  - Live call steps
  - Replay/summary handoff
  - Next upsell suggestion
- Keep operational and short.

---

# CARD: 005_booking_without_calendly
## Title
Booking API (No Calendly)
## Files
- docs/ops/booking_flow.md
## Hints
- Spec POST `/api/book` with body: {name,email,phone,slot}.
- Behavior: creates Zoom meeting → sends SMS/email via BoldTrail.
- Add schema: `bookings(id, dt, client, email, phone, zoom_link, status)`.
- Include confirm/reschedule/cancel templates (SMS + email).
- Note: Implement later; tonight only document/spec.

---

# CARD: 006_guardrails_and_scale
## Title
Scale Guardrails + Status Endpoint
## Files
- docs/ops/scale_guardrails.md
## Hints
- “Scale only if” 7-day rolling window is true for:
  - CAC:LTV ≥ 1:3
  - Conversion ≥ 10%
  - Margin ≥ 60%
  - Ethics flags outstanding = 0
- Propose JSON for `/api/guard/scale`:
  - `{ "ok": boolean, "reasons": [strings], "window_days": 7 }`

---

# CARD: 007_team_alpha_sprint
## Title
Team Alpha Charter + Scorecard (Realtors)
## Files
- docs/teams/alpha_charter.md
- docs/teams/alpha_scorecard.md
## Hints
- Daily targets: 50 DMs, 5 calls, 3 paid.
- Offers: {TC_LINK}, {SETUP_LINK}.
- Scorecard columns:
  - Date, Leads, Calls, Paid, Gross, Margin_est, DW_ROI, Notes
- Include “Velocity bonus”: ×2 credits if revenue <14 days.

---

# CARD: 008_team_bravo_sprint
## Title
Team Bravo Charter + Scorecard (Clinics/Home Services)
## Files
- docs/teams/bravo_charter.md
- docs/teams/bravo_scorecard.md
## Hints
- Daily targets: 50 DMs, 5 calls, 3 paid.
- Offers: {RECEPTION_LINK}, {SETUP_LINK}.
- Same scorecard fields as Alpha.
- Add note: 24-hour exclusivity on winning improvement.

---

# CARD: 009_stripe_webhook_tithe
## Title
Lumea Fund 2% Tithe (docs)
## Files
- docs/ops/lumea_fund_tithe.md
## Hints
- Describe Stripe webhook that logs 2% divert to fund.
- Example payload/response and accounting note.

---

# CARD: 010_founder_filter_json
## Title
Founder Filter (95% decision match – embed JSON)
## Files
- docs/ops/founder_filter.md
## Hints
- Include this JSON for reference (the system consults it on every proposal):

```json
{
  "north_star": "Make money ethically to fund LifeOS; never over ethics.",
  "priority_order": ["Cash this week", "Recurring revenue", "System stability", "Brand integrity"],
  "guardrails": {"TAISE_min": 0.7, "no_dark_patterns": true, "consent_required": true},
  "go_no_go": {
    "min_margin_pct": 60,
    "time_to_revenue_days_max": 14,
    "dw_roi_min": 0.60
  },
  "escalate_if": ["legal/compliance risk", "brand harm", "cross-team conflict", ">$1k unbudgeted spend"]
}
