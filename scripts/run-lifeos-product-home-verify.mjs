/**
 * SYNOPSIS: Script — Run Lifeos Product Home Verify.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import fetch from 'node-fetch';
import fs from 'fs/promises';

const endpoints = [
  '/marketing',
  '/marketing?shell=1',
  '/marketing/calendar',
  '/marketing/atoms',
  '/marketing/session/new'
];

async function verifyEndpoints() {
  let allPass = true;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://yourdomain.com${endpoint}`);
      if (response.status === 200 || response.status === 302) {
        console.log(`PASS: ${endpoint}`);
      } else {
        console.log(`FAIL: ${endpoint}`);
        allPass = false;
      }
    } catch (error) {
      console.log(`FAIL: ${endpoint} - ${error.message}`);
      allPass = false;
    }
  }

  return allPass;
}

async function verifyConfig() {
  try {
    const data = await fs.readFile('config/auto-registered-product-modules.json', 'utf8');
    const config = JSON.parse(data);
    const requiredModules = [
      'marketing-session-export-routes',
      'marketing-session-new-ui-routes'
    ];

    for (const module of requiredModules) {
      if (!config.includes(module)) {
        console.log(`FAIL: Missing ${module} in config`);
        return false;
      }
    }

    console.log('PASS: Configuration check');
    return true;
  } catch (error) {
    console.log(`FAIL: Configuration check - ${error.message}`);
    return false;
  }
}

async function runVerification() {
  const endpointsPass = await verifyEndpoints();
  const configPass = await verifyConfig();
  process.exit(endpointsPass && configPass ? 0 : 1);
}

runVerification();
