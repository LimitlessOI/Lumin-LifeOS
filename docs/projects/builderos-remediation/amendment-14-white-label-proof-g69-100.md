# Amendment 14 White-Label Proof: G69-100 - Dynamic Application Logo

## Blueprint Note: Proof-Closing Build Slice

This document serves as a proof-closing blueprint note for the dynamic application of the primary white-label logo, as outlined in `docs/projects/AMENDMENT_14_WHITE_LABEL.md`. This slice focuses on ensuring the correct tenant-specific logo is displayed in the main application header.

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a robust, dynamic mechanism to fetch and apply the tenant-specific primary application logo from the white-label configuration service to the main application header component. While configuration might exist, its runtime application and verification in the UI are not fully proven.

### 2. Smallest Safe Build Slice to Close It

Implement the logic within the primary application header component to:
a. Retrieve the authenticated user's tenant ID.
b. Query the `WhiteLabelConfigService` for the `primaryLogoUrl` associated with that tenant ID.
c. Dynamically update the `src` attribute of the `<img>` tag responsible for displaying the application logo in the header.
d. Implement a fallback to a default LifeOS logo if no tenant-specific `primaryLogoUrl` is found or if the service call fails.

### 3. Exact Safe-Scope Files to Touch First

*   `src