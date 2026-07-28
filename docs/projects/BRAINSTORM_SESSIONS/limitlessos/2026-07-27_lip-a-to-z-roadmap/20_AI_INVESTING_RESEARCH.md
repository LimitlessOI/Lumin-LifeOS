<!-- SYNOPSIS: Research — is AI ~4× better at investing; recommended LIP strategy stack -->

# AI vs humans on investing — what research actually says

**Date:** 2026-07-27 · Operator research for LIP · Not advice

## The “4× / 6× better” claim

| Source | Claim | What it really is |
|--------|-------|-------------------|
| Stanford / deHaan-style coverage (2025) | AI beat **93%** of mutual fund managers by avg **~600%** more alpha | Lab sim: AI **tweaks** existing fund portfolios quarterly with public info (1990–2020). Not a retail bot trading live. “600%” = more *alpha dollars*, not “your account ×6.” |
| UChicago GPT-4 financial statements (2024) | LLM beats analysts on **earnings direction**; long-short shows high Sharpe / ~12%+ FF3 alpha in paper | Controlled, anonymized statements; paper strategy ≠ live retail with costs |
| MarketSenseAI / GPT-4 (S&P 100, ~15 mo) | Reported **10–30% excess** in study window | Short sample; research conditions |
| NBER AI hedge funds | Early AI funds beat non-AI; **edge faded after ~2017** as AI spread | Alpha gets competed away |
| Morningstar on AI ETFs | Most AI ETFs **underperformed** cheap total-market; many closed | Live products with fees/turnover lose |
| Retail AI bot contests / 2026 reviews | No reliable proof bots beat buy-and-hold after costs | Emotion removal + research speed = real; free alpha = not |

**Verdict:** “AI is 4× better at investing” is **marketing shorthand for a few academic sims**, not a proven law for live LIP. Stronger, durable finding: **AI + human process** (screening, rules, risk) beats either alone; pure autonomous LLM “vibe trading” is weak.

---

## What I would do for LIP (best strategy stack)

**Principle:** AI as **analyst + swarm coach**, not unsupervised tipster. Execution = deterministic rules + kill switch + real-time marks.  
**Adam:** test **everything**; **as many accounts as we want** (sim unbounded).

| Sleeve | Accounts | Role |
|--------|----------|------|
| **1. Benchmark** | N (e.g. 50+) | Hold SPY / QQQ / BTC — truth every other sleeve must beat |
| **2. Disclosure bump** | N | Buy on PTR → sell after measured bump |
| **3. Congress+contract** | N | Breadcrumb + USASpending / award watch |
| **4. AI fundamentals rank** | N | Filings → long/short, monthly |
| **5. Quant rules** | N per variant | Momentum / mean-rev / vol — no LLM in order path |
| **6. House-money high R:R** | N (gated) | Only after harvest unlock |
| **7+ New ideas** | Spawn freely | Every hypothesis gets replicas; kill losers, clone winners |

**Crypto / FX:** same pattern — own benchmarks, own strategy IDs, unlimited sim accounts.

**Non-negotiables**
1. Walk-forward backtest with **realistic costs** before live  
2. Pre-register strategies (no picking winners after the fact)  
3. LLM proposes / ranks; **code** places orders  
4. Kill switch + daily loss cap + harvest-at-$2k  
5. Score sleeves on **alpha vs benchmark**, not absolute $ alone  
6. **Sim N unbounded; live N = treasury**
