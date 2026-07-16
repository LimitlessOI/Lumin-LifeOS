/**
 * SYNOPSIS: Script — PreCommitScannerService.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
import fs from 'fs';
import path from 'path';

const secretPatterns = [
  /AKIA[0-9A-Z]{16}/, // AWS Access Key
  /[a-zA-Z0-9]{24}\.[a-zA-Z0-9]{6}\.[a-zA-Z0-9]{27}/, // JWT
  /[0-9a-f]{40}/, // Generic 40-char hex token
];

const placeholderPatterns = [
  /PLACEHOLDER/,
  /DUMMY/,
];

function isPlaceholder(line) {
  return placeholderPatterns.some((pattern) => pattern.test(line));
}

function scanForSecrets(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const findings = [];

  lines.forEach((line, index) => {
    if (!isPlaceholder(line)) {
      secretPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          findings.push({ line: index + 1, content: line.trim() });
        }
      });
    }
  });

  return findings;
}

export { scanForSecrets, isPlaceholder };
