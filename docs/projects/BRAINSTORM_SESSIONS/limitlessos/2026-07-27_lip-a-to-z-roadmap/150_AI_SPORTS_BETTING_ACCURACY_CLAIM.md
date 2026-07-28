<!-- SYNOPSIS: AI sports betting “65–75% accurate” — truth vs fallacy -->

# AI sports betting accuracy claim — research verdict

**Claim:** “AI has proven to be 65–75% correct on sports betting.”  
**Verdict:** **Mostly a fallacy / marketing mix-up** if it means “AI beats books and prints money at that hit rate.”  
**Kernel of truth:** Favorites (and models that pick favorites) often land in that band on **moneyline winners** — that is **not** the same as a betting edge.

---

## Why 65–75% sounds true but misleads

1. **Favorites already win ~65–70% of NFL/NBA moneylines** (market baseline). A dumb “always bet the favorite” bot can claim ~65–70% “accuracy” and **still lose** after the juice (−110, −150, −200, etc.).  
2. **Against the spread (ATS)** lines are built to be ~50/50. Serious published ranges for skilled models are often about **53–58% ATS** over large samples — not 65–75%.  
3. **Break-even at −110** is roughly **52.4%** win rate. Profit is about **edge vs the price**, not raw accuracy.  
4. **Accuracy ≠ profit.** Academic work shows high-accuracy models can **lose money**; **calibration** (when you say 60%, it hits ~60%) and **value vs odds** matter more.

### Academic / careful evidence (KNOW-ish)

| Source | Finding |
|--------|---------|
| Walsh & Joshi, *Machine learning for sports betting…* (NBA, arXiv 2303.06021 / journal 2024) | Accuracy ~**64%** on games; accuracy-optimized betting **avg ROI −35%**; calibration-optimized **avg ROI ~+35%** in their season experiment — shows accuracy is the wrong north star |
| “Accuracy Without Profit” (EPL walk-forward) | Models ~**51–53%** accuracy; highest accuracy had **worst** PnL; alpha decay post-2015 |
| Market-efficiency football ML papers | Some historical inefficiencies / ROI in older windows; **edges shrink** as markets learn |

### Marketing claims (treat as GUESS / sales)

Vendor/blog lines like “AI now 70–85% accurate vs old 50–60%” (e.g. WSC Sports / reseller blogs) **do not** equal peer-reviewed proof that retail AI beat closing lines at 65–75% ATS. Often circular citation of “industry analysts.”

---

## Plain English

| Statement | True or false? |
|-----------|----------------|
| “AI is proven 65–75% correct at sports betting” as a general fact | **False / overstated** |
| “Some models pick moneyline winners ~65% because favorites win that often” | **Often true — and not impressive** |
| “Good AI always makes you rich at 65–75% hit rate” | **False** |
| “ML can sometimes find edges; ROI and CLV matter; edges decay” | **True** |
| “ChatGPT is proven 65–75% at beating Vegas” | **No evidence** |

---

## If LIP ever tests sports

Require: published ledger, **ROI + CLV**, calibration, walk-forward (no look-ahead), costs/vig in, stretch sleeve only. Ignore “% correct” ads.

**Labels:** KNOW = favorite baselines + break-even math + accuracy≠profit literature. THINK = 53–58% ATS is a realistic “skilled” band. DON’T KNOW = any specific vendor’s unaudited 75% claim.
