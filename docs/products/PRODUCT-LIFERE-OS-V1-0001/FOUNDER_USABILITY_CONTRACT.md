<!-- SYNOPSIS: Founder Usability Contract -->

# Founder Usability Contract

Schema: `founder_usability_contract_v1`

Authority owner: `SDO`

Purpose:
Founder alpha may be technically ready while still failing founder usability. This contract defines what must be true before LifeRE can move from technical pass to founder usability pass.

Hard rules:

- Technical pass is not founder pass.
- `ready_for_founder_alpha` is not `point_b_complete`.
- Counsel questions must not route into queue/status theater.
- Founder-facing PASS language must match real UI behavior and real receipts.
- Console errors are fail-closed unless explicitly allowlisted by named justification.

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

Minimum proof for founder usability PASS:

- `products/receipts/REAL_APP_E2E.json` is PASS.
- `products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json` is PASS.
- `products/receipts/UI_ALPHA_GATE.json` is PASS or `CLEARED_FOR_FOUNDER_ALPHA`.
- `products/receipts/LIFERE_ALPHA_READINESS.json` shows `ready_for_alpha_testing=true`.
- `products/receipts/MACHINE_ALPHA_WALKTHROUGH.json` is PASS — machine ran `npm run lifeos:machine-alpha-walkthrough` and all 12 founder-path steps passed (app loads, LifeRE daily cycle, Lumin counsel returns plain prose, build command routes coherently, Point B status reachable).
- Founder confirms PASS with a 12+ character quote through the governed confirm path.

Explicit failure examples:

- A generic question returns queue/status theater instead of a direct answer.
- The shell loses the mic/send path or drawer controls needed for normal use.
- The app logs unallowlisted `console.error` or page errors during core founder flows.
- A receipt says PASS while transport proof is `COMMIT_ONLY_NOT_LIVE`, `DEPLOY_NOT_SYNCED`, or `LIVE_BEHAVIOR_NOT_VERIFIED`.
- Point B or Alpha is claimed complete before founder confirmation.
