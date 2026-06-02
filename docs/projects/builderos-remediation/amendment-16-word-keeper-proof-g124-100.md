# AMENDMENT 16: WORD KEEPER - Proof G124-100

## Blueprint Note: Next Smallest Build Slice

This note closes the proof for the initial foundational step of Amendment 16, focusing on defining the data contract for Word Keeper policies.

---

**1. Exact missing implementation or proof gap:**
The JSON schema for Word Keeper policies (`schemas/word-keeper-policy.schema.json`) is not yet defined. This schema is critical for establishing the data contract for policies, enabling their creation, storage, and validation in subsequent steps.

**2. Smallest safe build slice to close it:**
Define the JSON schema for `WordKeeperPolicy` objects. This schema must accurately represent the structure outlined in the blueprint, including `policy_id` (string, required), `target_content_path_pattern` (string, required, regex pattern), `required_words_regex` (string, required, regex pattern), and `action_on_violation` (string, required, enum: `FLAG_FOR_REVIEW`, `BLOCK_PUBLISH`).

**3. Exact safe-scope files to touch first:**
- `schemas/word-keeper-policy.schema.json`

**4. Verifier/runtime checks:**
-   **Schema Validation Test:** Use a JSON schema validator (e.g., `ajv` in a test environment) to validate a sample `word-keeper-policy.json` against the newly created `schemas/word-keeper-policy.schema.json`.
-   **Positive Case:** A valid policy object (conforming to all specified fields and enum values) must pass validation without errors.
-   **Negative Cases:**
    -   A policy object missing a required field (e.g., `policy_id`, `target_content_path_pattern`) must fail validation with appropriate errors.
    -   A policy object with an `action_on_violation` value not in the allowed enum (`FLAG_FOR_REVIEW`, `BLOCK_PUBLISH`) must fail validation.
    -   Ensure `target_content_path_pattern` and `required_words_regex` are validated as strings, ideally with a format indicating regex.

**5. Stop conditions if runtime truth disagrees:**
-   If the schema fails to validate a correctly structured `WordKeeperPolicy` object.
-   If the schema allows an incorrectly structured `WordKeeperPolicy` object (e.g., missing required fields, invalid enum values) to pass validation.
-   If the schema does not correctly enforce the data types or constraints specified in the blueprint.