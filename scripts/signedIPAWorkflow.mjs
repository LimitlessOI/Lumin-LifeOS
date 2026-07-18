/**
 * SYNOPSIS: Exports buildSignedIPA — scripts/signedIPAWorkflow.mjs.
 */
import { execSync } from 'child_process';
import { createWriteStream } from 'fs';
import { request } from 'https';

export function buildSignedIPA() {
  try {
    // Step 1: Clean previous build artifacts
    console.log('Cleaning previous build artifacts...');
    execSync('rm -rf build/*');

    // Step 2: Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install');

    // Step 3: Build the app
    console.log('Building the app...');
    execSync('npm run build');

    // Step 4: Create unsigned IPA
    console.log('Creating unsigned IPA...');
    execSync('xcodebuild -workspace MyApp.xcworkspace -scheme MyApp -sdk iphoneos -configuration AppStoreDistribution archive -archivePath build/MyApp.xcarchive');
    execSync('xcodebuild -exportArchive -archivePath build/MyApp.xcarchive -exportPath build -exportOptionsPlist ExportOptions.plist');

    // Step 5: Sign the IPA using the signed IPA automation service
    console.log('Signing the IPA...');
    const url = 'https://signed-ipa-automation-service.example.com/sign';
    const filePath = 'build/MyApp.ipa';
    const fileStream = createWriteStream(filePath);

    const req = request(url, { method: 'POST' }, (res) => {
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log('IPA signed successfully.');
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
    });

    req.end();

  } catch (error) {
    console.error('Error during build process:', error);
  }
}
