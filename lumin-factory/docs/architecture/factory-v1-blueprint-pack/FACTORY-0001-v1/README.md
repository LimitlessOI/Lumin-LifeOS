<!-- SYNOPSIS: FACTORY-0001-v1 -->

# FACTORY-0001-v1

This directory is the exact BPB handoff pack for the first Factory v1 proof mission.

Purpose:
- provide one machine-first blueprint pack that a low-discretion Builder can execute
- provide one pack that GPT and Claude can audit in the SENTRY role
- provide one pack that can be compared against the current BPB output

Execution order:
1. `FOUNDER_PACKET.md`
2. `FOUNDER_PACKET_COMPLETENESS_CHECKLIST.md`
3. `PRODUCT_DEVELOPMENT_GATE.md`
4. `LESSONS_REGISTER.md`
5. `AUTHORITY_CHECK.json`
6. `SALVAGE_MAP.json`
7. `BLOCKED_RETURN_SCHEMA.json`
8. `ACCEPTANCE_TESTS.json`
9. `BLUEPRINT.json`

Builder should consume:
- `BLUEPRINT.json`
- `ACCEPTANCE_TESTS.json`
- `BLOCKED_RETURN_SCHEMA.json`

This pack is not a philosophy document. It is a constrained execution packet for the first proof mission only.

Important distinction:
- `FOUNDER_PACKET.md` is founder intent for this proof mission
- `FOUNDER_PACKET_COMPLETENESS_CHECKLIST.md` is the gate BPB should eventually require before blueprinting larger product missions
- `PRODUCT_DEVELOPMENT_GATE.md` is the pre-BPB gate that must stop strategic ambiguity
- `LESSONS_REGISTER.md` records what this thread and the old system already taught us
- `../FOUNDER_PACKET_TEMPLATE_V1.md` is the actual template a filled Founder Packet should follow
- `BLUEPRINT.json` is the actual Builder handoff

Freeze blockers already addressed in this version:
- Builder writes must remain inside `factory-v1/`
- proof execution acceptance tests come from a blueprint-owned registry, not request body
- SENTRY verifies exact file content where blueprint requires exact output

Honest proof-slice naming in this mission:
- Historian is only a receipt recorder
- TSOS is only a metrics recorder
