/**
 * SYNOPSIS: Service module — SignedIPA.
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createSignedIPA(appPath, outputDir, appleDevSecrets) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Define paths for provisioning profile and signing identity
    const provisioningProfile = path.resolve(appleDevSecrets.provisioningProfilePath);
    const signingIdentity = appleDevSecrets.signingIdentity;

    // Construct command to create signed IPA
    const command = `xcodebuild -exportArchive -archivePath ${appPath} -exportPath ${outputDir} -exportOptionsPlist ${provisioningProfile} CODE_SIGN_IDENTITY="${signingIdentity}"`;

    // Execute the command
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('Error creating signed IPA:', stderr);
      throw new Error('Failed to create signed IPA');
    }

    console.log('Signed IPA created successfully:', stdout);
    return path.join(outputDir, 'YourAppName.ipa');
  } catch (error) {
    console.error('Error in createSignedIPA:', error);
    throw error;
  }
}

export { createSignedIPA };
