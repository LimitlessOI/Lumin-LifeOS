// Process large files efficiently - for 200K+ line files
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'Lumin-Memory', '00_INBOX', 'raw');
const OUT_DIR = path.join(ROOT, 'Lumin-Memory', '02_EXTRACTED', 'revenue');

console.log('Processing large memory files efficiently...');

// Money keywords with weights
const MONEY_PATTERNS = [
  { pattern: /\$\d+/, weight: 10, name: 'dollar_amount' },
  { pattern: /revenue|money|profit/i, weight: 8, name: 'money_words' },
  { pattern: /real.?estate|realtor|property/i, weight: 9, name: 'real_estate' },
  { pattern: /stripe|payment|subscription/i, weight: 8, name: 'payment' },
  { pattern: /api.*cost|optimiz|savings/i, weight: 7, name: 'api_cost' },
  { pattern: /follow.?up|sequence|drip/i, weight: 6, name: 'follow_up' },
  { pattern: /crm|lead|prospect/i, weight: 6, name: 'crm' },
  { pattern: /launch|ship|release/i, weight: 5, name: 'launch' },
  { pattern: /\d{1,3}%/i, weight: 4, name: 'percentage' },
];

async function processFile(filePath) {
  return new Promise((resolve, reject) => {
    const ideas = [];
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let buffer = '';
    let inRelevantSection = false;

    rl.on('line', (line) => {
      lineNumber++;
      
      // Process in chunks of 10 lines to find relevant sections
      if (lineNumber % 10 === 0) {
        if (buffer.length > 0) {
          const score = scoreText(buffer);
          if (score > 5) {
            ideas.push({
              score,
              file: path.relative(ROOT, filePath),
              line: lineNumber - 10,
              content: buffer.substring(0, 300) + (buffer.length > 300 ? '...' : ''),
              fullBuffer: buffer
            });
          }
          buffer = '';
        }
      }
      
      // Check if line has money keywords
      let lineScore = 0;
      for (const { pattern, weight } of MONEY_PATTERNS) {
        if (pattern.test(line)) {
          lineScore += weight;
          inRelevantSection = true;
        }
      }
      
      if (inRelevantSection || lineScore > 0) {
        buffer += line + ' ';
        
        // Reset section after 20 lines
        if (buffer.split(' ').length > 200) {
          inRelevantSection = false;
        }
      }
    });

    rl.on('close', () => {
      // Process remaining buffer
      if (buffer.length > 0) {
        const score = scoreText(buffer);
        if (score > 5) {
          ideas.push({
            score,
            file: path.relative(ROOT, filePath),
            line: lineNumber,
            content: buffer.substring(0, 300) + '...'
          });
        }
      }
      resolve(ideas);
    });

    rl.on('error', reject);
  });
}

function scoreText(text) {
  let score = 0;
  const lower = text.toLowerCase();
  
  for (const { pattern, weight } of MONEY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) score += weight * matches.length;
  }
  
  // Bonus for actionable phrases
  if (/\$\d+/.test(text)) score += 15;
  if (/we should|build|create|implement/i.test(text)) score += 5;
  if (/today|now|immediate/i.test(text)) score += 3;
  
  return score;
}

async function main() {
  const files = fs.readdirSync(RAW_DIR).map(f => path.join(RAW_DIR, f));
  const allIdeas = [];
  
  console.log(`Processing ${files.length} files...`);
  
  for (const file of files) {
    try {
      console.log(`  Reading: ${path.basename(file)}`);
      const ideas = await processFile(file);
      allIdeas.push(...ideas);
      console.log(`    Found ${ideas.length} ideas`);
    } catch (err) {
      console.log(`    Error with ${file}:`, err.message);
    }
  }
  
  // Sort by score
  allIdeas.sort((a, b) => b.score - a.score);
  
  // Create output
  fs.mkdirSync(OUT_DIR, { recursive: true });
  
  // Top 20 ideas
  const topIdeas = allIdeas.slice(0, 20);
  
  const report = `# TOP MONEY IDEAS FROM LARGE FILES
Generated: ${new Date().toISOString()}
Total files processed: ${files.length}
Total ideas found: ${allIdeas.length}

## 🥇 TOP 20 ACTIONABLE IDEAS:

${topIdeas.map((idea, i) => `
### ${i + 1}. ⭐ Score: ${idea.score}
**File:** ${idea.file} (around line ${idea.line})

${idea.content}

---`).join('\n')}

## 📊 ANALYSIS:
${allIdeas.length > 0 ? 
  `Found ${allIdeas.filter(i => i.score > 15).length} high-confidence ideas (score > 15)
Found ${allIdeas.filter(i => i.score > 10).length} medium-confidence ideas (score > 10)
Most common themes: ${findThemes(allIdeas)}` : 
  'No strong money ideas found. Try different keywords.'}

## 🚀 RECOMMENDED NEXT STEPS:
1. Build the #1 idea (highest score)
2. Create MVP for that idea within 48 hours
3. Test with real users immediately
4. Iterate based on feedback
`;

  fs.writeFileSync(path.join(OUT_DIR, 'top_ideas_large_files.md'), report);
  console.log(`\n✅ Processed all files. Found ${allIdeas.length} total ideas.`);
  console.log(`📄 Report: ${path.join(OUT_DIR, 'top_ideas_large_files.md')}`);
  
  // Also save JSON for programmatic use
  const jsonOutput = {
    generated: new Date().toISOString(),
    totalFiles: files.length,
    totalIdeas: allIdeas.length,
    topIdeas: topIdeas.map(i => ({
      score: i.score,
      file: i.file,
      line: i.line,
      preview: i.content.substring(0, 150)
    }))
  };
  
  fs.writeFileSync(
    path.join(OUT_DIR, 'ideas_summary.json'),
    JSON.stringify(jsonOutput, null, 2)
  );
}

function findThemes(ideas) {
  const themes = {};
  ideas.forEach(idea => {
    for (const { pattern, name } of MONEY_PATTERNS) {
      if (pattern.test(idea.content)) {
        themes[name] = (themes[name] || 0) + 1;
      }
    }
  });
  
  return Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');
}

main().catch(console.error);
