/**
 * Model Key Validator
 * Validates all callCouncilMember calls use correct COUNCIL_MEMBERS keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Valid COUNCIL_MEMBERS keys (from server.js)
const VALID_KEYS = [
  'ollama_deepseek',
  'ollama_llama',
  'deepseek',
  'ollama_deepseek_coder_v2',
  'ollama_deepseek_coder_33b',
  'ollama_qwen_coder_32b',
  'ollama_codestral',
  'ollama_deepseek_v3',
  'ollama_llama_3_3_70b',
  'ollama_qwen_2_5_72b',
  'ollama_gemma_2_27b',
  'ollama_phi3',
  'chatgpt',
  'gemini',
  'grok',
];

// Known invalid patterns (model registry names, not COUNCIL_MEMBERS keys)
const INVALID_PATTERNS = [
  /['"]deepseek-v3['"]/,
  /['"]deepseek-r1:32b['"]/,
  /['"]deepseek-r1:70b['"]/,
  /['"]llama3\.3:70b['"]/,
  /['"]qwen2\.5:72b['"]/,
  /['"]qwen2\.5:32b['"]/,
  /['"]gemma2:27b['"]/,
];

async function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    // Check for callCouncilMember calls
    if (line.includes('callCouncilMember')) {
      // Extract the model key (first string argument)
      const match = line.match(/callCouncilMember\s*\(\s*['"]([^'"]+)['"]/);
      if (match) {
        const modelKey = match[1];
        
        // Check if it's a valid key
        if (!VALID_KEYS.includes(modelKey)) {
          // Check if it matches invalid patterns
          const isInvalid = INVALID_PATTERNS.some(pattern => pattern.test(line));
          
          if (isInvalid || !modelKey.startsWith('ollama_') && !['chatgpt', 'gemini', 'grok', 'deepseek'].includes(modelKey)) {
            issues.push({
              file: filePath,
              line: index + 1,
              modelKey,
              lineContent: line.trim(),
              severity: 'error',
            });
          } else {
            // Might be a variable - check if it's suspicious
            if (!modelKey.includes('$') && !modelKey.includes('{') && !modelKey.includes('this.')) {
              issues.push({
                file: filePath,
                line: index + 1,
                modelKey,
                lineContent: line.trim(),
                severity: 'warning', // Might be valid, needs manual check
              });
            }
          }
        }
      }
    }

    // Check for useOpenSourceCouncil logic issues
    if (line.includes('useOpenSourceCouncil') && line.includes('!== false')) {
      issues.push({
        file: filePath,
        line: index + 1,
        issue: 'Opt-out logic detected (should be opt-in)',
        lineContent: line.trim(),
        severity: 'error',
      });
    }
  });

  return issues;
}

async function main() {
  console.log('🔍 Validating model keys across codebase...\n');

  const files = await glob('**/*.js', {
    ignore: ['node_modules/**', '*.test.js', '*.spec.js'],
    cwd: path.join(__dirname, '..'),
  });

  const allIssues = [];
  
  for (const file of files) {
    const filePath = path.join(__dirname, '..', file);
    try {
      const issues = await validateFile(filePath);
      allIssues.push(...issues);
    } catch (error) {
      console.warn(`⚠️  Could not validate ${file}: ${error.message}`);
    }
  }

  // Group by severity
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  console.log('📊 Validation Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log('');

  if (errors.length > 0) {
    console.log('❌ ERRORS (Must Fix):');
    errors.forEach(issue => {
      console.log(`\n  ${issue.file}:${issue.line}`);
      console.log(`  ${issue.lineContent}`);
      if (issue.modelKey) {
        console.log(`  Invalid key: "${issue.modelKey}"`);
        console.log(`  Valid keys: ${VALID_KEYS.filter(k => k.includes(issue.modelKey.split('-')[0])).join(', ') || 'None found'}`);
      }
      if (issue.issue) {
        console.log(`  Issue: ${issue.issue}`);
      }
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Review):');
    warnings.forEach(issue => {
      console.log(`\n  ${issue.file}:${issue.line}`);
      console.log(`  ${issue.lineContent}`);
      console.log(`  Key: "${issue.modelKey}" - Verify this is correct`);
    });
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ No issues found!');
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(console.error);
