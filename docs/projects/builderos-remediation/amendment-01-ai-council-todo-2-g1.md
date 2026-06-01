# BuilderOS Remediation: Amendment 01 AI Council - Investigate Ollama Token Bloat (G1)

This memo outlines the next buildable slice for addressing the "Investigate Ollama 7,327 avg tokens/call" task from `AMENDMENT_01_AI_COUNCIL.md`. The focus is on identifying likely bloated system prompts within a safe, investigative scope.

## 1. Blocking Ambiguity / Founder Decision List

*   **Target Token Count:** What is the acceptable average token count for Ollama calls? (e.g., < 5000, < 3000). This will define "bloated".
*   **Prompt Identification Method:** Should the investigation prioritize automated analysis of prompt templates, or manual review of high-token-count call logs?
*   **Scope of "Investigation":** Does this phase include proposing specific prompt rewrites, or strictly data collection and problem identification? (Assuming strictly identification for this `[safe]` slice).
*   **Data Retention Policy:** How long should detailed token usage logs be retained for this investigation?

## 2. Already-Settled Constraints

*   **Target System:** Ollama service calls.
*   **Primary Hypothesis:** Bloated system prompts.
*   **Estimated Effort:** 2 hours for this initial investigation slice.
*   **Safety Scope:** `[safe]` - no modifications to production prompts, models, or core logic.
*   **Impact:** No modification to LifeOS user features or TSOS customer-facing surfaces.
*   **Execution:** BuilderOS-only governed loop.

## 3. Smallest Buildable Next Slice

The immediate next slice focuses on data collection and initial analysis to pinpoint problematic prompts.

1.  **Data Collection:**
    *   Instrument Ollama call logging to capture:
        *   Full system prompt content.
        *   Full user prompt content.
        *   Response content.
        *   Input token count.
        *   Output token count.
        *   Timestamp.
        *   Associated internal service/feature identifier (if available).
    *   Collect a statistically significant sample of recent Ollama call logs (e.g., last 24-48 hours).
2.  **Initial Analysis:**
    *   Aggregate token counts by unique system prompt.
    *   Identify the top N (e.g., 10-20) system prompts contributing to the highest average input token counts.
    *   Calculate the average input token count for each identified system prompt.
    *   Generate a preliminary report listing these prompts and their average token usage.

## 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `docs/projects/builderos-remediation/amendment-01-ai-council-todo-2-g1.md` (This document, as the output of the current BuilderOS task).
*   `logs/ollama-token-investigation-YYYYMMDD.jsonl` (New log file for collected data, read-only for BuilderOS after creation).
*   `reports/ollama-prompt-token-summary-YYYYMMDD.md` (New report file summarizing findings, read-only for BuilderOS after creation).
*   *Potential Read-Only Access:* Existing Ollama service configuration files or prompt template directories to understand current prompt structures, without modification. (e.g., `config/ollama.js`, `src/prompts/*.js`).

## 5. Required Verifier/Runtime Checks

*   **Verifier Check:**
    *   Confirm the existence and correct formatting of `logs/ollama-token-investigation-YYYYMMDD.jsonl`.
    *   Confirm the existence and correct formatting of `reports/ollama-prompt-token-summary-YYYYMMDD.md`.
    *   Verify that no core application files or production prompt templates were modified.
*   **Runtime Check (during investigation execution):**
    *   Ollama service remains operational and stable.
    *   No significant performance degradation observed in Ollama call latency.
    *   Log collection mechanism correctly captures all required data points.
    *   Analysis script executes without errors and produces expected output.

## 6. Stop Conditions

*   The 2-hour investigation window has elapsed.
*   A preliminary report (`reports/ollama-prompt-token-summary-YYYYMMDD.md`) has been generated, listing the top N system prompts by average input token count.
*   A clear set of identified "bloated" system prompts is available for further review.
*   A list of proposed next steps (e.g., specific prompt optimization tasks) is ready for founder review.