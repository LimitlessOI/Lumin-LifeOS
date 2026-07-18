/**
 * SYNOPSIS: Service module — BuildLifeOSiOSIPA.
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateSignedIPA(buildConfig) {
  try {
    const { projectPath, appleDevSecret, outputDirectory } = buildConfig;

    // Validate build configuration
    if (!projectPath || !appleDevSecret || !outputDirectory) {
      throw new Error('Invalid build configuration');
    }

    // Set up paths
    const ipaOutputPath = path.join(outputDirectory, 'app.ipa');

    // Run build command
    const buildCommand = `xcodebuild -project ${projectPath} -scheme MyScheme -archivePath ${outputDirectory}/app.xcarchive archive`;
    await execAsync(buildCommand);

    // Export the archive to IPA
    const exportCommand = `xcodebuild -exportArchive -archivePath ${outputDirectory}/app.xcarchive -exportPath ${outputDirectory} -exportOptionsPlist ${appleDevSecret}`;
    await execAsync(exportCommand);

    // Ensure IPA exists
    if (!fs.existsSync(ipaOutputPath)) {
      throw new Error('Failed to generate IPA');
    }

    return ipaOutputPath;
  } catch (error) {
    console.error('Error generating signed IPA:', error);
    throw error;
  }
}

export { generateSignedIPA };