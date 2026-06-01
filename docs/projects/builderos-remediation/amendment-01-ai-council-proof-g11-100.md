# Amendment 01: AI Council - Proof G11-100: Foundational Configuration Establishment

This document outlines the proof-closing blueprint note for establishing the foundational configuration mechanism for the AI Council within BuilderOS, addressing proof point G11-100 as derived from `AMENDMENT_01_AI_COUNCIL.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS platform lacks a defined, loadable, and validated configuration schema for the AI Council. The proof gap is the absence of a robust mechanism to define and integrate the AI Council's operational parameters (e.g., member roles, decision thresholds, logging preferences) into the BuilderOS runtime environment. This build slice aims to establish the initial configuration structure and loading utility, proving that BuilderOS can recognize and utilize AI Council-specific settings.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated JSON schema for the AI Council's core configuration and a corresponding utility to load and validate this configuration during BuilderOS initialization. This slice focuses solely on the *presence* and *validity* of the configuration, not its active use or enforcement.

### 3. Exact Safe-Scope Files to Touch First

*   `builder-os/config/schemas/aiCouncilConfig.schema.json` (New file): Defines the JSON schema for the AI Council configuration.
*   `builder-os/lib/config/aiCouncilConfigLoader.js` (New file): A utility module responsible for loading and validating `aiCouncilConfig.json` against its schema.
*   `builder-os/core/init.js` (Extend existing): Integrate a call to `aiCouncilConfigLoader.js` during BuilderOS startup to load the configuration into the global `BuilderOS.config` object.
*   `builder-os/config/aiCouncilConfig.json` (New file, example/default config): A default or example configuration file for the AI Council, adhering to the new schema.

### 4. Verifier/Runtime Checks

*   **Unit Test (`aiCouncilConfigLoader.js`):**
    *   Verify that `aiCouncilConfigLoader.js` successfully loads a valid `aiCouncilConfig.json` and returns the parsed object.
    *   Verify that