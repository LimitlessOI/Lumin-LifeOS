/**
 * SYNOPSIS: Exports buildSafariExtension — scripts/safariExtensionBuild.mjs.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { execSync } from 'child_process';

export function buildSafariExtension() {
  try {
    // Command to build the Safari extension using Xcode
    execSync('xcodebuild -project YourProject.xcodeproj -scheme YourScheme -configuration Release -sdk macosx');
    console.log('Safari extension build completed.');
  } catch (error) {
    console.error('Error during Safari extension build:', error);
  }
}
