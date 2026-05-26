import fs from 'fs';
import path from 'path';

const getZonePolicy = (zone) => {
  switch (zone) {
    case 1:
      return { allowBuilder: true, requiresGapFill: false, description: 'New file, safe for builder' };
    case 2:
      return { allowBuilder: true, requiresGapFill: false, description: 'Existing file, caution for builder' };
    case 3:
      return { allowBuilder: false, requiresGapFill: true, description: 'Existing file, danger for builder' };
    case 4:
      return { allowBuilder: false, requiresGapFill: false, description: 'Runtime/infra path, blocked for builder' };
    default:
      throw new Error(`Unknown zone: ${zone}`);
  }
};

const classifyMutationZone = (filePath) => {
  const zone = getZone(filePath);
  const lineCount = getFileLineCount(filePath);
  const reason = getReason(filePath);
  const blockerPaths = getBlockerPaths(filePath);

  return {
    zone,
    label: getLabel(zone),
    lineCount,
    reason,
    blockerPaths,
  };
};

const getZone = (filePath) => {
  if (isRuntimePath(filePath)) {
    return 4;
  } else if (isNewFile(filePath)) {
    return 1;
  } else if (isCautionFile(filePath)) {
    return 2;
  } else {
    return 3;
  }
};

const isNewFile = (filePath) => {
  try {
    fs.accessSync(filePath);
    return false;
  } catch (err) {
    return true;
  }
};

const isCautionFile = (filePath) => {
  const stats = fs.statSync(filePath);
  return stats.size > 0 && stats.size <= 150;
};

const isCautionFileLines = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  return lines.length <= 150;
};

const isRuntimePath = (filePath) => {
  const runtimePaths = ['startup/', 'mw/', 'core/', 'server.js', 'config/'];
  return runtimePaths.includes(path.dirname(filePath));
};

const getFileLineCount = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  return lines.length;
};

const getReason = (filePath) => {
  if (isRuntimePath(filePath)) {
    return 'Runtime/infra path';
  } else if (isNewFile(filePath)) {
    return 'New file';
  } else if (isCautionFile(filePath)) {
    return 'Existing file, caution for builder';
  } else {
    return 'Existing file, danger for builder';
  }
};

const getBlockerPaths = (filePath) => {
  if (isRuntimePath(filePath)) {
    return null;
  } else {
    return null;
  }
};

const getLabel = (zone) => {
  switch (zone) {
    case 1:
      return 'SAFE';
    case 2:
      return 'CAUTION';
    case 3:
      return 'DANGER';
    case 4:
      return 'BLOCKED';
    default:
      throw new Error(`Unknown zone: ${zone}`);
  }
};

if (process.argv.length === 3) {
  const filePath = process.argv[2];
  const result = classifyMutationZone(filePath);
  console.log(`Zone: ${result.zone}`);
  console.log(`Label: ${result.label}`);
  console.log(`Line Count: ${result.lineCount}`);
  console.log(`Policy: ${JSON.stringify(getZonePolicy(result.zone))}`);
} else if (process.argv.includes('--self-test')) {
  const testCases = [
    { filePath: 'test/new-file.txt', expectedZone: 1, expectedLabel: 'SAFE' },
    { filePath: 'test/caution-file.txt', expectedZone: 2, expectedLabel: 'CAUTION' },
    { filePath: 'test/danger-file.txt', expectedZone: 3, expectedLabel: 'DANGER' },
    { filePath: 'test/runtime-path.txt', expectedZone: 4, expectedLabel: 'BLOCKED' },
    { filePath: 'test/missing-file.txt', expectedZone: 1, expectedLabel: 'SAFE' },
  ];

  testCases.forEach((testCase) => {
    const result = classifyMutationZone(testCase.filePath);
    if (result.zone === testCase.expectedZone && result.label === testCase.expectedLabel) {
      console.log('PASS');
    } else {
      console.log(`FAIL: expected ${testCase.expectedZone} ${testCase.expectedLabel}, got ${result.zone} ${result.label}`);
    }
  });
} else {
  console.error('Invalid command line arguments');
}
```

```json
{
  "target_file": "scripts/classify-mutation-zone.mjs",
  "insert_after_line": null,
  "confidence": 1
}