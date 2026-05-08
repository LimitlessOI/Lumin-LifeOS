# Quality Playbook for Generated Previews

This playbook outlines the quality standards, scoring thresholds, common failure patterns, and remediation strategies for AI-generated preview sites. It is grounded in the `services/site-builder-quality-scorer.js` and `scripts/site-builder-quality-audit.mjs` tools.

## Score Bands

The `scoreGeneratedSite` function assigns a `scorePct` (0-100) and a `grade` (A-F) to each generated preview. These scores determine the `readyToSend` status and `recommendedAction`.

*   **Excellent (A-grade, 88%+):**
    *   `scorePct >= 88` (based on `SITE_BUILDER_TARGET_SCORE` or default `minExcellentScore`).
    *   `grade: A` or high `B`.
    *   `readyToSend: true`.
    *   `recommendedAction: 'ship'`.
    *   **Action:** These sites are high-quality, conversion-optimized, and can be sent automatically without human intervention.

*   **Ready to Send (B/C-grade, 72-87%):**
    *   `scorePct >= 72` (based on `SITE_BUILDER_MIN_SEND_SCORE` or default `minReadyScore`) and `< 88`.
    *   `grade: B` or `C`.
    *   `readyToSend: true`.
    *   `recommendedAction: 'review_then_send'`.
    *   **Action:** These sites meet the minimum quality bar. A quick human review is recommended to catch subtle issues, ensure brand voice alignment, or make minor improvements before sending.

*   **QA Hold (D/F-grade, <72%):**
    *   `scorePct < 72`.
    *   `grade: D` or `F`.
    *   `readyToSend: false`.
    *   `recommendedAction: 'revise_before_send'`.
    *   **Action:** These sites fail the quality gate and are automatically placed in `qa_hold`. They require significant human intervention, prompt revision, or a full rebuild before any outreach can occur.

## Common Failure Patterns

The `site-builder-quality-scorer.js` identifies specific issues that reduce a site's score. These are the most frequent reasons for a site to fall below the "ready to send" threshold:

*   **Structural/Boilerplate:**
    *   Missing DOCTYPE declaration
    *   Missing mobile viewport meta tag
    *   Missing footer element
    *   Missing TwCSS (Tailwind CSS)
    *   Missing visible keyboard focus styles
*   **Content & Conversion:**
    *   Expected exactly one H1 heading
    *   Missing enough H2 sections to structure the page
    *   Missing strong call-to-action language
    *   CTA does not repeat enough through the page
    *   Missing a trust or proof section (e.g., testimonials)
    *   Missing offer or pricing clarity
    *   Missing phone number or email address
    *   Missing Schema.org structured data
    *   Missing FAQ or objection-handling section
    *   Missing mobile sticky CTA treatment
    *   Content too short (under 4500 chars)

## Deterministic Fixes (Platform-level)

These issues can often be resolved programmatically by the `site-builder.js` service or a post-processing step, without requiring changes to the AI generation prompt. They typically involve injecting standard boilerplate or structural elements.

*   **Missing DOCTYPE declaration:** Can be prepended to the generated HTML.
*   **Missing mobile viewport meta tag:** Can be injected into the `<head>` section.
*   **Missing Tailwind CSS:** Ensure the Tailwind CDN link or compiled CSS is always included.
*   **Missing footer element:** A standard, conversion-optimized footer component can be appended to the generated HTML.
*   **Missing Schema.org structured data:** Can be generated from the `businessInfo` metadata and injected as `application/ld+json`.
*   **Missing visible keyboard focus styles:** A global CSS snippet can be injected to ensure `:focus-visible` styles are present.

## Prompt Fixes (AI Generation-level)

These issues require refining the AI's instructions (the prompt) to guide it towards generating better content, structure, and conversion elements.

*   **Expected exactly one H1 heading:** The prompt needs to explicitly instruct the AI to generate a single, prominent main heading.
*   **Missing enough H2 sections to structure the page:** The prompt should emphasize using subheadings (H2s) to break down content and improve readability.
*   **Missing strong call-to-action language:** The prompt must guide the AI to use clear, action-oriented, and benefit-driven CTA phrases.
*   **CTA does not repeat enough through the page:** The prompt should instruct the AI to strategically place multiple CTAs throughout the page for optimal conversion.
*   **Missing a trust or proof section:** The prompt needs to explicitly request the inclusion of testimonials, reviews, or other social proof elements.
*   **Missing offer or pricing clarity:** The prompt should guide the AI to clearly articulate services, packages, or pricing information.
*   **Missing phone number or email address:** The prompt needs to ensure contact information is prominently displayed.
*   **Missing FAQ or objection-handling section:** The prompt should instruct the AI to include a section addressing common questions or concerns.
*   **Missing mobile sticky CTA treatment:** The prompt needs to specify this design pattern for mobile responsiveness.
*   **Content too short (under 4500 chars):** The prompt should encourage the AI to generate more comprehensive and detailed content.

## Human Review Triggers

Human review is a critical safety net to ensure quality and brand alignment.

*   **`qa_hold` status:** Any site with `readyToSend: false` (score below 72%) automatically enters `qa_hold`. This is the primary trigger for human review, requiring diagnosis, potential manual editing, or a rebuild with revised prompts.
*   **`review_then_send` recommendation:** Sites scoring between 72% and 87% are recommended for a quick human review. This allows for minor tweaks or confirmation of fit before sending.
*   **Critical factual errors:** While the scorer focuses on structural and conversion elements, human review is essential to catch any incorrect business names, services, or other factual inaccuracies.
*   **Brand voice misalignment:** The scorer cannot evaluate brand voice. Human review ensures the generated content aligns with the prospect's brand identity.
*   **Unusual content or design:** Any generated site that appears significantly different from expected patterns or contains potentially problematic content should be reviewed.