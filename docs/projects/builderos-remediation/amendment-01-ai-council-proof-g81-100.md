Blueprint Note: Amendment 01 AI Council - Proof G81-100 Remediation
This note outlines the next smallest build slice to address the foundational requirements for AI Council policy record management, specifically targeting proof point `g81-100`.
1. Exact Missing Implementation or Proof Gap:
The current state lacks a defined, type-safe, and validated data structure for AI Council policy records, which is a prerequisite for `g81-100` (e.g., "Verify AI Council policy record creation and retrieval"). The immediate gap is the absence of a canonical schema and type definition for these records within the LifeOS platform.
2. Smallest Safe Build Slice to Close It:
Define the core TS interface and a corresponding Zod schema for `AICouncilPolicyRecord`. This slice focuses solely on establishing the data contract and validation mechanism without implementing persistence or complex business logic.
3. Exact Safe-Scope Files to Touch First:
-   `src/lib/ai-council/types.ts` (new file): Defines the `AICouncilPolicyRecord` interface.
-   `src/lib/ai-council/schemas.ts` (new file): Implements the `AICouncilPolicyRecordSchema` using Zod.
-   `src/lib/ai-council/index.ts` (new file): Exports the new types and schemas.
-   `src/lib/ai-council/ai-council.test.ts` (new file): Basic unit test for schema validation and type checking.
4. Verifier/Runtime Checks:
-   Type Check: Ensure `tsc` passes without errors when consuming `AICouncilPolicyRecord` in `ai-council.test.ts`.
-   Schema Validation: In `ai-council.test.ts`, create a valid `AICouncilPolicyRecord` object and assert that `AICouncilPolicyRecordSchema.parse(record)` succeeds.
-   Invalid Schema Rejection: In `ai-council.test.ts`, create an invalid `AICouncilPolicyRecord` object (e.g., missing required fields, incorrect types) and assert that `AICouncilPolicyRecordSchema.safeParse(invalidRecord).success` is `false`.
5. Stop Conditions if Runtime Truth Disagrees:
-   `tsc` reports type errors when `AICouncilPolicyRecord` is used as expected.
-   `AICouncilPolicyRecordSchema.parse()` throws an error for a correctly structured record.
-   `AICouncilPolicyRecordSchema.safeParse().success` is `true` for an intentionally malformed record.
-   The defined schema does not accurately reflect the requirements for `g81-100` as detailed in the `AMENDMENT_01_AI_COUNCIL.md` blueprint (requires re-evaluation of blueprint details).