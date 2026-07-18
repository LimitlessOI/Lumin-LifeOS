/**
 * SYNOPSIS: Service module — LifeOSiOSIPA.
 */
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const appleDevSecretsPath = path.resolve(process.env.APPLE_DEV_SECRETS_PATH || '');

function buildLifeOSiOSIPA() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(appleDevSecretsPath)) {
      return reject(new Error('Apple Developer secrets not found.'));
    }

    const buildCommand = `
      xcodebuild -workspace LifeOS.xcworkspace -scheme LifeOS \
      -configuration Release -sdk iphoneos \
      -archivePath build/LifeOS.xcarchive archive

      xcodebuild -exportArchive -archivePath build/LifeOS.xcarchive \
      -exportOptionsPlist ${path.join(appleDevSecretsPath, 'ExportOptions.plist')} \
      -exportPath build
    `;

    exec(buildCommand, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Build failed: ${stderr}`));
      }
      resolve(stdout);
    });
  });
}

export { buildLifeOSiOSIPA };
