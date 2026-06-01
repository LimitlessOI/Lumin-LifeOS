BuilderOS Remediation: AMENDMENT_41_MARKETINGOS - TODO-2-G5 (Cloudflare R2 & Railway Env Vars)
This memo addresses the blocking task from `AMENDMENT_41_MARKETINGOS.md`: "Cloudflare R2 bucket and Railway env vars not yet set — blocks audio upload." The goal is to enable audio file uploads by configuring the necessary Cloudflare R2 bucket and Railway environment variables.

### 1. Blocking Ambiguity or Founder Decision List

*   **Cloudflare R2 Bucket Name**: Specific name for the audio upload bucket (e.g., `lifeos-audio-uploads`). This must be created and configured in Cloudflare R2.
*   **Cloudflare R2 Credentials**:
    *   `CLOUDFLARE_R2_ACCOUNT_ID`: The Cloudflare Account ID associated with the R2 bucket.
    *   `CLOUDFLARE_R2_ACCESS_KEY_ID`: An R2 API access key ID with appropriate permissions for the bucket.
    *   `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: The corresponding secret access key.
*   **Railway Project ID**: Confirmation of the target Railway project ID if not implicitly derived from the deployment context.

### 2. Already-Settled Constraints

*   **Objective**: Enable audio file uploads.
*   **Storage Solution**: Cloudflare R2 (S3-compatible API).
*   **Deployment Platform**: Railway.
*   **Application Stack**: Node/ESM.
*   **Scope**: Infrastructure configuration and client initialization only. No modification to LifeOS user features or TSOS customer-facing surfaces.
*   **Existing Patterns**: Follow established Node/ESM patterns for environment variable access and module imports.

### 3. Smallest Buildable Next Slice

The immediate next slice focuses on establishing the foundational R2 connectivity:

1.  **Environment Variable Definition**: Define the required Cloudflare R2 credentials and bucket name as environment variables.
2.  **Railway Configuration**: Securely inject these environment variables into the target Railway project.
3.  **R2 Client Initialization**: Implement or extend an existing utility to initialize an S3-compatible client (e.g., using `@aws-sdk/client-s3`) configured for Cloudflare R2 using the new environment variables.

### 4. Exact Safe-Scope Files BuilderOS Should Touch First

*   `railway.json` (or equivalent Railway configuration for environment variables)
*   `.env.development` (for local development environment variable setup)
*   `package.json` (to add `@aws-sdk/client-s3` if not already a dependency)
*   `src/lib/cloudflareR2.js` (or similar, for R2 client initialization logic, if a dedicated module does not exist)
*   `docs/projects/builderos-remediation/amendment-41-marketingos-todo-2-g5.md` (this document, for completion)

### 5. Required Verifier/Runtime Checks

*   **Environment Variable Presence**:
    *   Verify `process.env.CLOUDFLARE_R2_ACCOUNT_ID` is set.
    *   Verify `process