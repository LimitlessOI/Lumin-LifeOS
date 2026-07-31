/**
 * SYNOPSIS: Exports scanSecrets — scripts/preCommitScannerService.js.
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const secretPatterns = [
  { name: 'AWS Access Key ID', pattern: /(A3T[A-Z0-9]|AKIA|ASIA|AGPA|AIDA)([A-Z0-9]{16})/g },
  { name: 'AWS Secret Access Key', pattern: /[0-9a-zA-Z/+]{40}/g },
  { name: 'GitHub Personal Access Token', pattern: /ghp_[0-9a-zA-Z]{36}/g },
  { name: 'Slack Webhook URL', pattern: /T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/g },
  { name: 'Generic API Key', pattern: /[a-zA-Z0-9]{32,64}/g }, // More generic, might need refinement
];

const placeholderPatterns = [
  /YOUR_AWS_ACCESS_KEY_ID/g,
  /YOUR_AWS_SECRET_ACCESS_KEY/g,
  /YOUR_GITHUB_TOKEN/g,
  /YOUR_SLACK_WEBHOOK_URL/g,
  /YOUR_API_KEY/g,
  /PLACEHOLDER_API_KEY/g,
  /REPLACE_WITH_YOUR_KEY/g,
];

function isPlaceholder(match) {
  return placeholderPatterns.some(p => p.test(match));
}

export function scanSecrets() {
  console.log('Running secret scan...');
  let hasSecrets = false;
  const changedFiles = execSync('git diff --cached --name-only --diff-filter=ACM').toString().split('\n').filter(Boolean);

  for (const file of changedFiles) {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      continue; // File might have been deleted
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    for (const secretDef of secretPatterns) {
      let match;
      while ((match = secretDef.pattern.exec(content)) !== null) {
        if (!isPlaceholder(match[0])) {
          console.error(`Potential ${secretDef.name} found in ${file}: ${match[0]}`);
          hasSecrets = true;
        }
      }
    }
  }

  if (hasSecrets) {
    console.error('Secret scan failed: Potential secrets detected. Please remove them before committing.');
    process.exit(1);
  } else {
    console.log('Secret scan passed: No potential secrets found.');
  }
}