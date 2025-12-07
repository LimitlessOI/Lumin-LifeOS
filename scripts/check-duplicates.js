#!/usr/bin/env node
/**
 * Check for duplicate variable declarations in server.js
 * This prevents deployment failures from duplicate declarations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '..', 'server.js');
const content = fs.readFileSync(serverPath, 'utf8');

// Find all let/var/const declarations
const declarations = [];
const lines = content.split('\n');

lines.forEach((line, index) => {
  // Match: let/var/const identifier = ...
  const match = line.match(/^(let|var|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=;]/);
  if (match) {
    const [, keyword, identifier] = match;
    declarations.push({
      line: index + 1,
      keyword,
      identifier,
      fullLine: line.trim()
    });
  }
});

// Find duplicates
const identifierMap = new Map();
const duplicates = [];

declarations.forEach(decl => {
  if (identifierMap.has(decl.identifier)) {
    duplicates.push({
      identifier: decl.identifier,
      first: identifierMap.get(decl.identifier),
      duplicate: decl
    });
  } else {
    identifierMap.set(decl.identifier, decl);
  }
});

if (duplicates.length > 0) {
  console.error('❌ DUPLICATE DECLARATIONS FOUND:\n');
  duplicates.forEach(dup => {
    console.error(`  ${dup.identifier}:`);
    console.error(`    First:  Line ${dup.first.line} - ${dup.first.fullLine}`);
    console.error(`    Duplicate: Line ${dup.duplicate.line} - ${dup.duplicate.fullLine}`);
    console.error('');
  });
  process.exit(1);
} else {
  console.log('✅ No duplicate declarations found');
  process.exit(0);
}
