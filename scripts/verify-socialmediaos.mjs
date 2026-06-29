/**
 * SYNOPSIS: Exports runAudit — scripts/verify-socialmediaos.mjs.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function exists(rel) {
    return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
    try {
        return fs.readFileSync(path.join(ROOT, rel), 'utf8');
    } catch (e) {
        return null; // Return null if file doesn't exist or can't be read
    }
}

function check(id, ok, detail) {
    return { id, ok: Boolean(ok), detail: detail || (ok ? 'PASS' : 'FAIL') };
}

function resolveBaseUrl() {
    return (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
    return process.env.COMMAND_CENTER_KEY || '';
}

async function probeUrl(baseUrl, commandKey, method, path, body = null) {
    const url = `${baseUrl}${path}`;
    const headers = {
        'x-command-key': commandKey,
        'Content-Type': 'application/json',
    };
    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    try {
        const res = await fetch(url, options);
        const text = await res.text(); // Strict requirement: read text then parse
        let json = null;
        try {
            json = JSON.parse(text);
        } catch (e) {
            // Response was not valid JSON, or empty.
        }
        return { ok: res.ok, status: res.status, json, text, path };
    } catch (error) {
        return { ok: false, status: 500, json: null, text: `Fetch error: ${error.message}`, path };
    }
}

export async function runAudit() {
    const checks = [];
    const baseUrl = resolveBaseUrl();
    const commandKey = resolveCommandKey();

    // --- Environment Variable Checks ---
    if (!baseUrl) {
        checks.push(check('ENV-01', false, 'PUBLIC_BASE_URL environment variable is missing or empty.'));
    }
    if (!commandKey) {
        checks.push(check('ENV-02', false, 'COMMAND_CENTER_KEY environment variable is missing or empty.'));
    }

    // If essential env vars are missing, skip HTTP probes
    const canProbe = baseUrl && commandKey;
    if (!canProbe) {
        checks.push(check('PROBE-SKIP', false, 'Skipping HTTP probes due to missing environment variables.'));
    }

    // --- DB Migration Presence Check ---
    const migrationPath = 'db/migrations/20260626_socialmediaos.sql';
    const migrationContent = read(migrationPath);
    checks.push(check('DB-01', migrationContent !== null, `Migration file ${migrationPath} exists.`));

    if (migrationContent) {
        const hasSessionsTable = migrationContent.includes('CREATE TABLE IF NOT EXISTS socialmediaos_sessions');
        checks.push(check('DB-02', hasSessionsTable, 'Migration includes literal `CREATE TABLE IF NOT EXISTS socialmediaos_sessions`.'));

        const hasContentPacksTable = migrationContent.includes('CREATE TABLE IF NOT EXISTS socialmediaos_content_packs');
        checks.push(check('DB-03', hasContentPacksTable, 'Migration includes literal `CREATE TABLE IF NOT EXISTS socialmediaos_content_packs`.'));
    } else {
        checks.push(check('DB-02', false, 'Cannot check for `socialmediaos_sessions` table (migration file not found).'));
        checks.push(check('DB-03', false, 'Cannot check for `socialmediaos_content_packs` table (migration file not found).'));
    }

    // --- Service Export Check ---
    const servicePath = 'services/socialmediaos-service.js';
    const serviceContent = read(servicePath);
    checks.push(check('SVC-01', serviceContent !== null, `Service file ${servicePath} exists.`));

    if (serviceContent) {
        const hasFactoryExport = serviceContent.includes('export function createMarketingOSFactory');
        checks.push(check('SVC-02', hasFactoryExport, '`services/socialmediaos-service.js` exports literal `export function createMarketingOSFactory`.'));
    } else {
        checks.push(check('SVC-02', false, 'Cannot check for `createMarketingOSFactory` export (service file not found).'));
    }

    // --- Route Factory Signature Check ---
    const routesPath = 'routes/socialmediaos-routes.js';
    const routesContent = read(routesPath);
    checks.push(check('RTE-01', routesContent !== null, `Routes file ${routesPath} exists.`));

    if (routesContent) {
        const expectedSignature = 'export function createSocialmediaosRoutes({ pool, requireKey, logger })';
        const hasRouteSignature = routesContent.includes(expectedSignature);
        checks.push(check('RTE-02', hasRouteSignature, `Routes file includes exact factory signature: \`${expectedSignature}\`.`));
    } else {
        checks.push(check('RTE-02', false, 'Cannot check for route factory signature (routes file not found).'));
    }

    // --- HTTP Probes ---
    if (canProbe) {
        // Probe 1: GET /api/v1/socialmediaos/sessions
        const sessionsPath = '/api/v1/socialmediaos/sessions';
        const sessionsProbe = await probeUrl(baseUrl, commandKey, 'GET', sessionsPath);
        checks.push(
            check(
                'HTTP-01',
                sessionsProbe.ok && sessionsProbe.status === 200 && sessionsProbe.json?.ok === true,
                `GET ${sessionsPath}: HTTP ${sessionsProbe.status}, ok: ${sessionsProbe.json?.ok}`
            )
        );

        // Probe 2: POST /api/v1/socialmediaos/validate-payment-link
        const validateLinkPath = '/api/v1/socialmediaos/validate-payment-link';
        const validateLinkBody = { link: 'https://buy.stripe.com/test' };
        const validateLinkProbe = await probeUrl(baseUrl, commandKey, 'POST', validateLinkPath, validateLinkBody);
        const validationResultOk = validateLinkProbe.json?.ok === true;
        const validationValid = validateLinkProbe.json?.valid === true || validateLinkProbe.json?.validationResult?.valid === true;

        checks.push(
            check(
                'HTTP-02',
                validateLinkProbe.ok && validateLinkProbe.status === 200 && validationResultOk && validationValid,
                `POST ${validateLinkPath}: HTTP ${validateLinkProbe.status}, ok: ${validationResultOk}, valid: ${validationValid}`
            )
        );
    } else {
        checks.push(check('HTTP-01', false, 'Skipped GET /api/v1/socialmediaos/sessions probe due to missing env vars.'));
        checks.push(check('HTTP-02', false, 'Skipped POST /api/v1/socialmediaos/validate-payment-link probe due to missing env vars.'));
    }

    return checks;
}

async function main() {
    const auditResults = await runAudit();
    let allPassed = true;

    console.log('--- SocialMediaOS Phase 1 Acceptance Audit ---');
    for (const result of auditResults) {
        const status = result.ok ? 'PASS' : 'FAIL';
        console.log(`${status} [${result.id}] ${result.detail}`);
        if (!result.ok) {
            allPassed = false;
        }
    }

    if (allPassed) {
        console.log('\nAll SocialMediaOS Phase 1 acceptance checks passed.');
        process.exit(0);
    } else {
        console.error('\nSome SocialMediaOS Phase 1 acceptance checks failed.');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('An unexpected error occurred during audit:', err);
    process.exit(1);
});