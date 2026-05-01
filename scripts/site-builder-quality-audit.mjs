/*
- @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md */
import { scoreGeneratedSite } from '../services/site-builder-quality-scorer.js';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

if (!PUBLIC_BASE_URL || !COMMAND_CENTER_KEY) {
  console.error('Error: PUBLIC_BASE_URL and COMMAND_CENTER_KEY envVars must be set.');
  process.exit(1);
}

async function runQualityAudit() { // Corrected asyncFn to async function
  console.log('Starting siteBld quality audit...');
  const auditResults = [];
  let totalSites = 0;
  let readyCount = 0;
  let totalScorePct = 0; // Changed to totalScorePct to reflect percentage sum

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

    const data = await prospectsResponse.json();
    const prospects = data.prospects || []; // Access the 'prospects' array from the response object
    totalSites = prospects.length;

    // Step 2 & 3: Fetch HTML and Score
    for (const prospect of prospects) {
      const businessName = prospect.business_name || 'N/A'; // Use snake_case business_name
      let scorePct = 'N/A'; // Renamed to scorePct
      let grade = 'N/A';
      let ready = false;
      let summaryIssues = ['No preview URL']; // Renamed to summaryIssues

      if (prospect.preview_url) { // preview_url is already snake_case
        try {
          const htmlResponse = await fetch(prospect.preview_url);
          if (!htmlResponse.ok) {
            throw new Error(`Failed to fetch HTML: ${htmlResponse.status} ${htmlResponse.statusText}`);
          }
          const html = await htmlResponse.text();
          const scoringResult = await scoreGeneratedSite(html); // Call the imported scorer

          scorePct = (scoringResult.score / scoringResult.maxScore) * 100; // Calculate scorePct
          grade = scoringResult.grade;
          ready = scoringResult.readyToSend; // Use 'readyToSend' from the new contract
          summaryIssues = scoringResult.summaryIssues; // Use 'summaryIssues' from the new contract

          if (ready) {
            readyCount++;
          }
          if (typeof scorePct === 'number') {
            totalScorePct += scorePct; // Sum scorePct
          }
        } catch (htmlError) {
          summaryIssues = [`Error fetching/scoring HTML: ${htmlError.message}`]; // Update summaryIssues
        }
      }

      auditResults.push({
        businessName,
        scorePct: typeof scorePct === 'number' ? scorePct.toFixed(2) : scorePct, // Store formatted scorePct
        grade,
        ready,
        summaryIssues: summaryIssues.join(', '), // Store joined summaryIssues
      });
    }

    // Step 4: Print a table
    console.log('\n--- Site Quality Audit Results ---');
    console.log('Business'.padEnd(30) + '| ' + 'ScorePct'.padEnd(10) + '| ' + 'Grade'.padEnd(7) + '| ' + 'Ready'.padEnd(7) + '| ' + 'Issues');
    console.log('-'.repeat(30) + '+' + '-'.repeat(12) + '+' + '-'.repeat(9) + '+' + '-'.repeat(9) + '+' + '-'.repeat(50));
    for (const result of auditResults) {
      console.log(
        result.businessName.padEnd(30) + '| ' + String(result.scorePct).padEnd(10) + '| ' + String(result.grade).padEnd(7) + '| ' + String(result.ready).padEnd(7) + '| ' + result.summaryIssues
      );
    }

    // Step 5: Print summary
    const averageScorePct = totalSites > 0 ? (totalScorePct / totalSites).toFixed(2) : 'N/A'; // Average based on scorePct
    console.log('\n--- Summary ---');
    console.log(`Total Sites: ${totalSites}`);
    console.log(`Ready Count: ${readyCount}`);
    console.log(`Average Score: ${averageScorePct}`); // Display averageScorePct
  } catch (error) {
    console.error('An error occurred during the audit:', error.message);
    process.exit(1);
  }
}

runQualityAudit();