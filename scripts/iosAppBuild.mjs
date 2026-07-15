/**
 * SYNOPSIS: Exports buildiOSApp — scripts/iosAppBuild.mjs.
 */
import { execSync } from 'child_process';
import path from 'path';

export function buildiOSApp() {
  try {
    const projectPath = path.resolve(__dirname, '../ios/LifeOS.xcodeproj');
    const scheme = 'LifeOS';
    const configuration = 'Release';
    const sdk = 'iphoneos';

    console.log('Building the LifeOS iOS app...');

    // Configure build settings
    const buildCommand = `xcodebuild -project ${projectPath} -scheme ${scheme} -sdk ${sdk} -configuration ${configuration} build CODE_SIGN_IDENTITY="iPhone Developer" PROVISIONING_PROFILE_SPECIFIER="YourProvisioningProfileSpecifier"`;

    // Execute the build command
    execSync(buildCommand, { stdio: 'inherit' });

    console.log('iOS app built successfully.');
  } catch (error) {
    console.error('Error building iOS app:', error.message);
  }
}

export function signiOSApp() {
  try {
    const exportOptionsPlist = path.resolve(__dirname, 'exportOptions.plist');
    const archivePath = path.resolve(__dirname, '../ios/build/LifeOS.xcarchive');
    const exportPath = path.resolve(__dirname, '../ios/build');

    console.log('Signing the LifeOS iOS app...');

    // Configure signing settings
    const signCommand = `xcodebuild -exportArchive -archivePath ${archivePath} -exportOptionsPlist ${exportOptionsPlist} -exportPath ${exportPath}`;

    // Execute the signing command
    execSync(signCommand, { stdio: 'inherit' });

    console.log('iOS app signed successfully.');
  } catch (error) {
    console.error('Error signing iOS app:', error.message);
  }
}
