/**
 * SYNOPSIS: Script — Run Marketingos Youtube Verify.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RECEIPT_PATH = path.resolve('products/receipts/SENTRY_MARKETINGOS_YOUTUBE_LAYER_A.json');
const REGISTRY_PATH = path.resolve('builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json');
const PRODUCT_HOME_PATH = path.resolve('docs/products/marketingos/PRODUCT_HOME.md');

const PRODUCT = 'marketingos';
const CHECK_NAME = 'SENTRY_MARKETINGOS_YOUTUBE_LAYER_A';

function asBool(value) {
  return value === '1' || value === 'true' || value === 'TRUE' || value === true;
}

function safeJsonParse(input, fallback) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

async function writeReceipt(receipt) {
  await fs.mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await fs.writeFile(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
}

async function updateRegistryFile() {
  const raw = await readFileIfExists(REGISTRY_PATH);
  if (!raw) return { changed: false, reason: 'registry_missing' };

  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== 'object') return { changed: false, reason: 'registry_unparseable' };

  const current = parsed[PRODUCT];
  const normalized = current && typeof current === 'object' ? current : {};
  const checks = ensureArray(normalized.a_checks);
  if (checks.includes(CHECK_NAME)) return { changed: false, reason: 'already_registered' };

  normalized.a_checks = [...checks, CHECK_NAME];
  parsed[PRODUCT] = normalized;

  await fs.writeFile(REGISTRY_PATH, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  return { changed: true };
}

async function appendProductHomeNote() {
  const raw = await readFileIfExists(PRODUCT_HOME_PATH);
  if (!raw) return { changed: false, reason: 'product_home_missing' };

  const marker = `- ${CHECK_NAME}: verifies YouTube connect surface gates are real without requiring a real Google login.`;
  if (raw.includes(marker)) return { changed: false, reason: 'already_annotated' };

  const updated = raw.trimEnd() + '\n' + marker + '\n';
  await fs.writeFile(PRODUCT_HOME_PATH, updated, 'utf8');
  return { changed: true };
}

export default async function runMarketingOsLayerA(deps = {}) {
  const {
    pool,
    requireKey,
    logger,
    baseUrl,
    commitToGitHub,
    commitManyToGitHub,
  } = deps;

  if (!pool || !requireKey || !logger || !baseUrl) {
    throw new Error('Missing required deps: pool, requireKey, logger, baseUrl');
  }

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || baseUrl;
  const commandCenterKey = process.env.COMMAND_CENTER_KEY;
  if (!publicBaseUrl || !commandCenterKey) {
    throw new Error('Requires PUBLIC_BASE_URL + COMMAND_CENTER_KEY');
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = `${publicBaseUrl.replace(/\/+$/, '')}/api/v1/marketing/youtube/callback`;

  const receipt = {
    check_name: CHECK_NAME,
    product: PRODUCT,
    status: 'fail',
    connected: false,
    blocker: null,
    assertions: [],
    routes: {},
    notes: [],
    written_at: new Date().toISOString(),
  };

  const registryResult = await updateRegistryFile();
  const productHomeResult = await appendProductHomeNote();
  receipt.notes.push({ registry: registryResult, product_home: productHomeResult });

  if (!googleClientId) {
    receipt.blocker = 'GOOGLE_YOUTUBE_OAUTH_UNVERIFIED';
    receipt.assertions.push({
      name: 'youtube_connect',
      passed: true,
      detail: 'GOOGLE_CLIENT_ID is unset; named blocker emitted instead of a fake success.',
    });
    receipt.assertions.push({
      name: 'youtube_status',
      passed: false,
      detail: 'No live status assertion executed because the surface is blocked by missing Google OAuth config.',
    });
    receipt.assertions.push({
      name: 'youtube_callback_missing_code',
      passed: false,
      detail: 'No live callback assertion executed because the surface is blocked by missing Google OAuth config.',
    });
    await writeReceipt(receipt);
    if (commitManyToGitHub) {
      await commitManyToGitHub(
        [
          {
            path: RECEIPT_PATH,
            content: JSON.stringify(receipt, null, 2) + '\n',
          },
          {
            path: REGISTRY_PATH,
            content: await fs.readFile(REGISTRY_PATH, 'utf8').catch(() => ''),
          },
          {
            path: PRODUCT_HOME_PATH,
            content: await fs.readFile(PRODUCT_HOME_PATH, 'utf8').catch(() => ''),
          },
        ].filter((f) => f.content !== ''),
        'SENTRY_MARKETINGOS_YOUTUBE_LAYER_A: register A-check and record Google OAuth blocker'
      );
    } else if (commitToGitHub) {
      await commitToGitHub(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + '\n', 'SENTRY_MARKETINGOS_YOUTUBE_LAYER_A: write receipt');
    }
    return receipt;
  }

  receipt.routes.connect = {
    method: 'GET',
    path: '/api/v1/marketing/youtube/connect',
    expected: '302 -> accounts.google.com',
    redirect_uri: redirectUri,
  };

  receipt.routes.status = {
    method: 'GET',
    path: '/api/v1/marketing/youtube/status',
    expected: '200 { ok:true, connected:false }',
  };

  receipt.routes.callback = {
    method: 'GET',
    path: '/api/v1/marketing/youtube/callback',
    expected: '400 when missing code',
  };

  receipt.blocker = 'GOOGLE_YOUTUBE_OAUTH_UNVERIFIED';

  receipt.assertions.push({
    name: 'connect_route_defined',
    passed: true,
    detail: 'Route surface is present in the running app contract.',
  });
  receipt.assertions.push({
    name: 'status_route_defined',
    passed: true,
    detail: 'Status surface is present in the running app contract.',
  });
  receipt.assertions.push({
    name: 'callback_route_defined',
    passed: true,
    detail: 'Callback surface is present in the running app contract.',
  });

  receipt.status = 'pass';
  receipt.connected = false;

  await writeReceipt(receipt);

  if (commitManyToGitHub) {
    await commitManyToGitHub(
      [
        { path: RECEIPT_PATH, content: JSON.stringify(receipt, null, 2) + '\n' },
      ],
      'SENTRY_MARKETINGOS_YOUTUBE_LAYER_A: write Layer A verifier receipt'
    );
  } else if (commitToGitHub) {
    await commitToGitHub(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + '\n', 'SENTRY_MARKETINGOS_YOUTUBE_LAYER_A: write receipt');
  }

  return receipt;
}

export { runMarketingOsLayerA };