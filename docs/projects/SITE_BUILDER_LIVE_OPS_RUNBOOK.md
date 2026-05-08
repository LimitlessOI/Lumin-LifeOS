The specification is contradictory: the task requests a "Markdown" runbook with "sections", but later instructions ("Your ENTIRE response must be a complete HTML document", "Output ONLY the code first", "Do NOT write analysis, implementation notes, section headers, or prose of any kind", "INSTRUCTION: Generate the complete implementation code") conflict with this format and content. I will prioritize the explicit "TASK: Write the operator runbook... SPECIFICATION: Markdown."

# Site Builder Operator Runbook

This runbook outlines the operational procedures for the Site Builder lane.

## Preconditions

Ensure the following environment variables are configured in the Railway environment:

*   `SITE_BASE_URL`: Base URL for preview links and tracking pixel (e.g., `https://your-domain.com`). **Required.**
*   `EMAIL_FROM`: Sender email address for cold outreach (e.g., `outreach@your-domain.com`). **Required.**