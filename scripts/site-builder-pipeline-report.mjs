import dotenv from 'dotenv/config';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY;

if (!PUBLIC_BASE_URL || !COMMAND_CENTER_KEY) {
  console.error('Missing environment variables. Exiting...');
  process.exit(1);
}

async function fetchPipelineStats() {
  try {
    const response = await fetch(`${PUBLIC_BASE_URL}/api/v1/sites/dashboard`);
    if (!response.ok) {
      throw new Error(`API call failed with status code ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching pipeline stats: ${error}`);
    process.exit(1);
  }
}

async function fetchRecentProspects() {
  try {
    const response = await fetch(`${PUBLIC_BASE_URL}/api/v1/sites/prospects?limit=50`);
    if (!response.ok) {
      throw new Error(`API call failed with status code ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching recent prospects: ${error}`);
    process.exit(1);
  }
}

async function printReport(pipelineStats, recentProspects) {
  console.log(`Site Builder Pipeline Report (${new Date().toISOString()})`);
  console.log('Pipeline funnel:');
  console.log(`  Total: ${pipelineStats.total}`);
  console.log(`  Built: ${pipelineStats.built}`);
  console.log(`  QA Hold: ${pipelineStats.qaHold}`);
  console.log(`  Sent: ${pipelineStats.sent}`);
  console.log(`  Viewed: ${pipelineStats.viewed}`);
  console.log(`  Replied: ${pipelineStats.replied}`);
  console.log(`  Converted: ${pipelineStats.converted}`);

  const conversionRates = [
    `${(pipelineStats.viewed / pipelineStats.sent * 100).toFixed(2)}% viewed/sent`,
    `${(pipelineStats.replied / pipelineStats.sent * 100).toFixed(2)}% replied/sent`,
    `${(pipelineStats.converted / pipelineStats.sent * 100).toFixed(2)}% converted/sent`,
  ];
  console.log('Conversion rates:');
  console.log(conversionRates.join('\n'));

  console.log(`Revenue: $${pipelineStats.totalConvertedDealValue}`);

  console.log('Recent 10 prospects:');
  recentProspects.slice(0, 10).forEach((prospect) => {
    console.log(`  - ${prospect.businessName} (${prospect.status}) - ${prospect.createdAt}`);
  });

  const actionItems = recentProspects.filter((prospect) => prospect.status === 'viewed' || prospect.status === 'replied');
  console.log('Action items:');
  actionItems.forEach((prospect) => {
    console.log(`  - ${prospect.businessName} (${prospect.status}) - ${prospect.createdAt}`);
  });
}

async function main() {
  const pipelineStats = await fetchPipelineStats();
  const recentProspects = await fetchRecentProspects();
  printReport(pipelineStats, recentProspects);
}

if (process.argv.includes('--json')) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}