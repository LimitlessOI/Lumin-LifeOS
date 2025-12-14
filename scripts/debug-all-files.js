/**
 * Comprehensive File Debugging Script
 * Scans all files for common bugs and issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Valid COUNCIL_MEMBERS keys
const VALID_COUNCIL_KEYS = [
  'ollama_deepseek', 'ollama_llama', 'deepseek',
  'ollama_deepseek_coder_v2', 'ollama_deepseek_coder_33b',
  'ollama_qwen_coder_32b', 'ollama_codestral',
  'ollama_deepseek_v3', 'ollama_llama_3_3_70b',
  'ollama_qwen_2_5_72b', 'ollama_gemma_2_27b', 'ollama_phi3',
  'chatgpt', 'gemini', 'grok',
];

// Invalid patterns (model registry names, not COUNCIL_MEMBERS keys)
const INVALID_MODEL_PATTERNS = [
  { pattern: /['"]deepseek-v3['"]/, correct: 'ollama_deepseek_v3' },
  { pattern: /['"]deepseek-r1:32b['"]/, correct: 'ollama_deepseek' },
  { pattern: /['"]deepseek-r1:70b['"]/, correct: 'ollama_deepseek' },
  { pattern: /['"]llama3\.3:70b['"]/, correct: 'ollama_llama_3_3_70b' },
  { pattern: /['"]qwen2\.5:72b['"]/, correct: 'ollama_qwen_2_5_72b' },
];

// Bug patterns to detect
const BUG_PATTERNS = [
  {
    name: 'Opt-out logic (should be opt-in)',
    pattern: /useOpenSourceCouncil.*!==\s*false/,
    severity: 'error',
    fix: 'Change to === true for opt-in',
  },
  {
    name: 'Invalid model key',
    patterns: INVALID_MODEL_PATTERNS,
    severity: 'error',
  },
  {
    name: 'Missing await',
    pattern: /callCouncilMember\([^)]+\)(?!\s*\.(then|catch))/,
    context: /^(?!.*await\s+callCouncilMember)/m,
    severity: 'warning',
  },
  {
    name: 'Unhandled promise',
    pattern: /^\s*[^=]*callCouncilMember\([^)]+\)(?!\s*;?\s*$)/m,
    severity: 'warning',
  },
];

function findFiles(dir, extensions = ['.js'], ignoreDirs = ['node_modules', '.git', '.cursor']) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  const relativePath = path.relative(process.cwd(), filePath);

  // Check for callCouncilMember calls
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Pattern 1: Invalid model keys
    if (line.includes('callCouncilMember')) {
      const match = line.match(/callCouncilMember\s*\(\s*['"]([^'"]+)['"]/);
      if (match) {
        const modelKey = match[1];
        if (!VALID_COUNCIL_KEYS.includes(modelKey)) {
          // Check if it matches invalid patterns
          for (const invalid of INVALID_MODEL_PATTERNS) {
            if (invalid.pattern.test(line)) {
              issues.push({
                file: relativePath,
                line: lineNum,
                type: 'invalid_model_key',
                severity: 'error',
                message: `Invalid model key: "${modelKey}" should be "${invalid.correct}"`,
                code: line.trim(),
              });
              break;
            }
          }
        }
      }
    }

    // Pattern 2: Opt-out logic (skip debug scripts themselves)
    if (line.includes('useOpenSourceCouncil') && line.includes('!== false') && 
        !relativePath.includes('debug-all-files.js') && !relativePath.includes('validate-model-keys.js')) {
      issues.push({
        file: relativePath,
        line: lineNum,
        type: 'opt_out_logic',
        severity: 'error',
        message: 'Opt-out logic detected (should use === true for opt-in)',
        code: line.trim(),
      });
    }

    // Pattern 3: Missing await (basic check)
    if (line.includes('callCouncilMember') && !line.includes('await') && !line.includes('return') && !line.includes('const') && !line.includes('let') && !line.includes('var')) {
      // This is a basic check - might have false positives
      if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        issues.push({
          file: relativePath,
          line: lineNum,
          type: 'possible_missing_await',
          severity: 'warning',
          message: 'Possible missing await on callCouncilMember',
          code: line.trim(),
        });
      }
    }
  });

  return issues;
}

async function main() {
  console.log('🔍 Comprehensive File Debugging - AI Counsel OS\n');
  console.log('Scanning all JavaScript files...\n');

  const rootDir = path.join(__dirname, '..');
  const files = findFiles(rootDir, ['.js'], ['node_modules', '.git', '.cursor', 'tests']);
  
  console.log(`Found ${files.length} files to analyze\n`);

  const allIssues = [];
  const fileStats = { total: files.length, withIssues: 0 };

  for (const file of files) {
    try {
      const issues = analyzeFile(file);
      if (issues.length > 0) {
        allIssues.push(...issues);
        fileStats.withIssues++;
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${file}: ${error.message}`);
    }
  }

  // Group by type and severity
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  
  const byType = {};
  allIssues.forEach(issue => {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  });

  // Report
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Files analyzed: ${fileStats.total}`);
  console.log(`Files with issues: ${fileStats.withIssues}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ ERRORS (Must Fix)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    Object.entries(byType).forEach(([type, typeIssues]) => {
      if (typeIssues[0].severity === 'error') {
        console.log(`\n${type.toUpperCase()} (${typeIssues.length} issues):`);
        typeIssues.forEach(issue => {
          console.log(`\n  ${issue.file}:${issue.line}`);
          console.log(`  ${issue.message}`);
          console.log(`  Code: ${issue.code}`);
        });
      }
    });
  }

  if (warnings.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  WARNINGS (Review)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    Object.entries(byType).forEach(([type, typeIssues]) => {
      if (typeIssues[0].severity === 'warning') {
        console.log(`\n${type.toUpperCase()} (${typeIssues.length} issues):`);
        typeIssues.slice(0, 10).forEach(issue => { // Limit to first 10
          console.log(`\n  ${issue.file}:${issue.line}`);
          console.log(`  ${issue.message}`);
        });
        if (typeIssues.length > 10) {
          console.log(`  ... and ${typeIssues.length - 10} more`);
        }
      }
    });
  }

  if (allIssues.length === 0) {
    console.log('✅ No issues found!');
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'docs', 'debugging', 'static-analysis-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    filesAnalyzed: fileStats.total,
    filesWithIssues: fileStats.withIssues,
    totalIssues: allIssues.length,
    errors: errors.length,
    warnings: warnings.length,
    issues: allIssues,
  }, null, 2));

  console.log(`\n📄 Full report saved to: ${reportPath}`);

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(console.error);
