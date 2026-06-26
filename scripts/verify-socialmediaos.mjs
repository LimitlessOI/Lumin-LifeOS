#!/usr/bin/env node
/**
 * SYNOPSIS: Node built-ins only
 */
// Node built-ins only
import { URL } from 'node:url';

// Helper function to fetch JSON data from a given URL, expecting an OK (2xx) response.
async function fetchOkJson(baseUrl, path, commandKey, method = 'GET', body = null) {
  const fullUrl = new URL(path, baseUrl).toString();
  const headers = {
    'Content-Type': 'application/json',
    'x-command-key': commandKey,
  };
  const options = {
    method,
    headers,
  };
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(fullUrl, options);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
  }
  return response.json();
}

// Helper function to fetch and expect a specific HTTP status.
async function fetchAndValidateStatus(baseUrl, path, commandKey, expectedStatus, method = 'GET', body = null) {
  const fullUrl = new URL(path, baseUrl).toString();
  const headers = {
    'Content-Type': 'application/json',
    'x-command-key': commandKey,
  };
  const options = {
    method,
    headers,
  };
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(fullUrl, options);
  const responseBody = await response.json().catch(() => response.text()); // Try to parse JSON, fall back to text
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} but got ${response.status}. Body: ${JSON.stringify(responseBody)}`);
  }
  return { status: response.status, body: responseBody };
}

// Validates required envVars.
function validateEnv(baseUrl, commandKey) {
  if (!baseUrl || !commandKey) {
    return { ok: false, message: 'Missing required envVars: PUBLIC_BASE_URL and/or COMMAND_CENTER_KEY.', };
  }
  try {
    new URL(baseUrl); // Validate if baseUrl is a valid URL
  } catch (e) {
    return { ok: false, message: `Invalid PUBLIC_BASE_URL: ${e.message}`, };
  }
  return { ok: true, message: 'Environment variables are valid.' };
}

// Shapes an error into a consistent format for audit results.
function shapeError(testName, error) {
  return { test: testName, ok: false, message: error.message, details: error.stack, };
}

// Executes the MarketingOS Phase 1 acceptance test suite.
export async function runAudit(
  baseUrl = process.env.PUBLIC_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY
) {
  const auditResults = [];
  let overallOk = true;
  const startTime = new Date();

  const envValidation = validateEnv(baseUrl, commandKey);
  if (!envValidation.ok) {
    auditResults.push({ test: 'Environment Validation', ...envValidation });
    overallOk = false;
    return {
      ok: overallOk,
      summary: 'Audit failed due to environment validation issues.',
      generated_at: startTime.toISOString(),
      results: auditResults,
    };
  }

  // Acceptance tests for SocialMediaOS Phase 1 routes and service exports
  const tests = [
    // Test 1: POST /validate-stripe-link (Valid Stripe link)
    // Verifies route existence, service export (validateStripePaymentLink), and basic functionality.
    {
      name: 'SocialMediaOS: POST /validate-stripe-link (Valid)',
      path: '/api/v1/socialmediaos/validate-stripe-link',
      method: 'POST',
      body: { link: 'https://checkout.stripe.com/pay/test_link_valid' },
      expectedStatus: 200,
      validator: (data) => data && data.ok === true && data.valid === true && data.reason === null,
    },
    // Test 2: POST /validate-stripe-link (Invalid non-Stripe link)
    // Further verifies service export (validateStripePaymentLink) logic.
    {
      name: 'SocialMediaOS: POST /validate-stripe-link (Invalid Domain)',
      path: '/api/v1/socialmediaos/validate-stripe-link',
      method: 'POST',
      body: { link: 'https://example.com/some_link' },
      expectedStatus: 200,
      validator: (data) => data && data.ok === true && data.valid === false && data.reason === 'link_must_be_a_stripe_domain',
    },
    // Test 3: GET /sessions (Expect 401 Unauthorized)
    // Verifies route factory signature, route registration, and auth middleware protection.
    // Implicitly suggests DB migration presence if no 500 error due to missing tables.
    {
      name: 'SocialMediaOS: GET /sessions (Auth Required)',
      path: '/api/v1/socialmediaos/sessions',
      method: 'GET',
      expectedStatus: 401,
      validator: (data) => data && data.ok === false && data.error === 'jwt_required',
    },
    // Test 4: GET /sessions/:id (Expect 401 Unauthorized)
    // Verifies route factory signature, route registration, and auth middleware protection for a specific resource.
    {
      name: 'SocialMediaOS: GET /sessions/:id (Auth Required)',
      path: '/api/v1/socialmediaos/sessions/00000000-0000-4000-8000-000000000001', // Dummy UUID
      method: 'GET',
      expectedStatus: 401,
      validator: (data) => data && data.ok === false && data.error === 'jwt_required',
    },
    // Test 5: POST /sessions (Expect 401 Unauthorized)
    // Verifies route factory signature, route registration, and auth middleware protection for a creation endpoint.
    {
      name: 'SocialMediaOS: POST /sessions (Auth Required)',
      path: '/api/v1/socialmediaos/sessions',
      method: 'POST',
      body: { scheduledFor: '2026-07-01T10:00:00Z', initialStatus: 'draft' },
      expectedStatus: 401,
      validator: (data) => data && data.ok === false && data.error === 'jwt_required',
    },
    // Generic MarketingOS status check (from original script, good for general API health)
    {
      name: 'MarketingOS Status Check',
      path: '/api/v1/marketingos/status',
      method: 'GET',
      expectedStatus: 200,
      validator: (data) => data && typeof data.status === 'string'
    },
  ];

  for (const test of tests) {
    try {
      let responseData;
      let testOk;
      let actualStatus;

      if (test.expectedStatus) {
        const { status, body } = await fetchAndValidateStatus(baseUrl, test.path, commandKey, test.expectedStatus, test.method, test.body);
        responseData = body;
        actualStatus = status;
        testOk = test.validator(responseData);
      } else {
        // This branch is for tests that implicitly expect 200 OK and use fetchOkJson
        responseData = await fetchOkJson(baseUrl, test.path, commandKey, test.method, test.body);
        actualStatus = 200; // fetchOkJson throws if not 2xx, so if it returns, it's 2xx.
        testOk = test.validator(responseData);
      }

      auditResults.push({
        test: test.name,
        path: test.path,
        method: test.method,
        expected_status: test.expectedStatus || 200,
        actual_status: actualStatus,
        ok: testOk,
        message: testOk ? 'Success' : 'Validation failed for response data.',
        response_preview: JSON.stringify(responseData).substring(0, 200) + (JSON.stringify(responseData).length > 200 ? '...' : ''),
      });
      if (!testOk) {
        overallOk = false;
      }
    } catch (error) {
      auditResults.push(shapeError(test.name, error));
      overallOk = false;
    }
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const summary = overallOk
    ? `All ${tests.length} MarketingOS Phase 1 acceptance tests passed successfully in ${durationMs}ms.`
    : `Some MarketingOS Phase 1 acceptance tests failed. See details for ${auditResults.filter(r => !r.ok).length} failures.`;

  return {
    ok: overallOk,
    summary: summary,
    generated_at: startTime.toISOString(),
    duration_ms: durationMs,
    results: auditResults,
  };
}

async function main() {
  const auditResult = await runAudit();
  console.log(JSON.stringify(auditResult, null, 2));
  if (!auditResult.ok) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Audit script failed unexpectedly:', err);
  process.exit(1);
});