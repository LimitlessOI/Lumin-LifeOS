BuilderOS Remediation: AMENDMENT_14_WHITE_LABEL - Custom Domain CNAME Support (G10)

This memo addresses the open task regarding undocumented Railway configuration for custom domain CNAME support, as identified in `AMENDMENT_14_WHITE_LABEL.md`. The goal is to provide a builder-ready enhancement memo to unblock progress on implementing white-label custom domain CNAME mapping.

### 1. Blocking Ambiguity / Founder Decision List

*   **Railway CNAME Provisioning Mechanism:** Clarify the exact Railway API or CLI commands required to associate a custom domain CNAME with a specific Railway service instance. This decision impacts whether BuilderOS needs to integrate with Railway's API for domain management or if this remains a manual, pre-configured step.

*   **Domain-to-Tenant Mapping Strategy:** Define precisely how a custom domain (e.g., `app.customer.com`) maps to a specific LifeOS tenant/instance ID. Is this mapping stored in a dedicated database table, derived from Railway configuration metadata, or managed via a separate service? This is critical for routing incoming requests.

*   **SSL Certificate Management Responsibility:** Specify Railway's role in SSL certificate provisioning and renewal for custom domains. Is this fully automatic and transparent, or are manual steps or specific configurations required within the application or Railway project settings?

*   **Standardized Environment Variable Naming:** Establish and standardize the exact environment variable names Railway will expose for custom domains (e.g., `RAILWAY_CUSTOM_DOMAIN_TARGET`, `RAILWAY_CUSTOM_DOMAIN_HOST`). This ensures consistent access within the application.

*   **Wildcard vs. Specific Subdomain Support:** Confirm if the initial implementation should support wildcard CNAMEs (`*.customer.com`) or only specific subdomains (`app.customer.com`).

### 2. Already-Settled Constraints

*   White-label custom domain support is a non-negotiable core requirement for AMENDMENT_14.

*   This task operates within a BuilderOS-only governed loop execution, meaning no direct human intervention is expected for routine deployment.

*   No modifications to existing LifeOS user features or TSOS customer-facing surfaces are permitted in this phase.

*   The primary focus of this remediation is CNAME record support for custom domains, not A records or other DNS types.

*   The blueprint `AMENDMENT_14_WHITE_LABEL.md` serves as the authoritative source for high-level requirements.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on defining and documenting the expected Railway configuration and enabling the application to safely read this configuration.

*   **Define Railway Environment Variables:** Explicitly establish the specific Railway environment variables that will hold custom domain information. For instance, `RAILWAY_CUSTOM_DOMAIN_HOST