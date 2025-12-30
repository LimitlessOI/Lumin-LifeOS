/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    KNOWLEDGE PROCESSOR                                             ║
 * ║                    Processes dumps from Lumin-Memory/00_INBOX/raw/              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// IMPORTANT: This is where YOUR dumps are located (with bullet character)
const KNOWLEDGE_RAW_DIR = path.join(ROOT, '•	Lumin-Memory', '00_INBOX', 'raw');
const INDEX_DIR = path.join(ROOT, 'knowledge', 'index');

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function findAllDumps(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    console.log(`   Looking for: •	Lumin-Memory/00_INBOX/raw/`);
    // Try alternative path without bullet
    const altPath = path.join(ROOT, 'Lumin-Memory', '00_INBOX', 'raw');
    if (fs.existsSync(altPath)) {
      console.log(`   Found alternative: Lumin-Memory/00_INBOX/raw/`);
      return findAllDumps(altPath);
    }
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findAllDumps(fullPath));
    } else if (entry.isFile()) {
      // Include .md, .txt, and files without extension (like "GPT dump 01")
      if (/\.(md|txt)$/i.test(entry.name) || !entry.name.includes('.')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function extractIdeasFromDump(content, filename) {
  // Simple extraction without AI (fast, reliable)
  const ideas = [];
  
  // Look for patterns that indicate business ideas
  const ideaPatterns = [
    /(?:idea|concept|build|create|app|tool|platform|service|product):\s*([^\n]+)/gi,
    /(?:we could|we should|let's|I want to)\s+(?:build|create|make)\s+([^\n.]+)/gi,
    /(?:business model|revenue|monetize|charge|pricing):\s*([^\n]+)/gi,
  ];
  
  for (const pattern of ideaPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      ideas.push({
        text: match[1].trim(),
        context: content.substring(Math.max(0, match.index - 100), match.index + match[0].length + 100)
      });
    }
  }
  
  // Extract any bullet points or numbered lists
  const listItems = content.match(/^[\s]*[-*•]\s+.{20,200}$/gm) || [];
  const numberedItems = content.match(/^\d+[\.\)]\s+.{20,200}$/gm) || [];
  
  return {
    ideas: ideas.slice(0, 10), // Max 10 ideas per file
    listItems: listItems.slice(0, 20),
    numberedItems: numberedItems.slice(0, 20)
  };
}

async function processAllDumps(limit = null) {
  console.log('\n📚 KNOWLEDGE PROCESSOR');
  console.log('='.repeat(60));
  console.log(`📁 Source: ${KNOWLEDGE_RAW_DIR}`);
  console.log(`📂 Output: ${INDEX_DIR}`);
  
  // Ensure output directory exists
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  
  // Find all dump files
  const files = findAllDumps(KNOWLEDGE_RAW_DIR);
  console.log(`\n📄 Found ${files.length} dump files:`);
  files.forEach(f => console.log(`   - ${path.basename(f)}`));
  
  if (files.length === 0) {
    console.log('\n⚠️ No files found!');
    console.log('   Make sure •	Lumin-Memory/00_INBOX/raw/ exists and contains dump files.');
    return { processed: 0, entries: [] };
  }
  
  // Load existing index to check for duplicates
  const indexPath = path.join(INDEX_DIR, 'entries.jsonl');
  const existingHashes = new Set();
  
  if (fs.existsSync(indexPath)) {
    const lines = fs.readFileSync(indexPath, 'utf-8').split('\n').filter(Boolean);
    lines.forEach(line => {
      try {
        const entry = JSON.parse(line);
        existingHashes.add(entry.sha256);
      } catch (e) {}
    });
    console.log(`\n📖 Existing index: ${existingHashes.size} entries`);
  }
  
  // Process files
  const toProcess = limit ? files.slice(0, limit) : files;
  const newEntries = [];
  let skipped = 0;
  
  console.log(`\n🔄 Processing ${toProcess.length} files...\n`);
  
  for (const filePath of toProcess) {
    const filename = path.basename(filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');
      
      // Skip duplicates
      if (existingHashes.has(sha256)) {
        console.log(`⏭️  Skipping (duplicate): ${filename}`);
        skipped++;
        continue;
      }
      
      console.log(`📄 Processing: ${filename}`);
      
      // Extract ideas
      const extracted = await extractIdeasFromDump(content, filename);
      
      const entry = {
        id: `entry_${sha256.substring(0, 16)}`,
        source: path.relative(ROOT, filePath),
        filename: filename,
        sha256: sha256,
        content_length: content.length,
        content_preview: content.substring(0, 500),
        ideas_found: extracted.ideas.length,
        ideas: extracted.ideas,
        list_items: extracted.listItems.length,
        numbered_items: extracted.numberedItems.length,
        processed_at: new Date().toISOString()
      };
      
      newEntries.push(entry);
      existingHashes.add(sha256);
      
      console.log(`   ✅ Extracted ${extracted.ideas.length} ideas, ${extracted.listItems.length} list items`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Append new entries to index
  if (newEntries.length > 0) {
    const newLines = newEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.appendFileSync(indexPath, newLines);
    console.log(`\n✅ Added ${newEntries.length} new entries to index`);
  }
  
  // Update manifest
  const manifest = {
    total_entries: existingHashes.size,
    last_processed: new Date().toISOString(),
    source_dir: KNOWLEDGE_RAW_DIR,
    files_found: files.length,
    new_entries: newEntries.length,
    duplicates_skipped: skipped
  };
  
  fs.writeFileSync(
    path.join(INDEX_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files found:     ${files.length}`);
  console.log(`New entries added:     ${newEntries.length}`);
  console.log(`Duplicates skipped:    ${skipped}`);
  console.log(`Total in index:        ${existingHashes.size}`);
  console.log(`Index location:        ${indexPath}`);
  
  return { processed: newEntries.length, skipped, total: existingHashes.size, entries: newEntries };
}

// Run if called directly: node scripts/process-knowledge.js [limit]
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].includes('process-knowledge')) {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : null;

  console.log(limit ? `Processing first ${limit} files...` : 'Processing all files...');
  processAllDumps(limit)
    .then(result => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { processAllDumps, findAllDumps, KNOWLEDGE_RAW_DIR };
