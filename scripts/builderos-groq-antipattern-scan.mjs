// scripts/builderos-groq-antipattern-scan.mjs
import { readFileSync } from 'fs';
import { join } from 'path';

const PATTERN_RK_NOT_REQUIREKEY = /function\s+.*\s*{.*\srk,\spool.*}/;
const PATTERN_TEXT_TEMPLATE_TAG = /.*\pq\(text\)/;
const PATTERN_COUNT_NO_STAR = /COUNT\(\)/;
const PATTERN_MISSING_MULTIPLY = /ROUND\(\d+\)\[0-9]/;
const PATTERN_QUERY_NOT_DESTRUCTURED = /const\s+rows\s*=\sawait\s*\pq|const\s+result\s*=\sawait\s*\pq/;
const PATTERN_WRONG_IMPORT_PATH = /from\s+\'../startup\/db\.js\'|from\s+\'../startup\/auth\.js\'/;
const PATTERN_MODULE_LEVEL_ROUTER = /const\s+router\s*=\sexpress\.Router\(\)\s*;/;
const PATTERN_STUB_LINE_COUNT = /.*\.js$/;

function scanForGroqAntipatterns(filePath) {
  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  const findings = [];

  let lineCount = 0;
  for (const line of lines) {
    lineCount++;
    if (PATTERN_RK_NOT_REQUIREKEY.test(line)) {
      findings.push({
        pattern: 'PATTERN_RK_NOT_REQUIREKEY',
        line,
        lineNum: lineCount,
        severity: 'HIGH',
      });
    } else if (PATTERN_TEXT_TEMPLATE_TAG.test(line)) {
      findings.push({
        pattern: 'PATTERN_TEXT_TEMPLATE_TAG',
        line,
        lineNum: lineCount,
        severity: 'MEDIUM',
      });
    } else if (PATTERN_COUNT_NO_STAR.test(line)) {
      findings.push({
        pattern: 'PATTERN_COUNT_NO_STAR',
        line,
        lineNum: lineCount,
        severity: 'MEDIUM',
      });
    } else if (PATTERN_MISSING_MULTIPLY.test(line)) {
      const context = lines.slice(lineCount - 3, lineCount);
      if (context.some((c) => c.includes('ROUND(') && (c.includes('/1000') || c.includes('*1000')))) {
        findings.push({
          pattern: 'PATTERN_MISSING_MULTIPLY',
          line,
          lineNum: lineCount,
          severity: 'MEDIUM',
        });
      }
    } else if (PATTERN_QUERY_NOT_DESTRUCTURED.test(line)) {
      findings.push({
        pattern: 'PATTERN_QUERY_NOT_DESTRUCTURED',
        line,
        lineNum: lineCount,
        severity: 'MEDIUM',
      });
    } else if (PATTERN_WRONG_IMPORT_PATH.test(line)) {
      findings.push({
        pattern: 'PATTERN_WRONG_IMPORT_PATH',
        line,
        lineNum: lineCount,
        severity: 'HIGH',
      });
    } else if (PATTERN_MODULE_LEVEL_ROUTER.test(line)) {
      const fileContentLines = fileContent.split('\n');
      const hasExport = fileContentLines.some((c) => c.includes('exp create'));
      if (!hasExport) {
        findings.push({
          pattern: 'PATTERN_MODULE_LEVEL_ROUTER',
          line,
          lineNum: lineCount,
          severity: 'HIGH',
        });
      }
    } else if (PATTERN_STUB_LINE_COUNT.test(filePath) && lineCount < 30) {
      findings.push({
        pattern: 'PATTERN_STUB_LINE_COUNT',
        line,
        lineNum: lineCount,
        severity: 'HIGH',
      });
    }
  }

  return {
    ok: findings.length === 0,
    filePath,
    lineCount,
    findings,
  };
}

if (process.argv.length > 2) {
  const filePath = process.argv[2];
  const result = scanForGroqAntipatterns(filePath);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

export function scanForGroqAntipatterns(filePath) {
  return scanForGroqAntipatterns(filePath);
}