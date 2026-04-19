# AMENDMENT 26 — Personal Finance OS

| Field | Value |
|---|---|
| **Lifecycle** | `planning` |
| **Reversibility** | `two-way-door` |
| **Stability** | `draft` |
| **Last Updated** | 2026-04-03 (initial draft — split from AMENDMENT_21 Layer 12; elevated to own amendment due to scope and regulatory complexity) |
| **Verification Command** | `node scripts/verify-project.mjs --project personal_finance_os` |
| **Manifest** | `docs/projects/AMENDMENT_26_PERSONAL_FINANCE_OS.manifest.json` |
| **Build Ready** | `NOT_READY` — Gate 1: Complete; Gate 2: Regulatory review required (financial product disclaimers); Gate 3: LifeOS Core Layer 12 schema design must come first |
| **Parent Module** | AMENDMENT_21 Layer 12 (Personal Finance, Budgeting & Investment Intelligence) |

---

## Mission

Money is one of the loudest mirrors in a person's life — and one of the most shame-laden. Most financial apps optimize for behavior change through guilt or gamification. Neither works long-term.

The Personal Finance OS is **mirror-first**: the system shows what is, helps the person understand why, and then supports whatever direction they choose. It never tells someone what to do with their money. It helps them see clearly so they can choose deliberately.

This module is **not investment advice**. It is financial clarity — a constitutional distinction that cannot be eroded.

---

## Constitutional Constraint (Inherited from AMENDMENT_21)

> **Never provide personalized investment advice, tax, or legal recommendations** unless offered through a properly licensed human or registered channel. The product surfaces *your* stated policy and *your* data — it does not tell you what to buy.

> **Never gamified trading, leverage prompts, paid order flow, or "signals" marketed as returns.**

These constraints are non-negotiable and architecturally enforced, not just policy.

---

## Feature Modules

### Module 1: Cashflow Truth

The foundation. Before anything else, you need to know where the money actually goes.

- **Income mapping** — all income sources; one-time vs recurring; reliable vs variable
- **Fixed obligations layer** — rent/mortgage, subscriptions, minimum payments; what leaves regardless of behavior
- **Discretionary buckets** — user-named categories tied to values ("what this money is for"), not generic accounting labels
- **Cashflow calendar** — when does money arrive? When do big obligations hit? Visual timing view
- **Surplus/deficit reality** — not a judgment; a number; what's actually left after obligations
- **Stress spend detection** — patterns in discretionary spending correlated with emotional state signals from LifeOS (HRV, joy score, emotional check-in) — shown back to user as information, never used against them

### Module 2: Budget Modes

Different lives require different financial structures.

- **Envelope** — allocate a fixed amount to each category; stop when the envelope is empty; zero psychology games
- **Zero-based** — every dollar assigned a job; no money unallocated; full intentionality
- **Good enough** — weekly spend cap per category; soft alerts, not hard stops; for people who want guardrails not a spreadsheet
- **Seasonal templates** — holiday season, travel, newborn, job change, health emergency; the budget shifts to match the season without requiring full rebuild
- **Life event tagging** — mark when a period is an exception (moving month, wedding expense, medical emergency) so the pattern analysis doesn't treat anomalies as baselines

### Module 3: Emergency Fund & Resilience

- **Runway calculator** — how many months can this person sustain their current obligations if income stopped today?
- **Target-setting (user-directed)** — user sets their own resilience target; system tracks progress without judgment
- **No-shame framing** — when runway is red (< 1 month), the system does not catastrophize; it surfaces the number, shows the path to improve it, and separates the financial reality from the person's worth
- **Liquidity visibility** — which assets are liquid? Which would take days/weeks to access? What is the actual emergency-accessible amount?

### Module 4: Debt Visibility

- **Full debt map** — every balance, every minimum, every interest rate; all in one view
- **Payoff order (user chooses)** — system calculates snowball (smallest balance first) and avalanche (highest interest first) as neutral options; user chooses based on their psychology, not optimization theory
- **Progress celebration** — paid-off debts are marked as victories; Victory Vault integration for major payoffs
- **Refinancing signals** — when interest rate environment changes significantly relative to existing debt rates, system flags it as a consideration (never advice; always the user's decision)

### Module 5: Life-Linked Goals

Money has meaning when it's connected to what it's for.

- **Dream Funding integration** — savings goals tied to specific named dreams from the Purpose Discovery engine; the financial goal and the human goal share one language
- **Named savings targets** — "London trip," "recording equipment," "emergency fund," "first investment account" — user-named, user-owned
- **Goal progress tracking** — monthly progress toward named targets with visual fill; small contributions celebrated not minimized
- **Commitment tracker integration** — financial commitments (I will save $200/month) flow through the same commitment accountability system as all other commitments

### Module 6: Household Money (Opt-in)

For couples and households who want shared financial visibility — with full consent architecture.

- **Explicit scope per category** — each partner decides which categories are shared and which are private; no all-or-nothing
- **Household cashflow view** — combined income + obligations when both partners opt in to shared view
- **Individual private space** — each person retains fully private money space that the other cannot see; this is architectural, not a setting
- **Shared goal coordination** — vacation fund, house down payment, emergency fund — shared goals without requiring full financial transparency
- **No surveillance** — the system never shows one partner the other's spending without explicit consent for that specific category

### Module 7: Investment Policy Statement (Non-Advisory)

For users who want to be intentional about investing without receiving investment advice.

- **User-authored IPS** — user answers questions to build their own investment policy: risk tolerance (how would you feel if your portfolio dropped 30%?), time horizon, ethical screens ("I don't want to invest in X"), "never rules" (no margin, no options, no single stocks above X% of portfolio)
- **Allocation vs target drift** — user inputs their current holdings snapshot (manual or CSV import); system compares to their IPS target; shows drift as information
- **Rebalance reminders** — when drift exceeds user-set threshold, system sends a reminder; execution always manual and explicit
- **Fee & drag literacy** — what are the expense ratios on your funds? What is your advisory fee? What is the tax drag on taxable accounts? Surfaced educationally; no recommendations
- **DCA discipline support** — if user has declared a regular contribution plan, system sends reminders on their schedule; never FOMO language; always aligned to user's own stated plan
- **Research sandbox (internal only)** — historical simulation scripts for operator learning (`attention-momentum-backtest.mjs`, `strategy-benchmark-suite.mjs`); any UI exposure requires: "Past performance does not predict future results" + "This is not investment advice" labels; never marketed as signals

### Module 8: Values-Aligned Spending

- **Values tagging** — user assigns their core values to spending categories; see at a glance whether money is going where values are
- **Alignment score** — what percentage of discretionary spending aligns with stated values? Trending over time
- **Misalignment surfacing** — "You spent $X on [category] this month but ranked [value] as your top priority; here's what that looks like" — information only, never shame
- **Subscription audit** — review all recurring charges; system surfaces ones that haven't been used recently; cancellation is one action

### Module 9: Financial Check-in Integration

Finance is not separate from emotional state, sleep quality, or relationship health. The Personal Finance OS is aware of this.

- **Financial stress correlation** — does the user's joy score drop after paying bills? Does HRV dip on bill-pay days? System surfaces this as a pattern, not a pathology
- **Good-time decision making** — research shows people make better financial decisions when rested and in a positive state; system can optionally flag "this might not be the best time for a big financial decision" based on current state signals
- **Depletion taxonomy** — "money anxiety" is one of the depletion tags in the emotional layer; the Personal Finance OS and Emotional Intelligence layer share data to provide whole-person context

---

## Revenue Model

| Tier | Price | What's Included |
|---|---|---|
| LifeOS Core | $29–$97/mo | Everything in AMENDMENT_21 |
| Personal Finance OS Add-on | +$19/mo | Full finance layer (Modules 1-9) |
| Household Bundle | +$29/mo | Adds household money module for couples |
| Financial Coaching Integration | Custom | Licensed financial coaching layer (partner relationship) |

---

## Regulatory / Legal Notes (Build Constraints)

1. **Not an investment adviser** — platform must not trigger RIA registration; the IPS module is explicitly educational and user-authored; system never tells users what securities to buy
2. **FINRA / SEC disclosure requirements** — any historical simulation outputs must include mandated past-performance disclaimers; this is enforced at the UI layer, not just policy
3. **Data aggregation** — if connecting to bank accounts via Plaid or similar, must comply with NACHA rules and bank data sharing agreements; alternative: CSV import only (no live connections required for MVP)
4. **State-level financial planning laws** — some states restrict what non-licensed entities can say about "financial planning"; terms of service and UI copy must be reviewed by an attorney before launch

---

## Pre-Build Readiness Gates

### Gate 1: Feature Detail — COMPLETE (this document)

### Gate 2: Regulatory Review
- [ ] Attorney review of IPS module for RIA trigger risk
- [ ] Past-performance disclosure language approved
- [ ] Terms of service financial disclaimer drafted
- [ ] Plaid vs CSV-only decision made for MVP

### Gate 3: LifeOS Core Dependency
- [ ] Layer 12 DB schema in AMENDMENT_21 designed and migrated
- [ ] Dream Funding (Layer 8) and Commitment Tracker (Phase 1) operational
- [ ] Emotional intelligence signals (joy_score_log, wearable_data) available for correlation

### Gate 4: Competitive Landscape
- **YNAB**: zero-based budgeting only; no life-context awareness; $99/yr
- **Monarch Money**: couples-focused; no emotional layer; no investment IPS
- **Personal Capital/Empower**: investment-focused; advisory-mode creep; no values layer
- **Gap**: no product connects financial behavior to emotional state, purpose alignment, and relationship health simultaneously

### Gate 5: Differentiation — CLEAR
Life-linked goals + emotional correlation + values-aligned spending + household privacy architecture + constitutional non-advisory stance = no existing product has this combination

---

## Build Priority

1. **Module 1: Cashflow Truth** — the foundation; everything else requires this
2. **Module 3: Emergency Fund & Resilience** — immediate practical value
3. **Module 4: Debt Visibility** — high demand, low liability
4. **Module 5: Life-Linked Goals** — the differentiator; Dream Funding integration
5. **Module 2: Budget Modes** — polish layer on top of cashflow
6. **Module 8: Values-Aligned Spending** — engagement driver; builds habits
7. **Module 6: Household Money** — requires Family OS to be stable
8. **Module 7: IPS** — requires legal review first
9. **Module 9: Financial Check-in Integration** — wires the other modules together

---

## Change Receipts

| Date | Change | Author |
|---|---|---|
| 2026-04-03 | Initial draft — elevated from AMENDMENT_21 Layer 12; full module breakdown; regulatory constraints; revenue model | Claude |
