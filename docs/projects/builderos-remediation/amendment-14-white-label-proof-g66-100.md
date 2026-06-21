<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G66 100. -->

Amendment 14: White Label Proof - G66-100
Proof-Closing Blueprint Note

This note addresses the initial implementation slice for Amendment 14, focusing on establishing the foundational configuration and theme engine for BuilderOS white-labeling.

1.  **Exact Missing Implementation or Proof Gap**
    The blueprint outlines the need for `builder-config.json` to define white-labeling parameters (e.g., logo paths, color palettes, branding text). The current gap is the initial definition and implementation of this configuration file structure, and the mechanism to load and make these parameters accessible to the BuilderOS theme engine. Specifically, the `builder-config.json` schema and its default instantiation are missing, along with the initial parsing logic within the BuilderOS core.

2.  **Smallest Safe Build Slice to Close It**
    Define the `builder-config.json` schema and create a default `builder-config.json` file. Implement a minimal configuration loading utility within BuilderOS that reads this file and exposes its contents. This slice focuses purely on configuration data availability, not its application to UI elements yet.

3.  **Exact Safe-Scope Files to Touch First**
    *   `builderos/config/builder-config.schema.json` (new file, defines structure)
    *   `builderos/config/builder-config.json` (new file, default instance)
    *   `builderos/utils/configLoader.js` (new file, utility to load config)
    *   `builderos/index.js` (modify to import and initialize `configLoader` at application startup)

4.  **Verifier/Runtime Checks**
    *   **Unit Test**: Add a test for `builderos/utils/configLoader.js` to ensure it correctly parses `builder-config.json` and returns expected values.
    *   **Integration Test**: Verify that the BuilderOS entry point (`builderos/index.js`) successfully loads the configuration at startup and that a placeholder value (e.g., `config.branding.appName`) is accessible in the application context.
    *   **Manual Check (Dev Env)**: Start BuilderOS locally and inspect the global or application-level configuration object to confirm `builder-config.json` values are present and correct.

5.  **Stop Conditions if Runtime Truth Disagrees**
    *   `builderos/utils/configLoader.js` fails to parse `builder-config.json` due to schema mismatch or file not found.
    *   The BuilderOS application crashes on startup due to configuration loading errors.
    *   Expected configuration values are not accessible or are incorrect when queried from the application context.
    *   The `builder-config.json` file is not found at the expected path during runtime, leading to default or missing configuration.