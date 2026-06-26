/**
 * SYNOPSIS: Helper function to fetch JSON data from a given URL.
 */
// Node built-ins only
import { URL } from 'node:url';
import process from 'node:process'; // For process.exit

/**
 * Helper function to fetch JSON data from a given URL.
 * @param {string} baseUrl - The base URL of the API.
 * @param {string} path - The API path relative to the base URL.
 * @param {string} commandKey - The x-command-key for auth.
 * @param {string} [method='GET'] - The HTTP method (e.g., 'GET', 'POST').
 * @param {object} [body=null] - The request body for POST/PUT requests.
 * @returns {Promise<object>} The parsed JSON response.
 * @throws {Error} If the fetch operation fails or returns a non-OK status.
 */
async function fetchJson(baseUrl, path, commandKey, method = 'GET', body = null) {
    const fullUrl = new URL(path, baseUrl).toString();
    const headers = {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
    };
    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, options);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorBody}`);
    }
    // Read response body once as text, then parse JSON
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error(`Failed to parse JSON response: ${e.message}, Body: ${text.substring(0, 200)}`);
    }
}

/**
 * Validates required envVars.
 * @param {string} baseUrl - The base URL for the API.
 * @param {string} commandKey - The command key for auth.
 * @returns {object} An object indicating validation status and message.
 */
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

/**
 * Shapes an error into a consistent format for audit results.
 * @param {string} testName - The name of the test that failed.
 * @param {Error} error - The error object.
 * @returns {object} An error result object.
 */
function shapeError(testName, error) {
    return { test: testName, ok: false, message: error.message, details: error.stack, };
}

/**
 * Executes the MarketingOS Phase 1 acceptance test suite.
 * This script performs a suite of read-only acceptance tests against
 * the MarketingOS and SocialMediaOS APIs to ensure core functionality
 * is available and responsive.
 * @param {string} [baseUrl=process.env.PUBLIC_BASE_URL] - The base URL for the API.
 * @param {string} [commandKey=process.env.COMMAND_CENTER_KEY] - The command key for auth.
 * @returns {Promise<object>} Structured audit JSON with ok, summary, and generated_at.
 */
async function runAudit(
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

    // Inferred acceptance tests for MarketingOS / SocialMediaOS Phase 1
    // These tests probe the routes defined in routes/socialmediaos-routes.js.
    // All SocialMediaOS routes require JWT authentication (ownerId), which is not
    // provided by x-command-key. Therefore, we expect a 401 'jwt_required' error
    // for these routes, which validates their presence and auth configuration.
    const tests = [
        // Existing MarketingOS tests (kept for continuity, assuming they are still relevant)
        { name: 'MarketingOS Status Check', path: '/api/v1/marketingos/status', method: 'GET', validator: (data) => data && typeof data.status === 'string' },
        { name: 'MarketingOS Configuration Retrieval', path: '/api/v1/marketingos/config', method: 'GET', validator: (data) => data && typeof data.version === 'string' },
        { name: 'SocialMediaOS Integrations List', path: '/api/v1/socialmediaos/integrations', method: 'GET', validator: (data) => Array.isArray(data) },
        { name: 'SocialMediaOS Upcoming Schedule', path: '/api/v1/socialmediaos/schedule/upcoming', method: 'GET', validator: (data) => Array.isArray(data) },
        { name: 'Active Marketing Campaigns', path: '/api/v1/marketingos/campaigns/active', method: 'GET', validator: (data) => Array.isArray(data) },
        { name: 'Marketing Analytics Overview', path: '/api/v1/marketingos/analytics/overview', method: 'GET', validator: (data) => data && typeof data.total_campaigns === 'number' },
        { name: 'Social Profile Sync Status', path: '/api/v1/socialmediaos/profiles/sync-status', method: 'GET', validator: (data) => data && typeof data.last_sync === 'string' },
        { name: 'Audience Segments Retrieval', path: '/api/v1/marketingos/audiences/segments', method: 'GET', validator: (data) => Array.isArray(data) },
        { name: 'SocialMediaOS Rate Limits', path: '/api/v1/socialmediaos/rate-limits', method: 'GET', validator: (data) => data && typeof data.twitter_remaining === 'number' },

        // New SocialMediaOS routes from routes/socialmediaos-routes.js
        // Assuming these are mounted under /api/v1/socialmediaos
        {
            name: 'SocialMediaOS List Sessions (Auth Check)',
            path: '/api/v1/socialmediaos/sessions',
            method: 'GET',
            validator: (data) => false, // Expecting 401, so 200 OK is a failure for this test
            expectedErrorStatus: 401,
            expectedErrorMessage: '"jwt_required"',
        },
        {
            name: 'SocialMediaOS Validate Payment Link (Auth Check)',
            path: '/api/v1/socialmediaos/validate-payment-link',
            method: 'POST',
            body: { link: 'https://stripe.com/pay/test' },
            validator: (data) => false, // Expecting 401
            expectedErrorStatus: 401,
            expectedErrorMessage: '"jwt_required"',
        },
        {
            name: 'SocialMediaOS Get Session by ID (Auth Check)',
            path: '/api/v1/socialmediaos/sessions/00000000-0000-0000-0000-000000000000', // Dummy UUID
            method: 'GET',
            validator: (data) => false, // Expecting 401
            expectedErrorStatus: 401,
            expectedErrorMessage: '"jwt_required"',
        },
        {
            name: 'SocialMediaOS List Content Packs for Session (Auth Check)',
            path: '/api/v1/socialmediaos/sessions/00000000-0000-0000-0000-000000000000/content-packs', // Dummy UUID
            method: 'GET',
            validator: (data) => false, // Expecting 401
            expectedErrorStatus: 401,
            expectedErrorMessage: '"jwt_required"',
        },
        {
            name: 'SocialMediaOS Get Content Pack by ID (Auth Check)',
            path: '/api/v1/socialmediaos/content-packs/00000000-0000-0000-0000-000000000000', // Dummy UUID
            method: 'GET',
            validator: (data) => false, // Expecting 401
            expectedErrorStatus: 401,
            expectedErrorMessage: '"jwt_required"',
        },
        // Test for a non-existent route to ensure 404s are handled correctly by the server
        {
            name: 'Non-existent SocialMediaOS Route (Expected 404)',
            path: '/api/v1/socialmediaos/non-existent-route-xyz',
            method: 'GET',
            validator: (data) => false, // Expecting 404
            expectedErrorStatus: 404,
            expectedErrorMessage: 'Cannot GET /api/v1/socialmediaos/non-existent-route-xyz', // Default Express 404 message
        },
    ];

    for (const test of tests) {
        try {
            const data = await fetchJson(baseUrl, test.path, commandKey, test.method, test.body);
            const testOk = test.validator(data);
            auditResults.push({
                test: test.name,
                path: test.path,
                ok: testOk,
                message: testOk ? 'Success' : 'Validation failed for response data.',
                response_preview: JSON.stringify(data).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : ''),
            });
            if (!testOk) {
                overallOk = false;
            }
        } catch (error) {
            let testOk = false;
            let message = error.message;
            // Check if the error is an expected one (e.g., 401 for auth-protected routes)
            if (test.expectedErrorStatus && error.message.includes(`Status: ${test.expectedErrorStatus}`)) {
                if (test.expectedErrorMessage && error.message.includes(test.expectedErrorMessage)) {
                    testOk = true; // Expected error received, so test passes
                    message = `Expected error received: ${test.expectedErrorStatus} - ${test.expectedErrorMessage}`;
                } else {
                    message = `Expected status ${test.expectedErrorStatus} but unexpected error message. Error: ${error.message}`;
                }
            }
            auditResults.push({
                test: test.name,
                path: test.path,
                ok: testOk,
                message: message,
                details: error.stack,
            });
            if (!testOk) {
                overallOk = false;
            }
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

/**
 * Main execution block.
 */
async function main() {
    const auditResult = await runAudit();
    console.log(JSON.stringify(auditResult, null, 2));

    if (!auditResult.ok) {
        process.exit(1);
    }
    process.exit(0);
}

main().catch((error) => {
    console.error('Audit script failed unexpectedly:', error);
    process.exit(1);
});