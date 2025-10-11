# Backlog — Money First & A→Z Sprint

## Money Offers (ship copy & checklists)
- Create sales copy + DM/email scripts for:
  - TC $200 one-time
  - AI Setup $149 one-time
  - AI Receptionist $99/month
- Write delivery checklists:
  - TC kickoff + replay handoff
  - AI Setup runbook (CRM + phone/Zoom)
  - Receptionist rollout (answer/qualify/book)

## No-Cal Scheduling (replace Calendly)
- Spec and scaffold `/api/book` to create Zoom, send SMS/email via BoldTrail.
- Add `bookings` table: id, dt, client, email, phone, zoom_link, status.

## Two Competing Teams (Alpha/Bravo) — 7-Day Money Sprint
- Alpha (Realtors): TC $200, Setup $149
- Bravo (Clinics/Home Services): Receptionist $99/mo, Setup $149
- Create team charters, daily scorecards, and scripts bound to Stripe links.

## Safety & Scale Guardrails
- Throttle policy: only scale volume if for 7 consecutive days:
  - CAC:LTV ≥ 1:3
  - Conversion ≥ 10%
  - Margin ≥ 60%
  - Ethics flags outstanding = 0
- Implement `/api/guard/scale` to expose guard state as JSON.

## A→Z Sprint Enablers (Command Center / Trading / Autonomy)
- Notion schema: Swarm Command Center + Meta-Log (fields + examples).
- Consensus workflow plan (ChatGPT/Gemini/Claude/Grok) and “Go/No-Go” gates.
- Sandbox harness for testnet trading; nightly backup/export to /reports.
