<!-- SYNOPSIS: Binding operating doctrine for Three Creations, free-first intelligence routing, and 1+1=3 problem recovery. -->
# Intelligence Economy + Three Creations Doctrine

**Ratified:** 2026-08-22  
**Authority:** Founder direction, 2026-08-22  
**Scope:** BuilderOS 1 (Abbott), product blueprinting, factory construction, recovery, model routing, and AI Council work  
**Subordinate to:** `docs/constitution/NORTH_STAR_SSOT.md`  
**Machine contract:** `builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json`

## 1. The Three Creations

Every substantial product is created three times.

### Creation I — Intention / Dream
Founder + high-intelligence collaborators define what should exist, why it matters, desired experience/outcome, unconstrained possibilities, future implications, and important alternatives. Premature implementation constraints must not collapse the possibility space before intention is understood.

### Creation II — Blueprint
Architecture converts intention into an executable decision tree: measured Point A, explicit Point B, architecture, dependencies, alternative branches, failure branches, acceptance, recovery paths, history/provenance, governance, and sufficient decomposition that construction can be performed reliably by lower-cost intelligence.

A repeated construction failure is evidence to test whether Creation II failed to decompose or specify the slice sufficiently; it is not automatically evidence that the worker model is too weak.

### Creation III — Construction + Proof
Factories traverse the pre-authored blueprint. Construction should preferentially use the least expensive proven-capable intelligence, bounded instructions, independent verification, SENTRY, receipts, and governed escalation. Factories do not replace Creation II by inventing architecture while building.

## 2. Free-first intelligence economy

During development, zero-dollar inference is the first resource pool.

**Hard rule:** A paid model may not be selected for ordinary construction, debugging, audit, or recovery while an available free model that is not proven incapable for that failure/task class remains untried under the current failure history.

Free does not mean weak. Capability must be learned by evidence, not inferred from price.

Model routing uses two distinct scores:

- `external_expectation`: research-based prior; always labeled UNPROVEN/PROVISIONAL until internal evidence exists.
- `lifeos_proven`: internal evidence from receipts and outcomes; becomes the authority for routing by task class.

Every model/version should be rotated through bounded roles until enough evidence exists to specialize routing. Roles include builder, debugger, blueprint reviewer, governance auditor, adversarial reviewer, root-cause investigator, acceptance reviewer, long-context analyst, and recovery collaborator.

Track at minimum: first-pass success, eventual success, SENTRY rejection rate, governance violations, repeated-failure rate, unsupported assumptions, debugging recovery, architecture/reasoning performance, useful dissent, context handling, latency, free-quota consumption, and cost when nonzero.

## 3. Problem => 1+1=3

A material problem is a trigger for collaborative intelligence, not merely another independent retry.

On the first substantive failure, preserve the failure history and invoke at least two independent model perspectives when available in the free pool. Their job is to examine different possible causes, challenge assumptions, identify missing evidence, and propose materially different strategies.

The existing locked escalation contract remains controlling for failure-count thresholds and higher escalation:
`builderos-reboot/LOOP_ESCALATION_CONTRACT.json`.

The 1+1=3 obligation means:

1. independent analysis before synthesis;
2. shared exact failure history after independent passes;
3. explicit hidden-alternative search;
4. genuine dissent encouraged, fabricated dissent forbidden;
5. synthesis must improve the strategy rather than average answers;
6. recovery must change strategy when the same failure signature repeats;
7. no recovery fix ships without the consensus required by the escalation contract.

Free models satisfy this obligation during development. Paid/high models are not required merely to perform 1+1=3.

## 4. Paid model boundary

Paid intelligence is a scarce resource. It is most valuable where cognition itself is the bottleneck, especially:

- Creation I future thinking and impossible-room exploration;
- Creation II blueprint architecture and adversarial completeness review;
- high-impact consequence analysis;
- failure classes where the free pool has been genuinely exhausted or proven incapable;
- final challenge/review on unusually high-impact or irreversible work.

Before crossing from free to paid, the system must produce a `PAID_ESCALATION_RECEIPT` proving:

- applicable free candidates considered;
- which were unavailable, quota-exhausted, or proven incapable for this task/failure class;
- shared failure history was preserved;
- 1+1=3 was performed with the available free pool;
- the selected paid model is the lowest-cost known model reasonably capable of the unresolved class;
- expected value justifies spend.

No receipt => no paid model call from governed BuilderOS recovery/construction paths.

## 5. Lower-model prevention test

When a stronger intelligence fixes a lower-model mistake, the required learning question is:

**Could a better blueprint, stronger verifier, clearer evidence packet, narrower slice, deterministic template, or harder governance gate have prevented the lower model from making the mistake?**

If yes, fix that systemic cause first. Do not encode "use a smarter model" as the primary repair when a deterministic or governance solution can make the mistake impossible.

This is how BuilderOS learns the minimum intelligence required for each class of work.

## 6. Anti-drift loading rule

Fresh Conductor/ChatGPT and BuilderOS control-plane contexts must load:

1. `docs/CHATGPT_CONTEXT_CAPSULE.md`
2. `builderos-reboot/POINT_B_TARGET.json`
3. `builderos-reboot/LOOP_ESCALATION_CONTRACT.json`
4. `builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json`
5. current mission Founder Packet / Blueprint / latest receipts

A routing/retry decision made without these applicable controls is governance-invalid.
