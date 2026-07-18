<!-- SYNOPSIS: Underpayment detection and forever-chase money recovery -->

# 06 — Underpayment & forever-chase

## Mandate (KNOW — Adam 2026-07-14)

Every birth that should have been paid by insurance and was not — and every claim that paid but not enough — stays open until:

1. Insurer pays enough, or  
2. Written no-liability denial, or  
3. Founder closes it  

Age is not a stop. Unknown → ask the insurer. Prior billing neglect is evidence, not a write-off.

## What “not enough” means

| Test | Formula | Action |
|------|---------|--------|
| vs Allowed | paid &lt; allowed − legitimate PR | Appeal / demand balance |
| vs Fee when no contract | paid &lt; practice expected | VERIFY strategy |
| Partial deny | some lines $0 | Line-level appeal |
| Silent underpay | ERA looks “paid” but short | Compare Allowed Amount report |

## Forever-chase system objects (product)

- Ledger seed / open `forever_chase` rows  
- `ask_insurer_forever` style next actions  
- Hands-off / SYSTEM work preference so Sherry isn’t the collector  

## Operational loop

1. List open insurance balances (Sent Bills + AR + Aging)  
2. For each: compute variance  
3. If unknown status → call/payer portal (document)  
4. If denied → appeal packet (records, correct claim)  
5. If underpaid → cite allowed/contract; demand  
6. If patient PR → bill patient / plan  
7. Never auto-close for age  

## Evidence still needed

- Payer contracts / fee schedules  
- Historical ERA samples with CARCs  
- Sherry’s definition of “paid enough” per package  
