// Find money-making ideas in your files
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const FILE_LIST = path.join(ROOT, 'Lumin-Memory', '01_INDEX', 'file_list.txt');
const OUT_DIR = path.join(ROOT, 'Lumin-Memory', '02_EXTRACTED', 'revenue');

console.log('Looking for money ideas...');

if (!fs.existsSync(FILE_LIST)) {
  console.log('No file list found. Run simple_extract.mjs first.');
  process.exit(1);
}

const files = fs.readFileSync(FILE_LIST, 'utf8').split('\n').filter(f => f.trim());
const moneyIdeas = [];

// Money keywords
const moneyWords = [
  'money', 'revenue', 'dollar', '$', 'price', 'subscription',
  'stripe', 'payment', 'charge', 'sell', 'buy', 'offer',
  'real estate', 'follow up', 'crm', 'lead', 'client',
  'api cost', 'optimize', 'save', 'profit', 'income'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  try {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    
    // Count money word occurrences
    let score = 0;
    for (const word of moneyWords) {
      const matches = content.match(new RegExp(word, 'gi'));
      if (matches) score += matches.length;
    }
    
    if (score > 0) {
      // Get first 200 chars as preview
      const preview = content.substring(0, 200).replace(/\n/g, ' ') + '...';
      moneyIdeas.push({
        score,
        file: path.relative(ROOT, file),
        preview
      });
    }
  } catch (err) {
    // Skip errors
  }
}

// Sort by score
moneyIdeas.sort((a, b) => b.score - a.score);

// Create output
fs.mkdirSync(OUT_DIR, { recursive: true });

const report = `# MONEY IDEAS FOUND
Generated: ${new Date().toISOString()}
Files scanned: ${files.length}
Money ideas found: ${moneyIdeas.length}

## TOP IDEAS:
${moneyIdeas.slice(0, 10).map((idea, i) => `
${i + 1}. **Score: ${idea.score}** - ${idea.file}
${idea.preview}
`).join('\n')}

## RECOMMENDATION:
${moneyIdeas.length > 0 ? 'Build the highest scoring idea first.' : 'No clear money ideas found. Add more memory files.'}
`;

fs.writeFileSync(path.join(OUT_DIR, 'money_report.md'), report);
console.log('✅ Report saved:', path.join(OUT_DIR, 'money_report.md'));
