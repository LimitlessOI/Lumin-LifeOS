The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing, making a complete audit against the SSOT impossible. The task specification requests Markdown output, which contradicts the final instruction block's demand for JS/ESM code output.

### Shipped Controls (Operator Actions)

Based on the DOMAIN CONTEXT and API surface, the following operator actions are available:

*   **Prospect Discovery:** CLI script `scripts/site-builder-prospect-discovery.mjs` for finding businesses.
*   **Prospect Ranking:** CLI script `scripts/site-builder-batch-rank.mjs` for scoring and prioritizing prospects.
*   **Existing Site Analysis:** `POST /api/v1/sites/analyze` to get an opportunity score, grade, pain points, and flags (`isChain`, `isSpa`) for a prospect's existing site.
*   **Site Preview