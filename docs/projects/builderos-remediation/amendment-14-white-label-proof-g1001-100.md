# Amendment 14 White-Label Proof: G1001-100 - Custom Logo Upload & Retrieval

This document serves as a proof-closing blueprint note for the initial implementation slice of Amendment 14, focusing on the core white-labeling requirement of custom logo management.

---

### 1. Exact Missing Implementation or Proof Gap

The current platform lacks a mechanism to store and retrieve custom logos specific to white-labeled instances. This gap prevents the visual branding customization essential for white-label functionality. Specifically, there is no API endpoint or backend service to handle logo file uploads, secure storage, and subsequent retrieval for display.

### 2. Smallest Safe Build Slice to Close It

Implement a dedicated API endpoint and associated service logic for uploading, storing, and retrieving a single custom logo per white-labeled instance. This slice will focus solely on the backend mechanics of file handling and URL provision, without touching frontend integration or complex UI.

### 3. Exact Safe-Scope Files to Touch First

*   `src/api/white-label/logo.js`: New API route definition for `/api/white-label/logo` (POST for upload, GET for retrieval).
*   `src/services/white-label-config.js`: New or extended service to encapsulate logo storage (e.g., S3 upload/delete) and URL generation logic. This service will interact with a storage client.
*   `src/storage/s3-client.js`: (If not existing) A utility module for S3 interactions (upload, get signed URL, delete). If existing, ensure it supports the required operations.
*   `src/models/WhiteLabelConfig.js`: (If not existing) A new or extended database model to store the white-label instance's logo URL and associated metadata (e.g., `instanceId`, `logoUrl`, `lastUpdated`).

### 4. Verifier/Runtime Checks

*   **API POST Test:** Send a `POST` request to `/api/white-label/logo` with a valid image file (e.g., PNG, JPEG) in the request body (multipart/form-data).
    *   **Expected Outcome:** HTTP 200 OK response with the public URL of the uploaded logo.
    *   **Data Check:** Verify that the `WhiteLabelConfig` model for the current instance now contains the new logo URL.
    *   **Storage Check:** Verify the image file exists in the configured storage (e.g., S3 bucket) at the expected path.
*   **API GET Test:** Send a `GET` request to `/api/white-label/logo`.
    *   **Expected Outcome:** HTTP 200 OK response with the public URL of the currently stored logo.
    *   **Content Check:** Access the returned URL directly in a browser or via `curl` to confirm the image is served correctly and is the one previously uploaded.
*   **Error Handling Test (Invalid File Type):** Send a `POST` request with a non-image file (e.g., `.txt`).
    *   **Expected Outcome:** HTTP 400 Bad Request with an appropriate error message.
*   **Error Handling Test (No File):** Send a `POST` request without a file.
    *   **Expected Outcome:** HTTP 400 Bad Request with an appropriate error message.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistent 5xx Errors:** If the API endpoints consistently return server-side errors (5xx status codes) during upload or retrieval, indicating fundamental backend issues.
*   **Data Inconsistency:** If the database record for `logoUrl` does not match the actual file stored, or if the retrieved URL does not point to the correct, latest image.
*   **Storage Failures:** If uploaded files are not appearing in the designated storage location, or if they are corrupted upon retrieval.
*   **Security Vulnerabilities:** Discovery of any unauthenticated access to upload or modify logos, or if uploaded files are executable or pose other security risks.
*   **Performance Degradation:** If the upload or retrieval process introduces significant latency or resource consumption that impacts overall platform stability.