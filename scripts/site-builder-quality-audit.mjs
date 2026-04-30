/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 */
import { scoreGeneratedSite } from '../services/site-builder-quality-scorer.js';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

if (!PUBLIC_BASE_URL || !COMMAND_CENTER_KEY) {
  console.error('Error: PUBLIC_BASE_URL and COMMAND_CENTER_KEY environment variables must be set.');
  process.exit(1);
}

async function runQualityAudit() {
  console.log('Starting site builder quality audit...');

  const auditResults = [];
  let totalSites = 0;
  let readyCount = 0;
  let totalScore = 0;

  try {
    // Step 1: GET /api/v1/sites/prospects
    const prospectsResponse = await fetch(`${PUBLIC_BASE_URL}/api/v1/sites/prospects`, {
      headers: {
        'x-command-key': COMMAND_CENTER_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!prospectsResponse.ok) {
      throw new Error(`Failed to fetch prospects: ${prospectsResponse.status} ${prospectsResponse.statusText}`);
    }

    const prospects = await prospectsResponse.json();
    totalSites = prospects.length;

    // Step 2 & 3: Fetch HTML and Score
    for (const prospect of prospects) {
      const businessName = prospect.businessName || 'N/A';
      let score = 'N/A';
      let grade = 'N/A';
      let ready = false;
      let issues = ['No preview URL'];

      if (prospect.preview_url) {
        try {
          const htmlResponse = await fetch(prospect.preview_url);
          if (!htmlResponse.ok) {
            throw new Error(`Failed to fetch HTML: ${htmlResponse.status} ${htmlResponse.statusText}`);
          }
          const html = await htmlResponse.text();
          const scoringResult = await scoreGeneratedSite(html); // Call the imported scorer

          score = scoringResult.score;
          grade = scoringResult.grade;
          ready = scoringResult.ready;
          issues = scoringResult.issues;

          if (ready) {
            readyCount++;
          }
          if (typeof score === 'number') {
            totalScore += score;
          }

        } catch (htmlError) {
          issues = [`Error fetching/scoring HTML: ${htmlError.message}`];
        }
      }

      auditResults.push({
        businessName,
        score,
        grade,
        ready,
        issues: issues.join(', '),
      });
    }

    // Step 4: Print a table
    console.log('\n--- Site Quality Audit Results ---');
    console.log('BusinessName'.padEnd(30) + '| ' + 'Score'.padEnd(7) + '| ' + 'Grade'.padEnd(7) + '| ' + 'Ready'.padEnd(7) + '| ' + 'Issues');
    console.log('-'.repeat(30) + '+' + '-'.repeat(9) + '+' + '-'.repeat(9) + '+' + '-'.repeat(9) + '+' + '-'.repeat(50));

    for (const result of auditResults) {
      console.log(
        result.businessName.padEnd(30) + '| ' +
        String(result.score).padEnd(7) + '| ' +
        String(result.grade).padEnd(7) + '| ' +
        String(result.ready).padEnd(7) + '| ' +
        result.issues
      );
    }

    // Step 5: Print summary
    const averageScore = totalSites > 0 ? (totalScore / totalSites).toFixed(2) : 'N/A';
    console.log('\n--- Summary ---');
    console.log(`Total Sites: ${totalSites}`);
    console.log(`Ready Count: ${readyCount}`);
    console.log(`Average Score: ${averageScore}`);

  } catch (error) {
    console.error('An error occurred during the audit:', error.message);
    process.exit(1);
  }
}

runQualityAudit();