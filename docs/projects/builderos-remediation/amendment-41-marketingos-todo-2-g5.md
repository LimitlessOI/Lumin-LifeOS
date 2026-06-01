BuilderOS Remediation: Amendment 41 MarketingOS - ToDo 2 (G5) - R2 Environment Setup

This memo addresses the blocking task: "Cloudflare R2 bucket and Railway env vars not yet set — blocks audio upload." It outlines the necessary steps to prepare the environment for Cloudflare R2 integration, enabling subsequent audio upload functionality.

1. Blocking Ambiguity or Founder Decision List
    -   **Cloudflare R2 Bucket Name:** Specific name for the R2 bucket (e.g., `marketingos-audio-uploads`).
    -   **Cloudflare R2 Access Key ID:** The `AWS_ACCESS_KEY_ID` for R2.
    -   **Cloudflare R2 Secret Access Key:** The `AWS_SECRET_ACCESS_KEY` for R2.
    -   **Cloudflare R2 Endpoint:** The R2 endpoint URL (e.g., `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
    -   **Railway Project ID/Environment:** Confirmation of the target Railway project and environment for variable deployment.

2. Already-Settled Constraints
    -   Blueprint: `docs/projects/AMENDMENT_41_MARKETINGOS.md`
    -   Objective: Enable audio upload via Cloudflare R2.
    -   Execution Scope: BuilderOS-only governed loop.
    -   No modifications to LifeOS user features or TSOS customer-facing surfaces.
    -   Focus on environment configuration, not application code changes.

3. Smallest Buildable Next Slice
    -   **Define R2 Credentials:** Obtain and securely store the Cloudflare R2 bucket name, access key ID, secret access key, and endpoint URL.
    -   **Configure Railway Environment Variables:** Set the following environment variables in the target Railway project/environment:
        -   `CLOUDFLARE_R2_BUCKET_NAME`
        -   `CLOUDFLARE_R2_ACCESS_KEY_ID`
        -   `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
        -   `CLOUDFLARE_R2_ENDPOINT`
    -   **Initial Connectivity Test:** Perform a basic test to confirm R2 bucket existence and credential validity.

4. Exact Safe-Scope Files BuilderOS Should Touch First
    -   `docs/projects/builderos-remediation/amendment-41-marketingos-todo-2-g5.md` (this document, for updates/completion)
    -   Railway project configuration (via API/CLI) to set environment variables.
    -   No application code files are to be modified in this slice.

5. Required Verifier/Runtime Checks
    -   **Railway Env Var Check:** Verify that `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and `CLOUDFLARE_R2_ENDPOINT` are present and correctly configured in the target Railway environment.
    -   **R2 Bucket Existence Check:** Confirm the specified R2 bucket exists in Cloudflare.
    -   **R2 Credential Validation:** Attempt a simple `listObjects` or `putObject` (with a dummy file) operation against the R2 bucket using the configured credentials to validate access.

6. Stop Conditions
    -   All required Cloudflare R2 environment variables are successfully set in the target Railway project.
    -   The specified Cloudflare R2 bucket is created and accessible using the configured credentials.
    -   A basic connectivity and credential validation test against the R2 bucket succeeds.