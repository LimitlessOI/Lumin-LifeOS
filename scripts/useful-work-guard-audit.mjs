// scripts/useful-work-guard-audit.mjs
import * as fs from 'fs';
import * as path from 'path';

const AI_CALL_PATTERNS = [
  'ccm\\(',
  'callCouncilWithFailover\\(',
  'callAI\\(',
  'anthropic\\.messages\\.create\\(',
  'openai\\.chat\\.completions\\.create\\(',
  'generateContent\\(',
  'ccmWithFallback\\(',
];

const GUARD_PATTERNS = [
  'createUsefulWorkGuard\\(',
  'isPBAuthorized\\(',
  'requirePBAuthorized\\(',
  'pb_authorized',
  'PB_GOVERNED',
];

const CLASSIFICATIONS = {
  GUARDED: 'GUARDED',
  PB_GOVERNED: 'PB_GOVERNED',
  UNGUARDED: 'UNGUARDED',
  UNKNOWN: 'UNKNOWN',
};

const RISK_LEVELS = {
  HIGH_RISK_SCHEDULED: 'HIGH_RISK_SCHEDULED',
};

const SUMMARY_HEADER = '=== USEFUL-WORK-GUARD COVERAGE AUDIT ===';

const scanDirectory = (directory) => {
  const files = fs.readdirSync(directory);
  const results = [];

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      results.push(...scanDirectory(filePath));
    } else if (stats.isFile() && ['.js', '.mjs'].includes(path.extname(file))) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      let aiCalls = 0;
      let guards = 0;
      let pbGoverned = 0;
      let unguarded = 0;
      let unknown = 0;
      let highRiskScheduled = false;

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (AI_CALL_PATTERNS.some((pattern) => trimmedLine.includes(pattern))) {
          aiCalls++;
          if (GUARD_PATTERNS.some((pattern) => trimmedLine.includes(pattern))) {
            guards++;
          } else if (trimmedLine.includes('setInterval')) {
            highRiskScheduled = true;
          } else {
            unguarded++;
          }
        } else if (GUARD_PATTERNS.some((pattern) => trimmedLine.includes(pattern))) {
          pbGoverned++;
        }
      });

      if (aiCalls > 0) {
        results.push({
          filename: file,
          aiCalls,
          guards,
          pbGoverned,
          unguarded,
          unknown,
          highRiskScheduled,
        });
      }
    }
  });

  return results;
};

const classifyFile = (file) => {
  if (file.aiCalls > 0 && file.guards > 0) {
    return CLASSIFICATIONS.GUARDED;
  } else if (file.aiCalls > 0 && file.pbGoverned > 0) {
    return CLASSIFICATIONS.PB_GOVERNED;
  } else if (file.aiCalls > 0 && file.unguarded > 0) {
    return CLASSIFICATIONS.UNGUARDED;
  } else if (file.aiCalls > 0 && file.unknown > 0) {
    return CLASSIFICATIONS.UNKNOWN;
  } else {
    return null;
  }
};

const getSummary = (results) => {
  const summary = {
    totalFilesScanned: results.length,
    filesWithAiCalls: results.filter((file) => file.aiCalls > 0).length,
    GUARDED: results.filter((file) => file.classification === CLASSIFICATIONS.GUARDED).length,
    PB_GOVERNED: results.filter((file) => file.classification === CLASSIFICATIONS.PB_GOVERNED).length,
    UNGUARDED: results.filter((file) => file.classification === CLASSIFICATIONS.UNGUARDED).length,
    UNKNOWN: results.filter((file) => file.classification === CLASSIFICATIONS.UNKNOWN).length,
    coveragePercent: (results.filter((file) => file.classification === CLASSIFICATIONS.GUARDED || file.classification === CLASSIFICATIONS.PB_GOVERNED).length / results.filter((file) => file.aiCalls > 0).length) * 100,
  };

  return summary;
};

const getTopRiskFiles = (results) => {
  const topRiskFiles = results
    .filter((file) => file.highRiskScheduled)
    .sort((a, b) => {
      if (a.highRiskScheduled && !b.highRiskScheduled) return -1;
      if (!a.highRiskScheduled && b.highRiskScheduled) return 1;
      if (a.callCouncilWithFailover && !b.callCouncilWithFailover) return -1;
      if (!a.callCouncilWithFailover && b.callCouncilWithFailover) return 1;
      if (a.ccm && !b.ccm) return -1;
      if (!a.ccm && b.ccm) return 1;
      return 0;
    })
    .slice(0, 10);

  return topRiskFiles;
};

const getRecommendedNextFixes = (results) => {
  const recommendedFixes = results
    .filter((file) => file.classification === CLASSIFICATIONS.UNGUARDED && file.highRiskScheduled)
    .sort((a, b) => b.highRiskScheduled - a.highRiskScheduled)
    .slice(0, 5)
    .map((file) => ({
      filename: file.filename,
      fix: `Add ${GUARD_PATTERNS.join(' or ')} to protect AI call site in ${file.filename}`,
    }));

  return recommendedFixes;
};

const main = () => {
  const results = scanDirectory('services/');
  const results2 = scanDirectory('routes/');
  const results3 = scanDirectory('startup/');
  const results4 = scanDirectory('scripts/');

  const allResults = [...results, ...results2, ...results3, ...results4];

  const summary = getSummary(allResults);
  const topRiskFiles = getTopRiskFiles(allResults);
  const recommendedFixes = getRecommendedNextFixes(allResults);

  console.log(SUMMARY_HEADER);
  console.log(`total_files_scanned: ${summary.totalFilesScanned}`);
  console.log(`files_with_ai_calls: ${summary.filesWithAiCalls}`);
  console.log(`GUARDED: ${summary.GUARDED}`);
  console.log(`PB_GOVERNED: ${summary.PB_GOVERNED}`);
  console.log(`UNGUARDED: ${summary.UNGUARDED}`);
  console.log(`UNKNOWN: ${summary.UNKNOWN}`);
  console.log(`coverage_percent: ${summary.coveragePercent}%`);

  console.log('UNGUARDED files:');
  allResults
    .filter((file) => file.classification === CLASSIFICATIONS.UNGUARDED)
    .forEach((file) => {
      console.log(`  ${file.filename}`);
      console.log(`    ai_calls: ${file.aiCalls}`);
      console.log(`    high_risk_scheduled: ${file.highRiskScheduled}`);
    });

  console.log('PB_GOVERNED files:');
  allResults
    .filter((file) => file.classification === CLASSIFICATIONS.PB_GOVERNED)
    .forEach((file) => {
      console.log(`  ${file.filename}`);
      console.log(`    ai_calls: ${file.aiCalls}`);
      console.log(`    pb_governed: ${file.pbGoverned}`);
    });

  console.log('GUARDED files:');
  allResults
    .filter((file) => file.classification === CLASSIFICATIONS.GUARDED)
    .forEach((file) => {
      console.log(`  ${file.filename}`);
    });

  console.log('UNKNOWN files:');
  allResults
    .filter((file) => file.classification === CLASSIFICATIONS.UNKNOWN)
    .forEach((file) => {
      console.log(`  ${file.filename} - ${file.unknownReason}`);
    });

  console.log('TOP RISK FILES:');
  topRiskFiles.forEach((file) => {
    console.log(`  ${file.filename}`);
  });

  console.log('RECOMMENDED NEXT FIXES:');
  recommendedFixes.forEach((fix) => {
    console.log(`  ${fix.filename} - ${fix.fix}`);
  });

  if (allResults.some((file) => file.classification === CLASSIFICATIONS.UNGUARDED && file.highRiskScheduled)) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

main();