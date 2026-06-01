BuilderOS Enhancement Memo: Amendment 14 White-Label - Custom Domain CNAME Railway Configuration

This memo addresses the blocking task related to documenting Railway configuration for custom domain CNAME support, as identified in `docs/projects/AMENDMENT_14_WHITE_LABEL.md`. The goal is to produce a builder-ready enhancement for this specific, currently undocumented aspect.

---

### 1. Blocking Ambiguity / Founder Decision List

*   **Railway Service Target:** Which specific Railway service (e.g., `lifeos-web`, `lifeos-proxy`) should custom domain CNAMEs point to? What is its default Railway-provided domain?
*   **CNAME Target Value:** What is the exact CNAME target value expected by Railway for custom domains? (e.g., `proxy.railway.app`, a specific service's generated domain, or a dynamic value per project?)
*   **SSL/TLS Provisioning:** Is Railway's automatic SSL handling sufficient, or are manual certificate uploads/management required for custom domains? If automatic, what are the prerequisites?
*   **Domain-to-Tenant Mapping:** How does Railway/LifeOS map an incoming custom domain request to the correct LifeOS tenant/project? (e.g., HTTP Host header, specific routing rules, database lookup).
*   **BuilderOS Integration Point:** What is the intended API or mechanism for BuilderOS to *programmatically* add/manage custom domains within Railway? (e.g., Railway API, direct config file modification, specific Railway CLI commands).

### 2. Already-Settled Constraints

*   **Scope:** BuilderOS-only governed loop execution. No modification of LifeOS user features or TSOS customer-facing surfaces.
*   **Core Requirement:** Enable custom domain CNAME support for white-label projects.
*   **Platform:** Integration must leverage Railway's existing capabilities for domain management and routing.
*   **Implementation:** Follow existing Node/ESM patterns; extend, do not rebuild.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on documenting the *manual* Railway configuration steps required to enable CNAME support for a single custom domain, serving as a foundation for future BuilderOS automation.

**Task:** Document the precise Railway project/service settings and CNAME target value required for a custom domain to successfully route to a LifeOS instance. This includes:
    a. Identifying the target Railway service.
    b. Specifying the CNAME record value (e.g., `cname.railway.app` or a service-specific endpoint).
    c. Detailing any necessary Railway environment variables or service settings (e.g., `HOST_WHITELIST`).
    d. Describing the expected DNS record configuration for the custom domain.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First (for future implementation)

*   `docs/projects/builderos-remediation/amendment-14-white-label-todo-6-g10.md` (this document, for updates)
*   `docs/projects/AMENDMENT_14_WHITE_LABEL.md` (to update the blueprint with resolved details)
*   `src/builderos/services/railwayService.js` (if Railway API interaction is needed for automation)
*   `src/builderos/tasks/provisionCustomDomain.js` (new task for custom domain provisioning)
*   `src/builderos/db/schemas/projectSchema.js` (to store custom domain configurations per project)

### 5. Required Verifier/Runtime Checks

*   **DNS Resolution:** Verify that a custom domain's CNAME record correctly resolves to the specified Railway target.
*   **Railway Routing:** Confirm that Railway successfully routes traffic from the custom domain to the intended LifeOS service.
*   **SSL/TLS Functionality:** Ensure SSL/TLS is correctly provisioned and active for the custom domain (e.g., `https://custom.domain` works).
*   **LifeOS Instance Access:** Verify that the custom domain correctly serves the associated LifeOS project/tenant without errors.
*   **BuilderOS Loop Integrity:** Ensure no unintended side effects on other BuilderOS operations or LifeOS features.

### 6. Stop Conditions

*   All ambiguities in Section 1 are resolved and documented in `AMENDMENT_14_WHITE_LABEL.md`.
*   The manual Railway configuration for a single custom domain CNAME is fully documented and verified to work end-to-end.
*   This memo is updated with the resolved details, making the blueprint directly buildable for the next slice.
*   The `AMENDMENT_14_WHITE_LABEL.md` blueprint is updated to reflect the documented Railway configuration and the next buildable slice.