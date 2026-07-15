/**
 * SYNOPSIS: Script — RepoTriageWave1.
 */
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function readFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

async function deletePath(deletePath) {
  try {
    await fs.rm(deletePath, { recursive: true, force: true });
    console.log(`Deleted: ${deletePath}`);
  } catch (error) {
    console.error(`Error deleting path ${deletePath}:`, error);
    throw error;
  }
}

async function archivePath(archivePath) {
  // Implement archiving logic if needed
  console.log(`Archived: ${archivePath}`);
}

async function parseCatalog(catalogContent) {
  const lines = catalogContent.split('\n');
  const deleteCandidates = [];

  for (const line of lines) {
    if (line.includes('DELETE-CANDIDATE')) {
      const [path] = line.split(' ');
      deleteCandidates.push(path);
    }
  }

  return deleteCandidates;
}

async function triageRepo() {
  try {
    const catalogContent = await readFile('REPO_CATALOG.md');
    const deleteCandidates = await parseCatalog(catalogContent);

    for (const candidate of deleteCandidates) {
      await deletePath(candidate);
    }

    // Rerun npm run repo:catalog
    await execPromise('npm run repo:catalog');
    console.log('Repo catalog updated.');

  } catch (error) {
    console.error('Error during repo triage:', error);
  }
}

export { triageRepo };
