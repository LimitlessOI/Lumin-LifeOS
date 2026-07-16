/**
 * SYNOPSIS: If this script is run directly, execute the function
 * @ssot docs/products/ideavault/PRODUCT_HOME.md
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function importDumpsToTwin(buildProfile = 'default') {
  try {
    const buildProfilePath = resolve(__dirname, `../config/build-profile-${buildProfile}.json`);
    const twinDumpsPath = resolve(__dirname, '../data/twin-dumps.json');

    // Check if the build profile file exists and is readable
    const buildProfileContent = readFileSync(buildProfilePath, 'utf8');
    const parsedBuildProfile = JSON.parse(buildProfileContent);

    const newTwinDumps = {
      importedAt: new Date().toISOString(),
      sourceProfile: parsedBuildProfile.name || 'unknown-profile',
      dumps: parsedBuildProfile.memoryDumps || [],
    };

    writeFileSync(twinDumpsPath, JSON.stringify(newTwinDumps, null, 2), 'utf8');

    console.log(`Successfully imported memory dumps to twin-dumps.json using build profile: ${buildProfile}`);
  } catch (error) {
    console.error(`Failed to import memory dumps to twin using build profile: ${buildProfile}. Error:`, error);
    process.exit(1);
  }
}

// If this script is run directly, execute the function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Extract the build profile from command line arguments if provided
  const buildProfileArgIndex = process.argv.indexOf('--build-profile');
  const buildProfile = buildProfileArgIndex !== -1 ? process.argv[buildProfileArgIndex + 1] : 'default';

  importDumpsToTwin(buildProfile);
}
