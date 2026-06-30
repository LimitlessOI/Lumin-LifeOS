<!-- SYNOPSIS: Founder Usability Contract -->

# Founder Usability Contract

Schema: `founder_usability_contract_v2`

Authority owner: `SDO`

Canonical product authority:
- `docs/products/lifere/PRODUCT_HOME.md`
- `docs/products/lifere/FOUNDER_USABILITY_CONTRACT.md`

Historical alias:
- `docs/products/PRODUCT-LIFERE-OS-V1-0001/FOUNDER_USABILITY_CONTRACT.md`
- Historical alias is readable for salvage only. New authority writes must target this file.

Purpose:
Founder alpha may be technically ready while still failing founder usability. This contract defines what must be true before LifeRE can move from technical pass to founder usability pass.

Hard rules:

- Technical pass is not founder pass.
- `ready_for_founder_alpha` is not `point_b_complete`.
- Counsel questions must not route into queue/status theater.
- Founder-facing PASS language must match real UI behavior and real receipts.
- Console errors are fail-closed unless explicitly allowlisted by named justification.
- Founder usability PASS requires explicit founder confirmation evidence, not technical proxy only.

Required founder-surface qualities:

- Response quality:
  Lumin answers normal knowledge/counsel prompts directly, with no fake execution claims and no queue-display substitution.
- Conversation flow:
  The founder can move between advice, product questions, and build requests without losing the shell or being forced into the wrong mode.
- Responsiveness:
  The visible interface must show progress or answer within a reasonable interaction loop; long silent gaps are usability failures even when backend work eventually succeeds.
- Adaptive surface behavior:
  LifeOS may change surface layout, but the founder must still be able to understand what changed and keep using the system without hidden controls or broken navigation.
- Build honesty:
  If a build is not live yet, the founder-visible receipt must say so explicitly.

Measurable thresholds:

- First visible feedback within `<= 5s`.
- Final result within `<= 90s` soft limit unless visible progress is shown.
- No generic-counsel misroute on frozen founder corpus.
- No hidden loss of send/mic/core founder controls during the tested flow.

Allowed response classes:

- `COUNSEL`
- `BUILD`
- `REPAIR`
- `STATUS`

Forbidden response classes:

- queue/status theater instead of direct answer
- fake success without receipt/proof
- proxy proof substituted for real founder-path result

Minimum proof for founder usability PASS:

- `products/receipts/REAL_APP_E2E.json` is PASS.
- `products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json` is PASS.
- `products/receipts/UI_ALPHA_GATE.json` is PASS or `CLEARED_FOR_FOUNDER_ALPHA`.
- `products/receipts/LIFERE_ALPHA_READINESS.json` shows `ready_for_alpha_testing=true`.
- `products/receipts/MACHINE_ALPHA_WALKTHROUGH.json` is PASS.
- Founder confirms PASS with a 12+ character quote through the governed confirm path.

Explicit failure examples:

- A generic question returns queue/status theater instead of a direct answer.
- The shell loses the mic/send path or drawer controls needed for normal use.
- The app logs unallowlisted `console.error` or page errors during core founder flows.
- A receipt says PASS while transport proof is `COMMIT_ONLY_NOT_LIVE`, `DEPLOY_NOT_SYNCED`, or `LIVE_BEHAVIOR_NOT_VERIFIED`.
- Point B or Alpha is claimed complete before founder confirmation.
