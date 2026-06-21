<!-- SYNOPSIS: Amendment 14 White-Label Proof - G154-100: Dynamic Application Logo -->

# Amendment 14 White-Label Proof - G154-100: Dynamic Application Logo

This document outlines the proof-closing blueprint note for the initial white-label build slice, focusing on dynamic application logo configuration.

## 1. Exact Missing Implementation or Proof Gap

The application's primary logo is currently hardcoded or statically referenced, preventing dynamic white-label branding. A mechanism to configure and load the logo dynamically based on deployment context is missing.

## 2. Smallest Safe Build Slice to Close It

Implement dynamic loading of the primary application logo via an environment variable or configuration setting. This slice focuses solely on the logo display in the main application header/layout.

## 3. Exact Safe-Scope Files to Touch First

*   `src/config/appConfig.js`: Introduce a new configuration entry for `APP_LOGO_URL`.
*   `src/components/Layout/AppHeader.jsx`: Modify the `<img>` tag or equivalent component responsible for displaying the logo to read from `appConfig.APP_LOGO_URL`.
*   `.env.example`: Add `APP_LOGO_URL` as an example environment variable.

## 4. Verifier/Runtime Checks

1.  **Default Logo Check**: Deploy the application without `APP_LOGO_URL` explicitly set (or with a default value). Verify the default LifeOS logo is displayed in the application header.
2.  **Custom Logo Check**: Set the `APP_LOGO_URL` environment variable to a URL pointing to a different image (e.g., `https://example.com/custom-logo.png`). Redeploy/restart the application. Verify the custom logo is displayed in the application header.
3.  **Missing Logo Check**: Set `APP_LOGO_URL` to an invalid or non-existent URL. Verify that either a fallback logo is displayed, or a graceful error/placeholder is shown without breaking the UI.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The logo displayed in the application header does not change after updating `APP_LOGO_URL` and restarting the application.
*   The application fails to start or renders critical errors when `APP_LOGO_URL` is missing or invalid.
*   Inspection of `src/components/Layout/AppHeader.jsx` (or equivalent) reveals the logo source is still hardcoded and not referencing `appConfig.APP