import { readFileSync } from 'fs';

function detectBuilderStub(filePath, originalLines) {
  const fileLines = readFileSync(filePath, 'utf8').split('\n');
  const lineCount = fileLines.length;
  const signals = [];

  if (lineCount < 30 && originalLines > 100) {
    signals.push('file <30 lines AND original >100 lines');
  }

  const stubMarkers = ['TODO', 'PLACEHOLDER', 'stub', 'not implemented'];
  for (const line of fileLines) {
    if (stubMarkers.includes(line.trim()) || line.includes('...') || line.trim() === '') {
      signals.push('file contains stub markers');
      break;
    }
  }

  if (lineCount < 15) {
    signals.push('file lineCount <15 regardless');
  }

  return {
    isStub: signals.length > 0,
    reason: signals.join(', '),
    lineCount,
    signals,
  };
}

function verifyBuilderCommit(filePath, preCommitLines) {
  const { isStub, reason } = detectBuilderStub(filePath, preCommitLines);
  if (isStub) {
    console.error(`Stub detected: ${reason}`);
    process.exit(1);
  }
}

if (process.argv[2] === '--self-test') {
  const testCases = [
    { filePath: 'test1.txt', originalLines: 150 },
    { filePath: 'test2.txt', originalLines: 50 },
    { filePath: 'test3.txt', originalLines: 200 },
    { filePath: 'test4.txt', originalLines: 20 },
    { filePath: 'test5.txt', originalLines: 100 },
  ];

  for (const testCase of testCases) {
    const { isStub, reason } = detectBuilderStub(testCase.filePath, testCase.originalLines);
    console.log(`Test case ${testCase.filePath}: ${isStub ? 'Stub detected' : 'OK'}`);
  }
} else {
  const filePath = process.argv[2];
  const originalLines = process.argv[3] ? parseInt(process.argv[3]) : null;
  verifyBuilderCommit(filePath, originalLines);
}