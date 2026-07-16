/**
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Service module — SecretScannerService.
 */
import fs from 'fs';
import path from 'path';

const secretPatterns = [
  /AKIA[0-9A-Z]{16}/, // AWS Access Key ID
  /[0-9a-fA-F]{40}/,  // Generic 40-character hex secret
  // Add more patterns as needed
];

const placeholderPatterns = [
  /<AWS_ACCESS_KEY>/, // Placeholder for AWS Access Key ID
  /<GENERIC_HEX_KEY>/ // Placeholder for generic hex key
  // Add more placeholder patterns as needed
];

function isPlaceholderMatch(line) {
  return placeholderPatterns.some(pattern => pattern.test(line));
}

function scanSecretsPreCommit(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  
  const secretLines = lines.filter(line => {
    return secretPatterns.some(pattern => pattern.test(line)) && !isPlaceholderMatch(line);
  });

  return secretLines;
}

export { scanSecretsPreCommit, scanSecretsPreCommit as scanSecretsPreflight };
