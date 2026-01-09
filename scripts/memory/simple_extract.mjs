// Simple memory extractor - just counts files
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'Lumin-Memory', '00_INBOX', 'raw');
const OUT_FILE = path.join(ROOT, 'Lumin-Memory', '01_INDEX', 'file_list.txt');

console.log('Looking in:', RAW_DIR);

if (!fs.existsSync(RAW_DIR)) {
  console.log('No raw directory found. Creating empty one.');
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

const files = [];
function scan(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      scan(full);
    } else {
      files.push(full);
    }
  }
}

if (fs.existsSync(RAW_DIR)) {
  scan(RAW_DIR);
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, files.join('\n'));
console.log('Found', files.length, 'files. List saved to:', OUT_FILE);

// Show first few
console.log('\nFirst 5 files:');
files.slice(0, 5).forEach(f => console.log('  ', path.relative(ROOT, f)));
