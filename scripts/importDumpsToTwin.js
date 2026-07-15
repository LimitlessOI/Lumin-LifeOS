/**
 * SYNOPSIS: If this script is run directly, execute the function
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function importDumpsToTwin() {
  try {
    const buildProfilePath = resolve(__dirname, '../config/build-profile.json');
    const twinDumpsPath = resolve(__dirname, '../data/twin-dumps.json');

    const buildProfileContent = readFileSync(buildProfilePath, 'utf8');
    const buildProfile = JSON.parse(buildProfileContent);

    // Assuming the build profile contains a 'memoryDumps' array or similar structure
    // that needs to be imported into 'twin-dumps.json'.
    // This is a placeholder for the actual logic to transform and integrate.
    // For this example, we'll simply overwrite twin-dumps with a part of build-profile.

    const newTwinDumps = {
      importedAt: new Date().toISOString(),
      sourceProfile: buildProfile.name || 'unknown-profile',
      dumps: buildProfile.memoryDumps || [], // Adjust based on actual build-profile structure
    };

    writeFileSync(twinDumpsPath, JSON.stringify(newTwinDumps, null, 2), 'utf8');

    console.log('Successfully imported memory dumps to twin-dumps.json');
  } catch (error) {
    console.error('Failed to import memory dumps to twin:', error);
    process.exit(1);
  }
}

// If this script is run directly, execute the function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  importDumpsToTwin();
}