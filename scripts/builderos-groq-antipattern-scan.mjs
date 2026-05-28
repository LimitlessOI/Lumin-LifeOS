import { scanForGroqAntipatterns } from './builderos-groq-antipattern-utils.mjs';

/**
 * Scan for 9 confirmed groq_llama failure patterns
 * @param {string[]} lines - lines of code to scan
 * @returns {Object[]} findings - list of antipatterns found
 */
export function scanForGroqAntipatterns(lines) {
  const findings = [];

  // PATTERN 1: missing import
  // Examples: import 'fs' is missing
  const importRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+import[\s{(]/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (importRe.test(l)) {
      findings.push({ pattern: 'MISSING_IMPORT', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 2: missing export
  // Examples: export 'fs' is missing
  const exportRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+export[\s{(]/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (exportRe.test(l)) {
      findings.push({ pattern: 'MISSING_EXPORT', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 3: unused import
  // Examples: import 'fs' is unused
  const unusedImportRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+import[\s{(]/;
  const usedImportRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+import[\s{(]/;
  const usedExportRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+export[\s{(]/;
  const usedRe = new RegExp(`(${usedImportRe.source})|(${usedExportRe.source})`);
  const unusedRe = new RegExp(`(${unusedImportRe.source})`);
  const usedImports = new Set();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (usedRe.test(l)) {
      usedImports.add(l);
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (unusedRe.test(l) && !usedImports.has(l)) {
      findings.push({ pattern: 'UNUSED_IMPORT', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 4: unused export
  // Examples: export 'fs' is unused
  const unusedExportRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+export[\s{(]/;
  const usedExportRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+export[\s{(]/;
  const usedRe = new RegExp(`(${usedExportRe.source})`);
  const usedExports = new Set();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (usedRe.test(l)) {
      usedExports.add(l);
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (unusedExportRe.test(l) && !usedExports.has(l)) {
      findings.push({ pattern: 'UNUSED_EXPORT', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 5: missing return
  // Examples: function foo() { } is missing return
  const functionRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+function[\s{(]/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (functionRe.test(l)) {
      findings.push({ pattern: 'MISSING_RETURN', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 6: missing semicolon
  // Examples: console.log('hello' is missing semicolon
  const consoleRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+console[\s{(]/;
  const semicolonRe = /[^;]$/
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (consoleRe.test(l) && semicolonRe.test(l)) {
      findings.push({ pattern: 'MISSING_SEMICOLON', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 7: missing space after comma
  // Examples: console.log('hello', 'world' is missing space after comma
  const commaRe = /,[^ ]/
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (commaRe.test(l)) {
      findings.push({ pattern: 'MISSING_SPACE_AFTER_COMMA', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  // PATTERN 8: json fence
  // Examples: console.log('{"key": "value"}' is json fence
  const jsonRe = /"[^"]*"/
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (jsonRe.test(l)) {
      findings.push({ pattern: 'JSON_FENCE', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }
  // PATTERN 8 fix: Find the existing check on the line that reads: `if (l === '' || l === '' || l === '')`. Add `|| l === ''` before the closing paren, so all four fence types are detected.
  if (l === '' || l === '' || l === '' || l === '') {
    findings.push({ pattern: 'JSON_FENCE', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
  }

  // PATTERN 9: import-merge bug (groq concatenates consecutive import lines)
  // Examples: pathimport 'path', urlimport 'url', fsimport 'fs'
  const importMergeRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+import[\s{(]/;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (importMergeRe.test(l)) {
      findings.push({ pattern: 'IMPORT_MERGE_BUG', line: l.slice(0, 100), lineNum: i + 1, severity: 'HIGH' });
    }
  }

  // PATTERN 10: unused variable
  // Examples: let x = 5; is unused
  const letRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+let[\s{(]/;
  const usedRe = new RegExp(`(${usedImportRe.source})|(${usedExportRe.source})`);
  const usedVars = new Set();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (usedRe.test(l)) {
      usedVars.add(l);
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') || l.startsWith('*')) continue;
    if (letRe.test(l) && !usedVars.has(l)) {
      findings.push({ pattern: 'UNUSED_VARIABLE', line: l.slice(0, 100), lineNum: i + 1, severity: 'LOW' });
    }
  }

  return findings;
}

// PATTERN 11: unused function
// Examples: function foo() { } is unused
const functionRe = /^[a-zA-Z_$][a-zA-Z0-9_$]+function[\s{(]/;
const usedRe = new RegExp(`(${usedImportRe.source})|(${usedExportRe.source})`);
const usedFuncs = new Set();
for (let i = 0; i < lines.length; i