<!-- SYNOPSIS: Site Builder Preview Quality Playbook -->

The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing from the repository. This response is grounded in `services/site-builder-quality-scorer.js` and `scripts/site-builder-quality-audit.mjs`.

# Site Builder Preview Quality Playbook

This playbook outlines the quality standards, common failure modes, and remediation strategies for AI-generated preview sites. The goal is to ensure all sites meet a minimum standard for conversion readiness before outreach.

## Score Bands

The `site-builder-quality-scorer.js` service evaluates generated HTML against a set of criteria, producing a `scorePct` (0-100), a `grade` (A-F), and a `readyToSend` flag.

*   **A (90-100%):** Excellent quality. These sites are highly polished and conversion-optimized. `recommendedAction: 'ship'`.
*   **B (75-89%):** Good quality. These sites are generally ready for outreach but may benefit from minor manual tweaks. `recommendedAction: 'review_then_send'`.
*   **C (60-74%):** Acceptable quality. These sites are borderline. They will be flagged for `qa_hold` and require human review and potential revision before sending. `recommendedAction: 'revise_before_send'`.
*   **D (45-59%):** Poor quality. These sites are not ready for outreach and require significant revision. `recommendedAction: 'revise_before_send'`.
*   **F (0-44%):** Failing quality. These sites are fundamentally flawed and require a complete rebuild or extensive manual intervention. `recommendedAction: 'revise_before_send'`.

**Key Thresholds:**
*   **`minExcellentScore` (default 88%):** Sites at or above this score are considered excellent and can often be sent without human review.
*   **`minReadyScore` (default 72%):** Sites at or above this score are considered "ready to send" (though B-grade sites still trigger `review_then_send`). Sites below this threshold are automatically placed in `qa_hold`.

## Common Failure Patterns

The following issues are detected by the quality scorer and contribute to a lower score, potentially triggering a `qa_hold`:

*   Missing DOCTYPE declaration
*   Missing mobile viewport meta tag
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
*   Missing Tailwind CSS classes/structure
*   Missing footer element
*   Missing visible keyboard focus styles
*   Content too short (under 4500 characters)

## Deterministic Fixes (Platform-level)

These issues can often be resolved by modifying the base template, injecting standard components, or applying post-processing logic, rather than solely relying on AI prompt adjustments.

*   **Missing DOCTYPE declaration:** Ensure the base HTML template always includes `<!DOCTYPE html>`.
*   **Missing mobile viewport meta tag:** Ensure the base HTML template always includes `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
*   **Missing Tailwind CSS:** Verify the base template uses Tailwind or ensure the AI generates Tailwind classes. If not, consider injecting Tailwind CDN or a minimal CSS framework.
*   **Missing footer element:** Ensure the base template includes a `<footer>` element, potentially with boilerplate content.
*   **Missing visible keyboard focus styles:** Inject a global CSS rule or a utility class to ensure `:focus-visible` styles are present.
*   **Missing Schema.org structured data:** Programmatically generate and inject basic `WebSite` or `LocalBusiness` JSON-LD based on `businessInfo` into the `<head>`.
*   **Missing phone number or email address:** If `businessInfo` contains this data and it's absent from the generated HTML, consider a post-processing step to inject it into a designated contact section or footer.
*   **Content too short (under 4500 chars):** If AI output is consistently too brief, consider adding a boilerplate "About Us" or "Services" section with placeholder text if the generated content falls below a certain length.

## Prompt Fixes (AI Generation-level)

These issues are primarily related to the content, structure, and persuasive elements of the site, and are best addressed by refining the AI generation prompts.

*   **Expected exactly one H1 heading:** Refine prompts to ensure a single, prominent H1 is generated for the main page title.
*   **Missing enough H2 sections to structure the page:** Adjust prompts to encourage the generation of multiple distinct sections with H2 headings for better content organization.
*   **Missing strong call-to-action language:** Emphasize the need for clear, action-oriented CTAs in prompts.
*   **CTA does not repeat enough through the page:** Instruct the AI to strategically place CTAs at multiple points (e.g., header, mid-page, footer).
*   **Missing a trust or proof section:** Prompts should explicitly request sections for testimonials, reviews, or social proof.
*   **Missing offer or pricing clarity:** Guide the AI to include clear information about services, packages, or pricing structures.
*   **Missing FAQ or objection-handling section:** Prompts should encourage the inclusion of an FAQ or a section addressing common customer concerns.
*   **Missing mobile sticky CTA treatment:** Instruct the AI to generate HTML/CSS for a sticky CTA visible on mobile devices.

## Human Review Triggers

A human review is triggered when a generated preview site fails to meet the `minReadyScore` (default 72%). These sites are automatically assigned the `qa_hold` status in the `prospect_sites` table.

Operators should:
1.  Identify `qa_hold` prospects using the `/api/v1/sites/prospects` endpoint or the `site-builder-pipeline-report.mjs` script.
2.  Use `scripts/site-builder-quality-audit.mjs` (especially with `--id` or `--live` flags) to get a detailed breakdown of issues.
3.  Review the generated preview site (`preview_url`) to understand the specific deficiencies.
4.  Determine if the issues can be quickly fixed manually (e.g., minor text edits, class additions) or if the site requires a rebuild with revised AI prompts.
5.  Update the prospect status and `qualityReport` metadata after review/fix.