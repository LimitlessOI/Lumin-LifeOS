<!-- SYNOPSIS: LIP A–Z roadmap — Version 2 master adapted to Lumin stack (operator capital) -->

# Limitless Investment Protocol (LIP) — A-to-Z roadmap

**Short name:** **LIP** = **Limitless Investment Protocol** (Adam confirmed 2026-07-27; son interrupted mid-sentence — “I.P.” was not a rename)

**Status:** PLAN — Adam ratified direction 2026-07-27: implement **this investment project**, not a Notion/n8n system reboot.  
**Master source:** Version 2 A–Z sprint (A–V, ~32h historical estimate).  
**Canon?** Not NSSOT. Product lane: operator capital + paper/testnet first.  
**Constitutional fence:** LifeOS / Personal Finance OS forbid **consumer** personalized investment advice and “signals marketed as returns.” LIP here is **Adam’s own capital program** (testnet → capped live), not a public advisory product — until a licensed path exists.

---

## What we are doing (locked)

| # | Objective | Meaning on today’s stack |
|---|-----------|--------------------------|
| 1 | Command Center for LIP | Chair + council + Neon ledger — **not** new Notion swarm DB as SSOT |
| 2 | **LIP** (Limitless Investment Protocol) | Whole program: fleet + all sleeves + real-time + harvest |
| 2a | **Limitless Protocol** (sleeve) | See narrative/sea patterns early → classify → stake small → scale out / exit (*Limitless* movie metaphor) |
| 3 | Autonomy for LIP loop | Builder/factory may ship LIP code; **kill switch + spend caps** always human-overridable |

**Not doing:** Rebuild LifeOS on DigitalOcean + n8n + ClickUp as primary truth. Those are optional ops tools only.

---

## Fleet test doctrine (Adam 2026-07-27 — locked intent)

**Goal:** **Test everything.** Prove strategies across as many small accounts as we want — not capped at 100/lane. Multitude of strategies; parallel A/B across crypto, stocks, forex.

| Lane | Accounts | Funding per account | Notes |
|------|----------|---------------------|-------|
| **Crypto** | **Unbounded** (sim); live ramps later | Random **$300 – ~$2,000** | Testnet / paper first |
| **Stocks** | **Unbounded** (sim) | Same | Paper / sandbox first |
| **Forex** | **Unbounded** (sim) | Same | Demo first |
| **Total fleet** | **As many as needed** | | ≥1 account per strategy variant; replicate for statistical power |

**Adam 2026-07-27:** “I want to test everything. We can make as many freaking accounts as we want.” → **Logical/sim accounts are cheap.** Spawn a new `lip_accounts` row per hypothesis. Do not starve a strategy for lack of account slots.

### Test-everything rules

1. **Every strategy idea gets accounts** — including controls (SPY hold, BTC hold, cash).
2. **Replication:** prefer N≥20–50 accounts per strategy ID when comparing (noise averages out).
3. **No sacred 100:** 100/lane was a starting floor, not a ceiling.
4. **Live money still gated:** unbounded applies to **paper/sim** immediately; live cohort size = treasury + Go/No-Go, not ego.
5. **Kill losers, clone winners:** after enough trades, halt underperforming strategy_ids; spawn more accounts on winners (and house-money high R:R).

### Funding rules

1. **Seed capital:** each account gets a **random** bankroll in `[$300, ~$2000]` (uniform or mild skew — config later).
2. **House money:** once an account’s P&L is net positive above seed (“playing with house money”), unlock **higher risk / reward** strategies and **higher max notional** for that account only.
3. **Risk ladder:** until house money → conservative / medium strategies only; after house money → high R:R allowed within global kill-switch and per-lane caps.
4. **Strategy swarm:** many strategies in parallel. Track win-rate, drawdown, and kill per strategy ID.
5. **Harvest at $2k+:** when balance **exceeds $2,000**, withdraw down to a **new lower random target** in `[$300, ~$2000)`. Harvest → **treasury** → seed **more** accounts or other invests.
6. **Spawn from treasury:** new accounts created automatically when treasury ≥ seed band and a strategy needs more statistical power.

### Real-time market requirement (locked)

All fleet accounts mark to **true real-time** (or near-real-time) market data — not EOD-only as the live loop.

| Lane | Real-time path (target) |
|------|-------------------------|
| Crypto | Exchange WS / REST ticker |
| Stocks | Broker streaming or low-latency quote API |
| Forex | Broker/FX feed streaming |

**Sim fleet** marks to **live** prices (1–5s poll or WS). Historical bars = research only.

### Capital math (KNOW — approximate)

| Scenario | Math |
|----------|------|
| Midpoint ~$1,150 × N accounts | **~$1.15k × N** if all live |
| 300 live | ~$90k–$600k band |
| 1,000 live | ~$300k–$2M band |

**Sim:** N can be thousands with near-zero marginal cost. **Live:** N limited by real dollars + broker ToS — ramp via harvest/treasury.

### Account reality (honest)

| Mode | What it means |
|------|----------------|
| **Sim/paper (default — unbounded)** | Neon `lip_accounts` — spawn freely; no KYC wall |
| **Exchange/broker live** | Real KYC/ToS/cash — **slow ramp** |
| **Logical partitions** | One legal entity + many ledger accounts preferred |

Devil’s advocate: Unlimited **live** accounts without treasury discipline = capital death. Unlimited **sim** accounts = how we find what deserves live money.

**Lane research:** … **historical identify** → `50_`; **pattern encyclopedia (dump timing, % ups)** → `60_PD_PATTERN_ENCYCLOPEDIA.md`.







---

## Strategy: Congress trade mirror (stocks lane)

**Verdict (KNOW):** Yes — public services and APIs exist that parse STOCK Act disclosures so you can **follow and size-copy disclosed Congress trades**. Claims are real; the hard limit is **disclosure lag**, not “is the data available.”

### How it actually works

1. Member (or spouse) trades on day 0.
2. STOCK Act: file Periodic Transaction Report within **45 days** (often late; enforcement weak).
3. Filing appears on House Clerk / Senate EFD portals (often PDFs).
4. Aggregators parse → ticker, buy/sell, amount **range**, report date, transaction date.
5. We react to **disclosure**, not to the original fill — so this is **disclosure-real-time**, not insider-real-time.

### Providers (examples)

| Source | Role |
|--------|------|
| [House disclosures](https://disclosures-clerk.house.gov/) / [Senate EFD](https://efdsearch.senate.gov/) | Official free source |
| [Quiver Quantitative Congress API](https://api.quiverquant.com/datasets/congress-trades) | Paid API; Bearer key; historical + new filings |
| Unusual Whales / similar | Consumer + API-ish politician trade feeds |
| [capitol-api](https://github.com/crnicholson/capitol-api) (OSS) | Self-host House PTR parse |
| GovGreed / TraderCongress-class sites | Dashboards + some APIs |

### How we do it in LIP

| Step | Implementation |
|------|----------------|
| Ingest | Poll Quiver (or OSS House parse) on a short cron; store `lip_congress_disclosures` |
| Signal | Map to `lip_signals` strategy_id=`congress_mirror` |
| Assign | Route to a **subset of stock-lane accounts** (not all 100 blindly) |
| Execute | Against **live** stock quotes (real-time mark); paper first |
| Filters | Prefer large ranges, clustered members, purchase over sale; skip stale if price already moved X% since transaction date |
| Honesty label | KNOW: we copy **disclosed** trades; GUESS: alpha after 1–45 day lag |

Devil’s advocate: Many “copy Congress” products sell the romance; after lag, edge is often **pattern / committee / herd**, not magic fills. Still worth a dedicated strategy column in the swarm.

Gate **G6:** Congress mirror is stocks-lane only; never market as consumer advice.

---

## Tooling remapping (Version 2 → Lumin)

| Version 2 tool | Use now |
|----------------|---------|
| Notion Swarm DB | Neon tables `lip_*` + Founder Decoder calm view |
| Meta-Log | `lip_events` JSONL/Neon + Continuity Log |
| n8n on DO | Railway routes + schedulers + `createUsefulWorkGuard` |
| Replit sandbox | Isolated `services/lip-*` + paper/testnet APIs |
| Slack copilot-dev | Founder SMS / Chair channel (optional Slack later) |
| ClickUp A–Z list | This file + `BUILD_QUEUE` for LIP when coding |
| Binance 4–5 accounts | Superseded by **fleet doctrine** (≥100 crypto logical; testnet first) |
| lifeos-core separate repo | Stay in **Lumin-LifeOS** product folder |

---

## Phased roadmap (A–V adapted)

### Phase 0 — Gates before money (Adam, ~1h)

| Gate | Requirement |
|------|-------------|
| G0 | Written kill switch: max daily loss $, max position $, testnet/paper-only until Adam flips flag |
| G1 | Keys in Railway vault only — never chat |
| G2 | “Not investment advice / operator capital only” disclaimer in every LIP UI surface |
| G3 | Paper or exchange **testnet** proves 10 simulated trades before any live $ |
| G4 | Fleet: **unbounded sim** accounts; spawn per strategy; ≥20–50 replicas when comparing; live N gated by treasury + Go |
| G5 | House-money unlock only after net profit above seed; high R:R strategies gated behind that flag |
| G6 | Harvest when balance > $2k → random lower seed; treasury for new accounts / other invests |
| G7 | Live loop marks to **real-time** market data (all lanes); EOD only for research |
| G8 | Congress mirror = disclosure ingest (Quiver/OSS) → stock subset; paper before live |

### Phase 1 — Setup (maps A–E)

| Task | Owner | Modern steps | Done |
|------|-------|--------------|------|
| **A** Charter | Adam | Add LIP charter to this file + Continuity Log; non-goals = no consumer signals product | ☐ |
| **B** Comms/repos | Cursor/system | Product home stub + BUILD_QUEUE slice list under `docs/products/lip/` | ☐ |
| **C** Keys | Adam | CoinGecko/exchange feeds + Binance **testnet**; optional **Quiver** (or equiv) for Congress mirror | ☐ |
| **D** Data model | Builder | Neon: `lip_accounts` (+ harvest fields), `lip_treasury`, `lip_signals`, `lip_congress_disclosures`, `lip_trades`, `lip_strategies`, `lip_meta_events` | ☐ |
| **E** Runtime | System | Routes under `/api/v1/lip/*` on Railway; health + kill-switch flag | ☐ |

### Phase 2 — Consensus & trading loop (maps F–M)

| Task | Modern meaning |
|------|----------------|
| **F** Alerts | Chair/SMS when confidence &lt; threshold or ethical risk high |
| **G** Context ingest | Optional URL/news → short summary → `lip_meta_events` |
| **H** Consensus | Council preset “lip-trade-review”: multi-model argue → confidence / proponent / critic / unintended |
| **I** Self-doc | Every consensus run writes meta receipt |
| **J** Inertia & dignity gates | Halt if confidence &lt; min or dignity score &lt; 8 |
| **K** Market data | Cron Coingecko (or exchange) → volatility/sentiment row |
| **L** Sandbox | Always run testnet or paper before any live POST |
| **M** Trader module | Place order **only** if: consensus ≥80% AND kill switch off AND sandbox pass AND size within cap |

### Phase 3 — Safety & autonomy (maps N–V)

| Task | Modern meaning |
|------|----------------|
| **N** Ethical reinvest flag | Optional: earmark % of profit to token/API budget — logged |
| **O** Cost + kill switch | Daily AI+fee spend + hard halt |
| **P** Backups | Nightly export `lip_*` receipts to storage |
| **Q** Decompose | Complex prompts → small BUILD_QUEUE tasks |
| **R** UAT dry-run | Full path: signal → consensus → sandbox → Notion-equivalent UI → alert |
| **S** Go/No-Go | Adam only: one capped live trade after 10 clean testnet |
| **T** Post-mortem | Auto analyze last trade meta → 3 fix proposals |
| **U** Autonomy milestones | Unlock higher auto % only after win-rate thresholds |
| **V** Lock & handoff | Archive this sprint + tip SHA in Continuity Log |

---

## First build slice (exactly one when Adam says go)

**LIP-0:** Schema + kill switch + Coingecko poll + **unbounded fleet seeder** (spawn N accounts per strategy across crypto/stocks/forex, random $300–~$2k) + paper signal row + Founder calm “LIP status” (account count, strategy leaderboard, house-money, treasury).  
No live orders. No consumer UI. Prove loop + infinite-sim ledger.

Devil’s advocate: Crypto/stock/FX APIs + autonomy invite loss and regulatory creep — hence paper fleet, testnet, caps, and “operator capital only.”

---

## Honest time (vs Version 2’s 32h)

Version 2 assumed greenfield Notion/n8n. On Lumin:

| Band | Estimate |
|------|----------|
| LIP-0 (schema + fleet seeder + poll + paper + kill) | 1–2 days |
| Multi-strategy assign + consensus + sandbox | 1–2 weeks |
| Live cohort (5–10 real) after 10 clean testnet | Adam Go only |
| Scale toward 100 live per lane | After house-money proof + broker ToS path |

---

## Relationship to Personal Finance OS

| PFOS | LIP |
|------|-----|
| User clarity, IPS, **no advice** | Adam’s **own** automated capital experiments |
| Consumer-safe | Operator-only until licensed |

Do **not** merge LIP “signals” into LifeOS consumer surfaces.

---

*Version 2 original Notion/n8n text preserved in conversation dump; this file is the execution master.*
