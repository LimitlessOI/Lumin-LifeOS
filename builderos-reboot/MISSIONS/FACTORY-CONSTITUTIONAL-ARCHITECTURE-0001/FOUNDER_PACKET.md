<!-- SYNOPSIS: Founder packet — Constitutional Architecture mission. Verbal digital twin: what we are building and why. -->

# FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001

## What

Build the **Constitutional Framework** as a manufacturing process for constitutional law. The Constitution becomes one layer inside the framework; the framework also includes the promotion system, confidence model, evidence model, governance model, enforcement model, and a separate Constitutional Research Registry for candidates that are not yet authority.

## Why

We have been adding principles faster than we have been classifying them. We need a durable architecture that separates:
- what currently governs (authority hierarchy),
- how ideas earn authority (Knowledge Ladder),
- how confident we are (epistemic confidence vs. constitutional commitment),
- where candidates mature without governing (research registry),
- how products inherit but do not become sovereign (product governance, not product constitutions).

## Intended reality

- `docs/constitution/CONSTITUTIONAL_FRAMEWORK.md` is the canonical architecture document.
- `docs/constitution/CONSTITUTIONAL_PROCESSES.md` defines amendment, promotion, demotion, challenge, review, retirement, emergency change, dispute resolution.
- `data/constitutional-framework/REGISTRY.json` is the machine-readable authority registry.
- `data/constitutional-framework/RESEARCH_REGISTRY.json` is the research registry for candidates.
- `scripts/constitutional-framework.mjs` is the CLI for seed, verify, add, promote, demote, challenge, review, render, research-add, research-list.
- `NORTH_STAR_SSOT.md` §2.0M ratifies the framework, the two-score model, the office-not-role Chair, and the Level 0–7 authority hierarchy.
- The verifier is wired into `npm run builder:preflight`.
- The mission is accepted by `npm run builderos:constitutional-architecture:acceptance`.

## Boundaries

- No changes to protected server code unless a separate BUILD_QUEUE step requires it.
- This is a governance/authority-layer mission, not a product feature.
- Chair is an office, not a fixed model; current holder is Operating Doctrine, not constitutional law.
