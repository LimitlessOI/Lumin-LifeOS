/**
 * KNOWLEDGE PROCESSOR
 * Reads dumps from Lumin-Memory/00_INBOX/raw/
 * Outputs to knowledge/index/entries.jsonl
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// YOUR DUMP LOCATION (with bullet character)
const RAW_DIR = path.join(ROOT, '•	Lumin-Memory', '00_INBOX', 'raw');
const INDEX_DIR = path.join(ROOT, 'knowledge', 'index');

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function findFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Not found: ${dir}`);
    // Try alternative path without bullet
    const altPath = path.join(ROOT, 'Lumin-Memory', '00_INBOX', 'raw');
    if (fs.existsSync(altPath)) {
      console.log(`   Found alternative: Lumin-Memory/00_INBOX/raw/`);
      return findFiles(altPath);
    }
    return [];
  }
  
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath));
    } else if (entry.name !== '.DS_Store' && entry.name !== 'README.md') {
      files.push(fullPath);
    }
  }
  return files;
}

function extractIdeas(content) {
  const ideas = [];
  
  // Find business/software ideas
  const patterns = [
    /(?:idea|concept|build|create|app|tool|platform|product)[:\s]+([^\n]{20,200})/gi,
    /(?:we could|we should|I want to)\s+(?:build|create|make)\s+([^\n.]{20,150})/gi,
    /(?:business model|revenue|monetize)[:\s]+([^\n]{20,200})/gi,
    /(?:feature|functionality)[:\s]+([^\n]{20,200})/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      ideas.push(match[1].trim());
    }
  }
  
  return [...new Set(ideas)].slice(0, 15); // Unique, max 15
}

function extractKeyTopics(content) {
  const topics = new Set();
  const keywords = [
    'AI', 'automation', 'income', 'drone', 'council', 'ollama', 'api',
    'cost', 'savings', 'business', 'revenue', 'stripe', 'payment',
    'video', 'voice', 'phone', 'twilio', 'recruitment', 'agent',
    'self-programming', 'memory', 'knowledge', 'railway', 'neon'
  ];
  
  const lower = content.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      topics.add(kw);
    }
  }
  
  return Array.from(topics);
}

async function processAll() {
  console.log('\n' + '='.repeat(60));
  console.log('📚 KNOWLEDGE PROCESSOR');
  console.log('='.repeat(60));
  console.log(`\n📁 Source: ${RAW_DIR}`);
  console.log(`📂 Output: ${INDEX_DIR}\n`);
  
  // Ensure output directory
  fs.mkdirSync(INDEX_DIR, { recursive: true });
  
  // Find all files
  const files = findFiles(RAW_DIR);
  console.log(`Found ${files.length} dump files:\n`);
  files.forEach(f => console.log(`  📄 ${path.basename(f)}`));
  
  if (files.length === 0) {
    console.log('\n⚠️  No files found! Check that Lumin-Memory/00_INBOX/raw/ exists.');
    return;
  }
  
  // Load existing entries
  const indexPath = path.join(INDEX_DIR, 'entries.jsonl');
  const existingHashes = new Set();
  
  if (fs.existsSync(indexPath)) {
    fs.readFileSync(indexPath, 'utf-8').split('\n').filter(Boolean).forEach(line => {
      try { existingHashes.add(JSON.parse(line).sha256); } catch {}
    });
    console.log(`\n📖 Existing entries: ${existingHashes.size}`);
  }
  
  // Process each file
  console.log('\n🔄 Processing...\n');
  const newEntries = [];
  
  for (const filePath of files) {
    const filename = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const sha = hash(content);
    
    if (existingHashes.has(sha)) {
      console.log(`⏭️  Skip (duplicate): ${filename}`);
      continue;
    }
    
    const ideas = extractIdeas(content);
    const topics = extractKeyTopics(content);
    
    const entry = {
      id: `entry_${sha}`,
      filename: filename,
      source: path.relative(ROOT, filePath),
      sha256: sha,
      size: content.length,
      preview: content.substring(0, 300).replace(/\n/g, ' '),
      ideas: ideas,
      topics: topics,
      ideas_count: ideas.length,
      processed_at: new Date().toISOString()
    };
    
    newEntries.push(entry);
    console.log(`✅ ${filename} → ${ideas.length} ideas, ${topics.length} topics`);
  }
  
  // Save new entries
  if (newEntries.length > 0) {
    const lines = newEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.appendFileSync(indexPath, lines);
  }
  
  // Create manifest
  const manifest = {
    total_entries: existingHashes.size + newEntries.length,
    new_entries: newEntries.length,
    last_run: new Date().toISOString(),
    source: RAW_DIR
  };
  fs.writeFileSync(path.join(INDEX_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DONE');
  console.log('='.repeat(60));
  console.log(`New entries:    ${newEntries.length}`);
  console.log(`Total entries:  ${manifest.total_entries}`);
  console.log(`Index:          knowledge/index/entries.jsonl`);
  
  // Show extracted ideas
  if (newEntries.length > 0) {
    console.log('\n💡 SAMPLE IDEAS EXTRACTED:\n');
    let count = 0;
    for (const entry of newEntries) {
      for (const idea of entry.ideas.slice(0, 2)) {
        console.log(`  • ${idea.substring(0, 100)}`);
        count++;
        if (count >= 10) break;
      }
      if (count >= 10) break;
    }
  }
}

processAll().catch(console.error);
