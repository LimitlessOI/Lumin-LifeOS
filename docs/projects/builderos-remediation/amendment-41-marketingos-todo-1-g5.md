# Amendment 41 MarketingOS Remediation: Todo 1 (G5) - Blueprint Enhancement Memo

This memo addresses the current blocking state of `AMENDMENT_41_MARKETINGOS.md` and outlines the smallest buildable next slice for BuilderOS.

## 1. Blocking Ambiguity / Founder Decision List

The following decisions from §12 OPEN section of `AMENDMENT_41_MARKETINGOS.md` are pending Adam's input and block further implementation:

*   **Pricing Lead:** Decision on the primary pricing lead strategy.
*   **First Vertical:** Identification of the initial market vertical to target.
*   **Amendment 23 Relationship:** Clarification on the relationship and dependencies with Amendment 23.
*   **Phase 5 Publisher:** Definition and scope of the Phase 5 publisher requirements.
*   **Phase 0 Intake Form:** Specification for the initial intake form (structure, fields, purpose).

## 2. Already-Settled Constraints

*   Execution is governed solely by BuilderOS loops.
*   No modifications to LifeOS user features or TSOS customer-facing surfaces are permitted.
*   Implementation must strictly adhere to approved builder safe scope.
*   Focus remains implementation-oriented, not marketing-oriented.

## 3. Smallest Buildable Next Slice

The smallest buildable next slice focuses on preparing the foundational structure for the "Phase 0 Intake Form" decision, as it represents the earliest phase and a critical initial data collection point for MarketingOS. This slice will define a preliminary JSON schema for the *definition* of the intake form itself, allowing for its structure to be templated and validated once Adam's specific requirements are provided. This does not implement the form, but prepares the system to receive its definition.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

BuilderOS should create the following new files to establish the foundational schema for the Phase 0 Intake Form definition:

*   `docs/schemas/marketingos/phase0-intake-form-definition.json`: A new JSON schema file to define the structure and validation rules for how a Phase 0 Intake Form *is described*. This schema will serve as a template for future form definitions.
*   `docs/projects/builderos-remediation/amendment-41-marketingos-todo-2-gX.md`: The next remediation memo, which will outline the steps to implement the form based on the `phase0-intake-form-definition.json` once the founder decision is made.

## 5. Required Verifier/Runtime Checks

*   **Schema Validation:** Ensure `docs/schemas/marketingos/phase0-intake-form-definition.json` is a valid JSON schema.
*   **Linter Checks:** Apply standard linting to all new and modified documentation files.
*   **Scope Adherence:** Verify that no changes are introduced outside the specified safe scope (e.g., no direct modifications to LifeOS/TSOS code).
*   **No Feature Implementation:** Confirm that this slice does not introduce any functional user-facing features or UI elements.

## 6. Stop Conditions

This BuilderOS task is complete when:

*   The `docs/schemas/marketingos/phase0-intake-form-definition.json` file is created, containing a valid, preliminary schema for intake form definitions.
*   The next remediation memo (`docs/projects/builderos-remediation/amendment-41-marketingos-todo-2-gX.md`) is generated, outlining the subsequent steps for form implementation.
*   All listed founder decisions are formally captured and documented, unblocking the primary `AMENDMENT_41_MARKETINGOS.md` blueprint.