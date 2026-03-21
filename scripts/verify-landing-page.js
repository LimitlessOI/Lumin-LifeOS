import { exec } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_PORT = 3000;
const PORT_FILE = path.join(process.cwd(), 'scripts', 'autonomy', 'last-port.txt');
const OVERLAY_PATH = 'public/overlay/website-audit.html';

function parsePort(value) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
    return parsed;
  }
  return null;
}

async function resolvePort() {
  if (process.env.SMOKE_PORT) {
    const envPort = parsePort(process.env.SMOKE_PORT);
    if (envPort) {
      return envPort;
    }
  }

  try {
    const raw = await readFile(PORT_FILE, 'utf-8');
    const filePort = parsePort(raw.trim());
    if (filePort) {
      return filePort;
    }
  } catch {
    // Ignore missing port file.
  }

  return DEFAULT_PORT;
}

function runCurl(url) {
  return new Promise((resolve) => {
    exec(`curl -s ${url}`, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, error: error.message, stdout: stdout || '', stderr: stderr || '' });
        return;
      }
      if (stderr) {
        resolve({ ok: false, error: stderr.trim(), stdout: stdout || '', stderr: stderr || '' });
        return;
      }
      resolve({ ok: true, stdout: stdout || '' });
    });
  });
}

async function verify() {
  const port = await resolvePort();
  const healthUrl = `http://localhost:${port}/api/health`;

  const results = {
    ok: false,
    steps: {
      health: { ok: false, url: healthUrl },
      overlay_file: { ok: false, path: OVERLAY_PATH },
    },
  };

  const healthResult = await runCurl(healthUrl);
  if (!healthResult.ok) {
    results.steps.health.error = healthResult.error || 'curl failed';
  } else {
    try {
      const data = JSON.parse(healthResult.stdout);
      if (data && data.status === 'OK') {
        results.steps.health.ok = true;
      } else {
        results.steps.health.error = 'status not OK';
      }
    } catch (error) {
      results.steps.health.error = `invalid JSON: ${error.message}`;
    }
  }

  try {
    await access(OVERLAY_PATH, fsConstants.F_OK);
    results.steps.overlay_file.ok = true;
  } catch (error) {
    results.steps.overlay_file.error = error.message;
  }

  results.ok = Object.values(results.steps).every((step) => step.ok);
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.ok ? 0 : 1);
}

verify().catch((error) => {
  const results = {
    ok: false,
    steps: {
      health: { ok: false, url: null, error: 'unexpected failure' },
      overlay_file: { ok: false, path: OVERLAY_PATH, error: 'unexpected failure' },
    },
    error: error.message,
  };
  console.log(JSON.stringify(results, null, 2));
  process.exit(1);
});
