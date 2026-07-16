/**
 * SYNOPSIS: Script — SafariExtensionBuild.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function buildSafariExtension() {
  try {
    console.log('Starting Safari extension build...');
    const { stdout, stderr } = await execAsync('xcodebuild -scheme YourSchemeName -configuration Release');
    if (stderr) {
      console.error('Xcode build error:', stderr);
    }
    console.log('Xcode build output:', stdout);
    console.log('Safari extension build completed successfully.');
  } catch (error) {
    console.error('Error during Safari extension build:', error);
  }
}

export { buildSafariExtension };