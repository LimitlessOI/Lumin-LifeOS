BuilderOS Remediation: AMENDMENT_41_MARKETINGOS - TODO-2-G5 (Audio Upload R2 Configuration Readiness)

This memo outlines the next buildable slice to address the blocking task: "Cloudflare R2 bucket and Railway env vars not yet set — blocks audio upload." The objective of this slice is to establish the foundational environment variable configuration for Cloudflare R2, enabling subsequent audio upload functionality.

---

### 1. Blocking Ambiguity / Founder Decision List

The following environment variables require specific values to be provided by a founder or configuration manager. These are critical for R2 access and operation:

*   **`CLOUDFLARE_R2_ACCOUNT_ID`**: The Cloudflare Account ID associated with the R2 bucket.
*   **`CLOUDFLARE