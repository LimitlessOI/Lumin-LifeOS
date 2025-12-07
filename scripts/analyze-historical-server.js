/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    HISTORICAL SERVER.JS ANALYSIS                                 ║
 * ║                    Analyzes all historical server.js versions from git           ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMITS_TO_ANALYZE = 216; // All commits
const OUTPUT_FILE = path.join(__dirname, '../HISTORICAL_SERVER_ANALYSIS.md');

/**
 * Get all commits that modified server.js
 */
async function getServerCommits() {
  try {
    const { stdout } = await execAsync(
      `git log --all --format="%H|%s|%ad" --date=iso --follow -- server.js | head -${COMMITS_TO_ANALYZE}`
    );
    
    const commits = stdout.trim().split('\n').map(line => {
      const [hash, ...rest] = line.split('|');
      const date = rest.pop();
      const message = rest.join('|');
      return { hash, message, date };
    });
    
    return commits;
  } catch (error) {
    console.error('Error getting commits:', error.message);
    return [];
  }
}

/**
 * Get server.js content for a specific commit
 */
async function getServerAtCommit(hash) {
  try {
    const { stdout } = await execAsync(
      `git show ${hash}:server.js 2>/dev/null || echo ""`
    );
    return stdout;
  } catch (error) {
    return null; // File might not exist in this commit
  }
}

/**
 * Extract function definitions from code
 */
function extractFunctions(code) {
  const functions = [];
  
  // Match function declarations: function name(...) { ... }
  const funcRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    functions.push({
      name: match[1],
      type: 'function',
      line: code.substring(0, match.index).split('\n').length,
    });
  }
  
  // Match arrow functions assigned to variables: const name = (...) => { ... }
  const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
  while ((match = arrowRegex.exec(code)) !== null) {
    functions.push({
      name: match[1],
      type: 'arrow',
      line: code.substring(0, match.index).split('\n').length,
    });
  }
  
  // Match async function declarations: async function name(...) { ... }
  const asyncRegex = /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g;
  while ((match = asyncRegex.exec(code)) !== null) {
    functions.push({
      name: match[1],
      type: 'async',
      line: code.substring(0, match.index).split('\n').length,
    });
  }
  
  return functions;
}

/**
 * Extract key features/patterns from code
 */
function extractFeatures(code) {
  const features = {
    hasTwoTier: /two.?tier|tier.?0|tier.?1/i.test(code),
    hasConsensus: /consensus|debate|vote/i.test(code),
    hasSelfProgramming: /self.?program|modifyOwnCode|selfModification/i.test(code),
    hasLogMonitor: /logMonitor|LogMonitor|monitorLogs/i.test(code),
    hasCostOptimization: /cost.?optim|compression|cache|neon/i.test(code),
    hasKnowledgeBase: /knowledge.?base|knowledgeBase/i.test(code),
    hasCommandCenter: /command.?center|commandCenter/i.test(code),
    hasOutreach: /outreach|twilio|email|sms/i.test(code),
    hasStripe: /stripe|Stripe/i.test(code),
    hasSandbox: /sandbox|sandboxTest/i.test(code),
    hasSnapshot: /snapshot|rollback/i.test(code),
    hasMICRO: /MICRO|micro.?protocol|lctp/i.test(code),
    hasOllama: /ollama|Ollama/i.test(code),
    hasWebSocket: /websocket|WebSocket|ws/i.test(code),
    hasAutoQueue: /auto.?queue|autoQueue/i.test(code),
    hasIdeaGenerator: /idea.?generat|generateIdeas/i.test(code),
    hasUserSimulation: /user.?simulation|simulateDecision/i.test(code),
    hasEffectivenessTracker: /effectiveness|ratePerformance/i.test(code),
    hasPostUpgrade: /post.?upgrade|postUpgrade/i.test(code),
  };
  
  return features;
}

/**
 * Analyze a single commit
 */
async function analyzeCommit(commit) {
  const code = await getServerAtCommit(commit.hash);
  
  if (!code || code.length < 100) {
    return {
      commit,
      valid: false,
      reason: 'No code or too short',
    };
  }
  
  const functions = extractFunctions(code);
  const features = extractFeatures(code);
  const lineCount = code.split('\n').length;
  const sizeKB = (code.length / 1024).toFixed(2);
  
  // Check for common error patterns
  const errors = {
    hasSyntaxErrors: /SyntaxError|ReferenceError|TypeError/.test(code),
    hasMissingImports: /Cannot find module|require\(|import.*from/.test(code),
    hasDeprecated: /deprecated|DEPRECATED/i.test(code),
  };
  
  return {
    commit,
    valid: true,
    functions,
    features,
    metrics: {
      lineCount,
      sizeKB,
      functionCount: functions.length,
    },
    errors,
  };
}

/**
 * Generate comprehensive report
 */
function generateReport(analyses) {
  const valid = analyses.filter(a => a.valid);
  const invalid = analyses.filter(a => !a.valid);
  
  // Collect all unique functions
  const allFunctions = new Map();
  valid.forEach(analysis => {
    analysis.functions.forEach(func => {
      if (!allFunctions.has(func.name)) {
        allFunctions.set(func.name, {
          name: func.name,
          type: func.type,
          appearances: [],
          lastSeen: null,
          firstSeen: null,
        });
      }
      
      const funcData = allFunctions.get(func.name);
      funcData.appearances.push({
        commit: analysis.commit.hash,
        date: analysis.commit.date,
        message: analysis.commit.message,
      });
      
      if (!funcData.firstSeen || analysis.commit.date < funcData.firstSeen) {
        funcData.firstSeen = analysis.commit.date;
      }
      if (!funcData.lastSeen || analysis.commit.date > funcData.lastSeen) {
        funcData.lastSeen = analysis.commit.date;
      }
    });
  });
  
  // Categorize functions
  const criticalFunctions = [];
  const importantFunctions = [];
  const optionalFunctions = [];
  const deprecatedFunctions = [];
  
  allFunctions.forEach((func, name) => {
    const appearanceCount = func.appearances.length;
    const recent = func.appearances.some(a => {
      const date = new Date(a.date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return date > sixMonthsAgo;
    });
    
    // Critical: Appears in >50% of commits and recent
    if (appearanceCount > valid.length * 0.5 && recent) {
      criticalFunctions.push({ ...func, score: appearanceCount });
    }
    // Important: Appears in >25% of commits
    else if (appearanceCount > valid.length * 0.25) {
      importantFunctions.push({ ...func, score: appearanceCount });
    }
    // Deprecated: Not seen in last 6 months but was common
    else if (appearanceCount > valid.length * 0.3 && !recent) {
      deprecatedFunctions.push({ ...func, score: appearanceCount });
    }
    // Optional: Everything else
    else {
      optionalFunctions.push({ ...func, score: appearanceCount });
    }
  });
  
  // Sort by score
  criticalFunctions.sort((a, b) => b.score - a.score);
  importantFunctions.sort((a, b) => b.score - a.score);
  optionalFunctions.sort((a, b) => b.score - a.score);
  deprecatedFunctions.sort((a, b) => b.score - a.score);
  
  // Feature evolution
  const featureEvolution = {};
  Object.keys(valid[0]?.features || {}).forEach(feature => {
    featureEvolution[feature] = {
      introduced: null,
      lastSeen: null,
      adoptionRate: 0,
    };
    
    valid.forEach(analysis => {
      if (analysis.features[feature]) {
        if (!featureEvolution[feature].introduced) {
          featureEvolution[feature].introduced = analysis.commit.date;
        }
        featureEvolution[feature].lastSeen = analysis.commit.date;
        featureEvolution[feature].adoptionRate++;
      }
    });
    
    featureEvolution[feature].adoptionRate = 
      (featureEvolution[feature].adoptionRate / valid.length * 100).toFixed(1);
  });
  
  // Generate markdown report
  let report = `# 📊 Comprehensive Historical server.js Analysis\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Commits Analyzed:** ${valid.length} valid / ${invalid.length} invalid\n`;
  report += `**Total Functions Found:** ${allFunctions.size}\n\n`;
  
  report += `## 🎯 Executive Summary\n\n`;
  report += `This analysis examines ${valid.length} historical versions of \`server.js\` to identify:\n`;
  report += `- Functions that absolutely should be included\n`;
  report += `- Functions that need more thought\n`;
  report += `- What worked and what didn't\n\n`;
  
  report += `## ⚠️ CRITICAL FUNCTIONS (Must Include)\n\n`;
  report += `These functions appear in >50% of commits and are still in recent versions:\n\n`;
  criticalFunctions.forEach(func => {
    report += `### \`${func.name}\`\n`;
    report += `- **Type:** ${func.type}\n`;
    report += `- **Appearances:** ${func.appearances.length} commits (${((func.appearances.length / valid.length) * 100).toFixed(1)}%)\n`;
    report += `- **First Seen:** ${func.firstSeen}\n`;
    report += `- **Last Seen:** ${func.lastSeen}\n`;
    report += `- **Status:** ✅ **CRITICAL - MUST INCLUDE**\n\n`;
  });
  
  report += `## 📋 IMPORTANT FUNCTIONS (Should Include)\n\n`;
  report += `These functions appear in >25% of commits:\n\n`;
  importantFunctions.slice(0, 20).forEach(func => {
    report += `### \`${func.name}\`\n`;
    report += `- **Appearances:** ${func.appearances.length} commits (${((func.appearances.length / valid.length) * 100).toFixed(1)}%)\n`;
    report += `- **Status:** ⚠️ **IMPORTANT - REVIEW NEEDED**\n\n`;
  });
  
  report += `## 🔄 DEPRECATED FUNCTIONS (Needs Thought)\n\n`;
  report += `These were common but haven't appeared in 6+ months:\n\n`;
  deprecatedFunctions.forEach(func => {
    report += `### \`${func.name}\`\n`;
    report += `- **Appearances:** ${func.appearances.length} commits\n`;
    report += `- **Last Seen:** ${func.lastSeen}\n`;
    report += `- **Status:** ❓ **DEPRECATED - EVALUATE IF STILL NEEDED**\n\n`;
  });
  
  report += `## 🚀 Feature Evolution\n\n`;
  report += `| Feature | Introduced | Last Seen | Adoption Rate | Status |\n`;
  report += `|---------|------------|-----------|----------------|--------|\n`;
  
  Object.entries(featureEvolution)
    .sort((a, b) => parseFloat(b[1].adoptionRate) - parseFloat(a[1].adoptionRate))
    .forEach(([feature, data]) => {
      const recent = data.lastSeen && new Date(data.lastSeen) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const status = recent ? '✅ Active' : '❌ Deprecated';
      report += `| ${feature} | ${data.introduced || 'N/A'} | ${data.lastSeen || 'N/A'} | ${data.adoptionRate}% | ${status} |\n`;
    });
  
  report += `\n## 📈 Metrics Over Time\n\n`;
  report += `| Metric | Average | Min | Max |\n`;
  report += `|--------|---------|-----|-----|\n`;
  
  const lineCounts = valid.map(a => a.metrics.lineCount);
  const sizes = valid.map(a => parseFloat(a.metrics.sizeKB));
  const funcCounts = valid.map(a => a.metrics.functionCount);
  
  report += `| Lines of Code | ${Math.round(lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length)} | ${Math.min(...lineCounts)} | ${Math.max(...lineCounts)} |\n`;
  report += `| File Size (KB) | ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2)} | ${Math.min(...sizes).toFixed(2)} | ${Math.max(...sizes).toFixed(2)} |\n`;
  report += `| Function Count | ${Math.round(funcCounts.reduce((a, b) => a + b, 0) / funcCounts.length)} | ${Math.min(...funcCounts)} | ${Math.max(...funcCounts)} |\n`;
  
  report += `\n## 💡 Recommendations\n\n`;
  
  // Generate recommendations
  const missingCritical = criticalFunctions.filter(f => {
    // Check if function exists in current server.js
    const currentCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    return !new RegExp(`(?:function|const|let|var)\\s+${f.name}\\s*[=(]`).test(currentCode);
  });
  
  if (missingCritical.length > 0) {
    report += `### ⚠️ Missing Critical Functions\n\n`;
    report += `These critical functions are NOT in the current server.js:\n\n`;
    missingCritical.forEach(func => {
      report += `- **\`${func.name}\`** - Appeared in ${func.appearances.length} commits\n`;
    });
    report += `\n**ACTION REQUIRED:** Review and re-implement these functions.\n\n`;
  }
  
  report += `### ✅ What Worked Well\n\n`;
  report += `Based on high adoption rates and recent usage:\n\n`;
  criticalFunctions.slice(0, 10).forEach(func => {
    report += `- **\`${func.name}\`** - Stable, widely used\n`;
  });
  
  report += `\n### ❌ What Didn't Work\n\n`;
  report += `Based on low adoption or early removal:\n\n`;
  optionalFunctions.slice(-10).forEach(func => {
    report += `- **\`${func.name}\`** - Low adoption (${func.appearances.length} commits)\n`;
  });
  
  report += `\n## 📝 Full Function List\n\n`;
  report += `Total: ${allFunctions.size} unique functions\n\n`;
  report += `| Function | Type | Appearances | First Seen | Last Seen | Status |\n`;
  report += `|---------|------|-------------|------------|-----------|--------|\n`;
  
  Array.from(allFunctions.values())
    .sort((a, b) => b.appearances.length - a.appearances.length)
    .forEach(func => {
      const recent = func.lastSeen && new Date(func.lastSeen) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const status = recent ? '✅' : '❌';
      report += `| \`${func.name}\` | ${func.type} | ${func.appearances.length} | ${func.firstSeen || 'N/A'} | ${func.lastSeen || 'N/A'} | ${status} |\n`;
    });
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Analyzing historical server.js files...');
  
  const commits = await getServerCommits();
  console.log(`📦 Found ${commits.length} commits to analyze`);
  
  const analyses = [];
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    console.log(`Analyzing commit ${i + 1}/${commits.length}: ${commit.hash.substring(0, 8)} - ${commit.message.substring(0, 50)}...`);
    
    const analysis = await analyzeCommit(commit);
    analyses.push(analysis);
    
    // Small delay to avoid overwhelming git
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('📊 Generating report...');
  const report = generateReport(analyses);
  
  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  console.log(`✅ Report saved to: ${OUTPUT_FILE}`);
  console.log(`\n📈 Summary:`);
  console.log(`   - Valid commits: ${analyses.filter(a => a.valid).length}`);
  console.log(`   - Invalid commits: ${analyses.filter(a => !a.valid).length}`);
  console.log(`   - Total functions found: ${new Set(analyses.flatMap(a => a.functions?.map(f => f.name) || [])).size}`);
}

main().catch(console.error);
