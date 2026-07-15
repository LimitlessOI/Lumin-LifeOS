/**
 * SYNOPSIS: Exports getDetailedTraditionProfiles — services/traditionProfilesDetail.js.
 */
import fs from 'fs';
import path from 'path';

const traditionProfilesPath = path.resolve('data', 'traditionProfiles.json');

export async function getDetailedTraditionProfiles() {
  try {
    const data = await fs.promises.readFile(traditionProfilesPath, 'utf-8');
    const profiles = JSON.parse(data);
    return profiles.map(profile => ({
      ...profile,
      explanation: `Detailed explanation for ${profile.name}`,
      visualFrame: `Visual frame for ${profile.name}`,
    }));
  } catch (error) {
    console.error('Error reading tradition profiles:', error);
    throw error;
  }
}