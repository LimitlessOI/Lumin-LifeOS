/**
 * SYNOPSIS: Exports buildSafariExtension — scripts/safariExtensionBuild.mjs.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { execSync } from 'child_process';

/**
 * Builds the Safari extension using Xcode. This function is macOS-only.
 * The project and scheme names need to be configured based on the actual Xcode project setup.
 * @returns {void}
 */
export function buildSafariExtension() {
  if (process.platform !== 'darwin') {
    console.log('Skipping Safari extension build: This function is macOS-only.');
    return;
  }

  // TODO: Replace 'YourProject.xcodeproj' and 'YourScheme' with actual project and scheme names.
  // These values depend on the specific Xcode project setup for the Safari extension.
  const xcodeProjectName = 'YourProject.xcodeproj'; // Example: 'MySafariExtension.xcodeproj'
  const xcodeSchemeName = 'YourScheme'; // Example: 'MySafariExtension'

  try {
    console.log(`Starting Safari extension build for project: ${xcodeProjectName}, scheme: ${xcodeSchemeName}...`);
    // Command to build the Safari extension using Xcode
    // The -derivedDataPath can be added for more control over build output location, e.g., -derivedDataPath build/DerivedData
    execSync(`xcrun xcodebuild -project ${xcodeProjectName} -scheme ${xcodeSchemeName} -configuration Release -sdk macosx`, { stdio: 'inherit' });
    console.log('Safari extension build completed successfully.');
  } catch (error) {
    console.error('Error during Safari extension build:', error.message);
    // Optionally, re-throw the error if build failure should stop further processes
    // throw new Error('Safari extension build failed.');
  }
}
