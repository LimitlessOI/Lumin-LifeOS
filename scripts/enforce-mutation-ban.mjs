import { classifyMutationZone } from './classify-mutation-zone.mjs';

interface CheckResult {
  allowed: boolean;
  zone: number;
  label: string;
  reason: string;
  remedy: string | null;
}

interface BatchCheckResult {
  total: number;
  allowed: number;
  blocked: number;
  results: CheckResult[];
}

function checkMutationAllowed(filePath: string, commitMessage: string): CheckResult {
  const zone = classifyMutationZone(filePath);
  if (zone === 1) return { allowed: true, zone, label: 'Zone 1', reason: '', remedy: null };
  if (zone === 2) return { allowed: true, zone, label: 'Zone 2', reason: 'Warning: direct builder edit', remedy: 'Use helper extraction plan' };
  if (zone === 3) {
    if (commitMessage.includes('GAP-FILL:') || commitMessage.includes('[system-build]')) {
      return { allowed: true, zone, label: 'Zone 3', reason: '', remedy: null };
    } else {
      return { allowed: false, zone, label: 'Zone 3', reason: 'Missing GAP-FILL commit message annotation', remedy: 'Add GAP-FILL annotation or helper extraction plan' };
    }
  }
  if (zone === 4) return { allowed: false, zone, label: 'Zone 4', reason: 'Direct builder edit not allowed', remedy: 'Use helper extraction plan' };
  return { allowed: false, zone, label: 'Unknown zone', reason: 'Unknown zone', remedy: null };
}

function batchCheckFiles(filePaths: string[], commitMessage: string): BatchCheckResult {
  const results: CheckResult[] = [];
  let total = 0;
  let allowed = 0;
  let blocked = 0;
  for (const filePath of filePaths) {
    const result = checkMutationAllowed(filePath, commitMessage);
    results.push(result);
    total++;
    if (result.allowed) allowed++;
    else blocked++;
  }
  return { total, allowed, blocked, results };
}

if (process.argv.length === 3) {
  const filePath = process.argv[2];
  const commitMessage = process.argv[3] || '';
  const result = checkMutationAllowed(filePath, commitMessage);
  console.log(`Allowed: ${result.allowed}, Zone: ${result.zone}, Label: ${result.label}, Reason: ${result.reason}, Remedy: ${result.remedy}`);
} else if (process.argv.includes('--batch')) {
  const filePaths = process.argv.slice(process.argv.indexOf('--batch') + 1);
  const commitMessage = process.argv[process.argv.indexOf('--batch') + filePaths.length + 1] || '';
  const result = batchCheckFiles(filePaths, commitMessage);
  console.log(`Total: ${result.total}, Allowed: ${result.allowed}, Blocked: ${result.blocked}`);
  for (const r of result.results) {
    console.log(`Allowed: ${r.allowed}, Zone: ${r.zone}, Label: ${r.label}, Reason: ${r.reason}, Remedy: ${r.remedy}`);
  }
} else if (process.argv.includes('--self-test')) {
  const testCases = [
    { filePath: 'test/file1.js', commitMessage: 'GAP-FILL: test commit' },
    { filePath: 'test/file2.js', commitMessage: 'direct builder edit' },
    { filePath: 'test/file3.js', commitMessage: '[system-build] test commit' },
    { filePath: 'test/file4.js', commitMessage: '' },
    { filePath: 'test/file5.js', commitMessage: 'GAP-FILL: test commit' },
    { filePath: 'test/file6.js', commitMessage: 'direct builder edit' },
  ];
  for (const testCase of testCases) {
    const result = checkMutationAllowed(testCase.filePath, testCase.commitMessage);
    console.log(`Allowed: ${result.allowed}, Zone: ${result.zone}, Label: ${result.label}, Reason: ${result.reason}, Remedy: ${result.remedy}`);
  }
}
```

```json
---
{
  "target_file": "scripts/enforce-mutation-ban.mjs",
  "insert_after_line": null,
  "confidence": 1
}