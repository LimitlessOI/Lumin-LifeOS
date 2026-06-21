<!-- SYNOPSIS: Documentation — PBB PRIORITIZATION PASS. -->

PBB_PRIORITIZATION_PASS.md

## PBB Prioritization Pass

### 1. Merge and Compression Pass
This pass consolidates the Builder blueprint, currently in `FOUNDER_REVIEW` with five unresolved decisions. The objective is to reduce the architectural surface area and clarify interdependencies, ensuring a lean, provable design. We aim to integrate existing components like `worktree isolation` and `headless Claude Code execution` into a cohesive, receipt-driven framework. This compression is critical for managing complexity before freezing the PBB. (KNOW: BLDR-PBB-001)

### 2. PBB Tier Assessment
The CC tiers provide a useful framework, but require filtering through the lens of "survivability over complexity." T0 items are non-negotiable for foundational integrity, directly addressing core trust and operational safety. T5 items, however, are explicitly rejected as they introduce unmanageable complexity without a proportional increase in survivability, often relying on unproven assumptions. The Builder system prioritizes