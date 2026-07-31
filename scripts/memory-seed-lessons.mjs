#!/usr/bin/env node
/**
 * SYNOPSIS: Loads existing lessons_learned.json if present.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const MEMORY_DIR = join(ROOT, 'memory');
const LESSONS_DIR = join(MEMORY_DIR, 'lessons');
const LESSONS_FILE = join(MEMORY_DIR, 'lessons_learned.json');
const CONTINUITY_LOG_DIR = join(ROOT, 'AM36', 'CONTINUITY_LOG');

/**
 * Loads existing lessons_learned.json if present.
 * @returns {Promise<Array>}
 */
async function loadExistingLessons() {
  try {
    const raw = await readFile(LESSONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Reads all lesson markdown files from memory/lessons directory.
 * @returns {Promise<Array<{file: string, title: string, content: string}>>}
 */
async function readLessonFiles() {
  try {
    const files = await readdir(LESSONS_DIR);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    const lessons = [];
    for (const file of mdFiles) {
      const fullPath = join(LESSONS_DIR, file);
      const content = await readFile(fullPath, 'utf-8');
      // Extract title from first heading if present
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : basename(file, '.md');
      lessons.push({ file, title, content });
    }
    return lessons;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Reads all receipt markdown files from AM36/CONTINUITY_LOG directory.
 * @returns {Promise<Array<{file: string, title: string, content: string}>>}
 */
async function readReceiptFiles() {
  try {
    const files = await readdir(CONTINUITY_LOG_DIR);
    const mdFiles = files.filter((f) => f.endsWith('.md'));
    const receipts = [];
    for (const file of mdFiles) {
      const fullPath = join(CONTINUITY_LOG_DIR, file);
      const content = await readFile(fullPath, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : basename(file, '.md');
      receipts.push({ file, title, content });
    }
    return receipts;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Seeds lessons_learned from lesson files and updates documents.
 * @returns {Promise<{lessonsSeeded: number, documentsUpdated: number}>}
 */
export async function seedLessonsLearned() {
  const [existingLessons, lessonFiles, receiptFiles] = await Promise.all([
    loadExistingLessons(),
    readLessonFiles(),
    readReceiptFiles(),
  ]);

  const now = new Date().toISOString();
  const existingIds = new Set(existingLessons.map((l) => l.id));

  const newLessons = [];
  for (const lesson of lessonFiles) {
    const id = lesson.file.replace(/\.md$/, '');
    if (existingIds.has(id)) {
      continue;
    }
    newLessons.push({
      id,
      title: lesson.title,
      file: lesson.file,
      content: lesson.content,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Add receipts as new lessons
  for (const receipt of receiptFiles) {
    const id = `receipt-${receipt.file.replace(/\.md$/, '')}`;
    if (existingIds.has(id)) {
      continue;
    }
    newLessons.push({
      id,
      title: `Receipt: ${receipt.title}`,
      file: join('receipts', receipt.file).replace(/\\/g, '/'), // Store path relative to MEMORY_DIR
      content: receipt.content,
      createdAt: now,
      updatedAt: now,
      source: 'receipt',
    });
  }

  const mergedLessons = [...existingLessons, ...newLessons];
  await mkdir(dirname(LESSONS_FILE), { recursive: true });
  await writeFile(LESSONS_FILE, JSON.stringify(mergedLessons, null, 2), 'utf-8');

  // Update documents - update the memory index document if it exists
  let documentsUpdated = 0;
  const indexFile = join(MEMORY_DIR, 'index.md');
  try {
    const indexContent = await readFile(indexFile, 'utf-8');
    const lessonSection = mergedLessons
      .map((l) => {
        const filePath = l.source === 'receipt' ? join('..', 'AM36', 'CONTINUITY_LOG', basename(l.file)).replace(/\\/g, '/') : join('lessons', l.file).replace(/\\/g, '/');
        return `- [${l.title}](${filePath})`;
      })
      .join('\n');
    const updatedIndex = indexContent.replace(
      /(## Lessons Learned\s*\n)([\s\S]*?)(?=\n## |$)/,
      `$1\n${lessonSection}\n`
    );
    if (updatedIndex !== indexContent) {
      await writeFile(indexFile, updatedIndex, 'utf-8');
      documentsUpdated = 1;
    }
  } catch {
    // index file doesn't exist, skip
  }

  console.log(`Seeded ${newLessons.length} new lessons (${mergedLessons.length} total)`);
  if (documentsUpdated > 0) {
    console.log(`Updated ${documentsUpdated} document`);
  } else {
    console.log('No documents updated');
  }

  return {
    lessonsSeeded: newLessons.length,
    documentsUpdated,
  };
}

// Allow running directly: npm run memory:seed-lessons
if (process.argv[1] === __filename) {
  seedLessonsLearned()
    .then((result) => {
      console.log(`Seed complete: ${JSON.stringify(result)}`);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}