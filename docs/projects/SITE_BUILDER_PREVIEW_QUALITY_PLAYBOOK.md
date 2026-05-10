# Site Builder Preview Quality Playbook

This playbook outlines the quality standards and remediation strategies for AI-generated website previews, ensuring they meet conversion readiness before outreach.

## Score Bands

The `services/site-builder-quality-scorer.js` service evaluates generated HTML against a set of criteria, producing a score, grade, and readiness status.

*   **Maximum Score:** 100 points (sum of all criteria points).
*   **`minReadyScore`:** Default 72%. Previews scoring at or above this threshold are considered `readyToSend`.
*   **`minExcellentScore`:** Default 88%. Previews scoring at or above this threshold are considered high-quality and can be shipped directly.

**Grade Mapping:**
*   **A:** 90% and above
*   **B:** 75% - 89.9%
*   **C:** 60% - 74.9%
*   **D:** 45% - 59.9%
*   **F:** Below 45%

**Recommended Actions:**
*   **`ship`**: Score >= `minExcellentScore`. High quality, send immediately.
*   **`review_then_send`**: Score >= `minReadyScore` but < `minExcellentScore`. Meets minimum, but a quick human review is recommended.
*   **`revise_before_send`**: Score < `minReadyScore`. Requires significant revision, likely a new AI generation or manual intervention.

## Common Failure Patterns

These are the issues identified by the quality scorer that prevent a preview from being `readyToSend`. They indicate areas where the AI generation or underlying template needs improvement.

*   Missing DOCTYPE declaration
*   Missing mobile viewport meta tag
*   Expected exactly one H1 heading
*   Missing enough H2 sections to structure the page
*   Missing strong call-to-action language
*   CTA does not repeat enough through the page
*   Missing a trust or proof section
*   Missing offer or pricing clarity
*   Missing phone number or email address
*   Missing Schema.org structured data
*   Missing FAQ or objection-handling section
*   Missing mobile sticky CTA treatment
*   Missing TwCSS
*   Missing footer element
*   Missing visible keyboard focus styles
*   Content too short (under 4500 chars)

## Deterministic Fixes (Platform-level)

These are issues that can potentially be addressed by programmatic post-processing within the platform (e.g., in `services/site-builder.js`) using string manipulation or regex, without requiring changes to the AI's core generation prompt. Such fixes are typically simple, non-contextual HTML injections or modifications.

*   **Missing DOCTYPE declaration:** Can be programmatically prepended to the HTML string.
*   **Missing mobile viewport meta tag:** Can be injected into the `<head>` section.
*   **Missing TwCSS:** If this refers to the `<link>` tag for the Tailwind stylesheet, it can be injected into the `<head>`.
*   **Missing Schema.org structured data:** A generic, templated JSON-LD script block (e.g., for `LocalBusiness`) can be injected into the `<head>` or `<body>`.
*   **Missing footer element:** A basic, generic footer structure could be appended if no `<footer>` tag is detected.

## Prompt Fixes (AI Generation)

These issues require adjustments to the AI's generation prompts or the underlying templates to guide the AI to produce better, more complete, and conversion-optimized content and structure. These are generally more complex, contextual, or design-oriented problems.

*   **Expected exactly one H1 heading:** AI needs to be instructed to generate a single, prominent H1.
*   **Missing enough H2 sections:** AI needs to be prompted to create more detailed content with appropriate sub-headings.
*   **Missing strong call-to-action language:** AI needs to be guided to use specific, high-converting CTA phrases and ensure their prominence.
*   **CTA does not repeat enough:** AI needs to be prompted to strategically place CTAs throughout the page.
*   **Missing a trust or proof section:** AI needs to generate testimonial blocks, review snippets, or other social proof elements.
*   **Missing offer or pricing clarity:** AI needs to include clear service offerings, pricing structures, or package details.
*   **Missing phone number or email address:** While a deterministic fix could inject a placeholder, the AI should ideally generate contextually relevant contact information within the page content.
*   **Missing FAQ or objection-handling section:** AI needs to generate common questions and answers or address potential client concerns.
*   **Missing mobile sticky CTA treatment:** AI needs to generate the specific HTML/CSS for a sticky mobile CTA, or the base template needs to include this.
*   **Missing visible keyboard focus styles:** AI needs to ensure generated elements have appropriate Tailwind focus classes or custom CSS for accessibility.
*   **Content too short:** AI needs to be prompted to generate more comprehensive and detailed content.

## Human Review Triggers

A human review is triggered when a generated preview fails to meet the minimum `readyToSend` threshold.

*   **`qualityReport.readyToSend === false`**: This is the primary trigger. The site's calculated `scorePct` is below `minReadyScore` (default 72%).
*   **`recommendedAction: 'revise_before_send'`**: This explicitly flags the site for revision.
*   **`prospect_sites.status = 'qa_hold'`**: When a site is built but fails the quality gate, its status is set to `qa_hold`, indicating it requires manual inspection and potential re-generation or editing before outreach.
*   **`scripts/site-builder-quality-audit.mjs`**: This script can be run to identify all "Weak previews" that are not ready to send, providing a detailed list of issues for each.