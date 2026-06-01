BuilderOS Remediation: AMENDMENT_01_AI_COUNCIL - Phase 2: Custom BPE Tokenizer (G4)
Blueprint Enhancement Memo for `docs/projects/AMENDMENT_01_AI_COUNCIL.md`
Relevant Section Summary: Phase 2: Custom BPE tokenizer on LifeOS codebase (FUTURE — needs budget) `[safe]`
This memo outlines the next buildable slice for the Custom BPE Tokenizer project, addressing the 'FUTURE — needs budget' constraint by focusing on preparatory work.
---
1. Blocking Ambiguity or Founder Decision List
-   Budget Allocation: Founder decision required to allocate budget for Phase 2 implementation of the Custom BPE Tokenizer. This is the primary blocker.
-   Tokenizer Specification: Detailed technical requirements for the BPE tokenizer (e.g., target vocabulary size, desired tokenization granularity, performance metrics, specific integration points within LifeOS).
-   Library vs. Custom Build: Decision on whether to leverage an existing, Node-compatible BPE library (e.g., via FFI) or to develop a pure JS custom implementation.
-   Training Data Source: Confirmation of specific, anonymized LifeOS data sources suitable for training the BPE tokenizer.
2. Already-Settled Constraints
-   Target System: Custom BPE tokenizer to be integrated with the LifeOS codebase.
-   Execution Scope: BuilderOS-only governed loop execution for development and deployment.
-   Impact Scope: No modification of LifeOS user features or TSOS customer-facing surfaces during this phase.
-   Safety: The project phase is marked `[safe]`, indicating it is within approved scope once budget and detailed specification are in place.
3. Smallest Buildable Next Slice
Phase 2.1: Tokenizer Requirements Definition & Tooling Research
This slice focuses on defining the technical foundation and exploring implementation options without incurring significant development costs or modifying production code.
-   Task 2.1.1: Technical Specification Draft:
    -   Define precise input/output formats for the BPE tokenizer (e.g., string input, array of token IDs output).
    -   Outline performance targets (e.g., tokenization speed per character, memory footprint).
    -   Identify potential integration points within LifeOS where tokenization will occur.
-   Task 2.1.2: BPE Library Research:
    -   Investigate existing Node-compatible BPE tokenizer libraries. Evaluate their features, performance, licensing, and ease of integration.
    -   Assess feasibility of using WebAssembly or native Node addons for performance-critical components if a pure JS solution is insufficient.
-   Task 2.1.3: Training Data Identification:
    -   Identify and document potential anonymized text data sources within LifeOS suitable for training the BPE model.
    -   Outline data preprocessing steps required for tokenizer training.
4. Exact Safe-Scope Files BuilderOS Should Touch First
During Phase 2.1, BuilderOS should primarily interact with documentation and specification files. No source code modifications are expected.
-   `docs/projects/builderos-remediation/amendment-01-ai-council-todo-4-g4.md` (this file)
-   `docs/specs/bpe-tokenizer-v1.md` (new file for detailed technical specification)
-   `docs/research/bpe-library-evaluation.md` (new file for library research findings)
-   `docs/data/bpe-training-data-sources.md` (new file for training data identification)
5. Required Verifier/Runtime Checks
-   Verifier Checks (for Phase 2.1 outputs):
    -   Documentation Format: Ensure all new `.md` files adhere to established Markdown linting rules and project documentation standards.
    -   Content Completeness: Verify that `docs/specs/bpe-tokenizer-v1.md` includes all required sections (input/output, performance, integration points).
    -   Scope Adherence: Confirm no modifications to `src/` or `lib/` directories.
-   Runtime Checks (for future implementation phases, but critical for planning):
    -   Tokenization Accuracy: Evaluate the BPE tokenizer's ability to segment text into meaningful tokens, minimizing out-of-vocabulary (OOV) tokens.
    -   Performance Benchmarks: Measure tokenization speed and memory usage against defined targets.
    -   Integration Tests: Verify seamless operation when integrated with mock LifeOS components.
6. Stop Conditions
-   Completion and approval of `docs/specs/bpe-tokenizer-v1.md`.
-   Completion and approval of `docs/research/bpe-library-evaluation.md`.
-   Completion and approval of `docs/data/bpe-training-data-sources.md`.
-   Founder decision on budget allocation for subsequent implementation phases.
-   Creation of a new BuilderOS task for "Phase 2.2: Custom BPE Tokenizer Implementation".