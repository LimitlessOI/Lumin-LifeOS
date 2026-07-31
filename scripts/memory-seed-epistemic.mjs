/**
 * SYNOPSIS: Allow direct execution via npm run memory:seed
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EPISTEMIC_FACTS_DIR = path.resolve(__dirname, '..', 'data', 'epistemic_facts');
const SSOT_DIR = path.resolve(__dirname, '..', 'data', 'ssot');

async function loadJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function loadSsotFacts() {
  const facts = [];
  const entries = await fs.readdir(SSOT_DIR, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const filePath = path.join(SSOT_DIR, entry.name);
      const data = await loadJsonFile(filePath);
      if (data && Array.isArray(data.facts)) {
        facts.push(...data.facts);
      }
    }
  }
  return facts;
}

async function loadExistingEpistemicFacts() {
  const facts = [];
  const entries = await fs.readdir(EPISTEMIC_FACTS_DIR, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const filePath = path.join(EPISTEMIC_FACTS_DIR, entry.name);
      const data = await loadJsonFile(filePath);
      if (data && Array.isArray(data.facts)) {
        facts.push(...data.facts);
      }
    }
  }
  return facts;
}

function mergeFacts(existing, incoming) {
  const existingMap = new Map();
  for (const fact of existing) {
    const key = fact.id || fact.statement || JSON.stringify(fact);
    existingMap.set(key, fact);
  }
  for (const fact of incoming) {
    const key = fact.id || fact.statement || JSON.stringify(fact);
    if (!existingMap.has(key)) {
      existingMap.set(key, fact);
    }
  }
  return Array.from(existingMap.values());
}

export async function seedEpistemicFacts() {
  console.log('Starting epistemic facts seed from SSOT sources...');
  
  const ssotFacts = await loadSsotFacts();
  console.log(`Loaded ${ssotFacts.length} facts from SSOT sources.`);
  
  const existingFacts = await loadExistingEpistemicFacts();
  console.log(`Loaded ${existingFacts.length} existing epistemic facts.`);
  
  const mergedFacts = mergeFacts(existingFacts, ssotFacts);
  console.log(`Merged facts count: ${mergedFacts.length}`);
  
  const outputPath = path.join(EPISTEMIC_FACTS_DIR, 'seeded-epistemic-facts.json');
  await writeJsonFile(outputPath, { facts: mergedFacts });
  console.log(`Seeded epistemic facts written to ${outputPath}`);
  
  return { facts: mergedFacts, source: 'ssot_seed' };
}

// Allow direct execution via npm run memory:seed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedEpistemicFacts().catch(err => {
    console.error('Memory seed failed:', err);
    process.exit(1);
  });
}