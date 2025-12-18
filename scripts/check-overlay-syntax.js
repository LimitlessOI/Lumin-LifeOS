#!/usr/bin/env node

/**
 * Overlay Syntax Checker
 * Validates JavaScript syntax in overlay HTML and JS files
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FILES_TO_CHECK = [
  'public/overlay/control.html',
  'public/overlay/extract-conversations.html',
  'public/overlay/index.html',
  'public/overlay/portal.html',
  'public/overlay/overlay-window.js',
  'public/overlay/command-center.js',
];

const PROJECT_ROOT = path.join(__dirname, '..');

let hasErrors = false;
const errors = [];

/**
 * Extract <script> blocks from HTML content
 */
function extractScriptBlocks(htmlContent) {
  const scripts = [];
  // Match both <script>...</script> and <script src="..."></script>
  const scriptRegex = /<script(?:\s+[^>]*)?>(.*?)<\/script>/gis;
  let match;
  
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    // Skip if it's an external script (has src attribute)
    if (match[0].includes('src=')) {
      continue;
    }
    scripts.push({
      content: match[1],
      fullMatch: match[0],
    });
  }
  
  return scripts;
}

/**
 * Check JavaScript syntax using vm.compileFunction
 */
function checkJSSyntax(code, filename, lineOffset = 0) {
  try {
    // Try to compile the code
    vm.compileFunction(code, [], {
      filename: filename,
      lineOffset: lineOffset,
    });
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Check a JavaScript file
 */
function checkJSFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ File not found: ${filePath}`);
    hasErrors = true;
    return;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const result = checkJSSyntax(content, fullPath);
    
    if (!result.valid) {
      errors.push(`❌ ${filePath}: ${result.error}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${filePath}`);
    }
  } catch (error) {
    errors.push(`❌ ${filePath}: ${error.message}`);
    hasErrors = true;
  }
}

/**
 * Check an HTML file
 */
function checkHTMLFile(filePath) {
  const fullPath = path.join(PROJECT_ROOT, filePath);
  
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ File not found: ${filePath}`);
    hasErrors = true;
    return;
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const scripts = extractScriptBlocks(content);
    
    if (scripts.length === 0) {
      console.log(`✅ ${filePath} (no inline scripts)`);
      return;
    }
    
    let fileHasErrors = false;
    
    scripts.forEach((script, index) => {
      // Skip empty scripts
      if (!script.content.trim()) {
        return;
      }
      
      const result = checkJSSyntax(script.content, `${fullPath}:script[${index}]`);
      
      if (!result.valid) {
        errors.push(`❌ ${filePath} (script block ${index + 1}): ${result.error}`);
        fileHasErrors = true;
        hasErrors = true;
      }
    });
    
    if (!fileHasErrors) {
      console.log(`✅ ${filePath} (${scripts.length} script block${scripts.length !== 1 ? 's' : ''})`);
    }
  } catch (error) {
    errors.push(`❌ ${filePath}: ${error.message}`);
    hasErrors = true;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking overlay files for syntax errors...\n');
  
  FILES_TO_CHECK.forEach(filePath => {
    if (filePath.endsWith('.js')) {
      checkJSFile(filePath);
    } else if (filePath.endsWith('.html')) {
      checkHTMLFile(filePath);
    } else {
      console.log(`⚠️  Skipping unknown file type: ${filePath}`);
    }
  });
  
  console.log('');
  
  if (hasErrors) {
    console.log('❌ Syntax errors found:\n');
    errors.forEach(error => console.log(error));
    console.log('\n❌ Syntax check failed!');
    process.exit(1);
  } else {
    console.log('✅ All files passed syntax check!');
    process.exit(0);
  }
}

// Run the check
main();
