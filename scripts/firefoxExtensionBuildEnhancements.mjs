/**
 * SYNOPSIS: TGT: scripts/firefoxExtensionBuildEnhancements.mjs
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

// TGT: scripts/firefoxExtensionBuildEnhancements.mjs
// TSK: enhance Firefox support

// Enhance the existing Firefox support with a MV2 manifest variant.

// This is a placeholder for the actual enhancement logic.
// In a real scenario, this file would contain code to:
// 1. Detect the target browser (Firefox).
// 2. Generate or modify the manifest.json to create a MV2 variant.
// 3. Potentially handle other Firefox-specific build steps.

// Example of what the enhancement might involve (conceptual):

// import { readFileSync, writeFileSync } from 'fs';
// import { join } from 'path';

// export function enhanceFirefoxBuild(buildOptions) {
//   if (buildOptions.browser === 'firefox') {
//     console.log('Enhancing Firefox build with MV2 manifest variant...');

//     const manifestPath = join(buildOptions.outputDir, 'manifest.json');
//     let manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

//     // Apply MV2 specific changes
//     manifest.manifest_version = 2;

//     // Example: Adjusting permissions for MV2 if necessary
//     if (manifest.permissions && manifest.permissions.includes('scripting')) {
//       manifest.permissions = manifest.permissions.filter(p => p !== 'scripting');
//       // Add 'activeTab' or 'tabs' if needed for equivalent functionality in MV2
//       if (!manifest.permissions.includes('activeTab')) {
//         manifest.permissions.push('activeTab');
//       }
//     }

//     // Example: Background script changes for MV2
//     if (manifest.background && manifest.background.service_worker) {
//       manifest.background = {
//         scripts: [manifest.background.service_worker],
//         persistent: false // MV2 background scripts are non-persistent by default unless specified
//       };
//       delete manifest.background.service_worker; // Remove MV3 service_worker
//     }

//     writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
//     console.log('MV2 manifest variant applied for Firefox.');
//   }
// }

// This file would likely export functions that are called by a build script
// to perform the enhancements.

export const FirefoxMV2Enhancements = {
  applyMV2ManifestVariant: (manifestContent) => {
    let manifest = JSON.parse(manifestContent);

    // Apply MV2 specific changes
    manifest.manifest_version = 2;

    // Adjusting permissions for MV2 if necessary (example)
    if (manifest.permissions && manifest.permissions.includes('scripting')) {
      manifest.permissions = manifest.permissions.filter(p => p !== 'scripting');
      if (!manifest.permissions.includes('activeTab')) {
        manifest.permissions.push('activeTab');
      }
    }

    // Background script changes for MV2 (example)
    // If a service_worker (MV3) is present, convert it to a MV2 background script.
    if (manifest.background && manifest.background.service_worker) {
      manifest.background = {
        scripts: [manifest.background.service_worker], // Use the service worker file as a regular script
        persistent: false // MV2 background scripts are non-persistent by default
      };
      // No need to delete service_worker property explicitly here if we're overwriting the whole background object.
    } else if (manifest.background && manifest.background.scripts) {
      // Ensure existing MV2 background scripts are handled, no change needed.
    }


    // Content Security Policy (CSP) for MV2 (example)
    // MV2 CSP is often more permissive for inline scripts/styles by default,
    // but if a strict MV3 CSP is present, it might need adjustment.
    // For simplicity, this example assumes no specific CSP conversion is universally needed
    // without more context, as MV2's default CSP is often sufficient.
    // If a `content_security_policy` key exists, review its fit for MV2.
    // Example: If MV3's `extension_pages` is used, it might need to be removed or adjusted.
    if (manifest.content_security_policy) {
        // MV2 typically uses 'script-src' and 'object-src' directly.
        // If the existing CSP is tailored for MV3, it might need modification.
        // For instance, if 'extension_pages' directive is present, it's specific to MV3.
        // A common MV2 CSP might look like:
        // "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"
        // This is a complex area, so a direct replacement without specific requirements
        // is risky. For this fix, we'll assume the primary change is manifest_version.
        // If the existing CSP is "content_security_policy": {"extension_pages": ...}
        // it would need careful conversion or removal.
        if (typeof manifest.content_security_policy === 'object' && manifest.content_security_policy.extension_pages) {
            // This is an MV3 specific CSP structure.
            // For MV2, it generally expects a string.
            // A common fallback for MV2 might be:
            manifest.content_security_policy = "script-src 'self'; object-src 'self'";
            // This is a minimal example and might need to be expanded based on the actual extension's needs.
        }
    }


    return JSON.stringify(manifest, null, 2);
  }
};

// NO:CJS // This file must remain an ESM module.
// OUT:FILE // This file is intended to be output.
// REPO:ESM // This file belongs to the ESM repository.
// ESM:EXPORTS // This file exports ESM modules.
// CRIT:DUPEXPORT // Critical: Ensure no duplicate exports.
// CRIT:PRESERVE // Critical: Preserve existing structure and comments.
// PROTECTED:FULL // This file is fully protected.
