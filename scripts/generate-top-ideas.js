import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const INPUT_FILE = path.join(ROOT, '• Lumin-Memory', '00_INBOX', 'raw', 'system-ideas.txt');
const OUTPUT_DIR = path.join(ROOT, 'knowledge', 'extracted-ideas');
const THREAD_DIR = path.join(ROOT, 'docs', 'THREAD_REALITY');

function categorize(text) {
  const normalized = text.toLowerCase();
  if (/automation|zapier|make\.com|workflow|ai council/.test(normalized)) return 'automation';
  if (/membership|villa|reiki|ritual|coaching/.test(normalized)) return 'membership';
  if (/website|landing|copy|audit|seo|wix/.test(normalized)) return 'web';
  if (/massage|pregnancy|midwife|reiki|placenta/.test(normalized)) return 'health';
  if (/training|lab|courses/.test(normalized)) return 'education';
  if (/video|testimonials|youtube|reel/.test(normalized)) return 'media';
  if (/retreat|events|booking/.test(normalized)) return 'events';
  return 'other';
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function main() {
  const raw = await fs.readFile(INPUT_FILE, 'utf8');
  const matches = [...raw.matchAll(/^\s*(\d+)\.\s+(.+)$/gm)];

  if (matches.length === 0) {
    console.warn('⚠️ No enumerated ideas found in input file.');
  }

  const ideas = matches.map((match, index) => {
    const ideaText = match[2].trim().replace(/\s+$/g, '');
    return {
      id: `idea-${String(index + 1).padStart(2, '0')}`,
      rank: index + 1,
      idea: ideaText,
      category: categorize(ideaText),
      score: 100 - index * 2,
      effort: 10 + index * 3,
      impact: 90 - index * 2,
      ease: 80 - index * 2,
      source: path.relative(ROOT, INPUT_FILE),
      extracted_at: new Date().toISOString()
    };
  });

  const timestamp = createTimestamp();
  const manualFile = path.join(OUTPUT_DIR, `manual-ideas-${timestamp}.json`);
  const threadDir = path.join(THREAD_DIR, 'outputs', timestamp);

  await ensureDir(OUTPUT_DIR);
  await ensureDir(threadDir);

  await fs.writeFile(manualFile, JSON.stringify(ideas, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(threadDir, 'manual-ideas.json'), JSON.stringify(ideas, null, 2) + '\n', 'utf8');

  console.log(`✅ Manual idea list written (${ideas.length} entries)`);
  console.log(`   - knowledge: ${manualFile}`);
  console.log(`   - thread proof: ${path.relative(ROOT, threadDir)}/manual-ideas.json`);
}

main().catch((err) => {
  console.error('❌ Manual idea generator failed:', err.message);
  process.exit(1);
});
