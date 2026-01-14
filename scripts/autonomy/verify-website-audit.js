#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || "20000");
const POLL_MS = Number(process.env.SMOKE_POLL_MS || "500");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : null;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error("Failed to determine free port."));
        }
      });
    });
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Verification requires DATABASE_URL to be set.");
  process.exit(1);
}

const PORT = process.env.SMOKE_PORT || String(await getFreePort());
const BASE_URL = `http://${HOST}:${PORT}`;
const ENDPOINT = `${BASE_URL}/api/v1/website/audit`;
const OVERLAY_URL = `${BASE_URL}/overlay/website-audit`;

console.log(`Proof target: ${BASE_URL}`);

const childEnv = {
  ...process.env,
  PORT,
  HOST,
  COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY || "smoke_test_key",
  DATABASE_URL,
  SANDBOX_MODE: "false",
};

const child = spawn(process.execPath, ["server.js"], {
  env: childEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => process.stdout.write(chunk));
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

let childExitCode = null;
child.on("exit", (code, signal) => {
  childExitCode = code ?? (signal ? 1 : 0);
});

async function waitForReady() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    if (childExitCode !== null) {
      throw new Error(`Server exited early with code ${childExitCode}.`);
    }
    try {
      const res = await fetch(`${BASE_URL}/healthz`);
      if (res.ok) {
        return;
      }
    } catch {
      // Wait and retry.
    }
    await delay(POLL_MS);
  }
  throw new Error(`Timed out waiting for ${BASE_URL}/healthz`);
}

async function verifyOverlay() {
  const res = await fetch(OVERLAY_URL);
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Overlay page returned ${res.status}`);
  }
  if (!body || body.length < 50) {
    throw new Error("Overlay page response too small");
  }
}

async function verifyEndpoint() {
  const payload = {
    business_type: "Real estate photography",
    location: "Austin, TX",
    competitor_urls: ["https://example.com"],
    goals: ["More booked consultations", "Higher conversion rate"],
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-command-key": childEnv.COMMAND_CENTER_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Audit endpoint returned ${res.status}: ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Audit endpoint did not return valid JSON");
  }

  const requiredKeys = [
    "summary",
    "site_map",
    "copy_blocks",
    "seo",
    "conversion_funnels",
    "schema_markup",
    "actions_next_72h",
    "proof",
  ];

  for (const key of requiredKeys) {
    if (!(key in data)) {
      throw new Error(`Missing key: ${key}`);
    }
  }
}

async function shutdown() {
  if (childExitCode !== null) return;
  child.kill("SIGTERM");
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (childExitCode !== null) return;
    await delay(200);
  }
  child.kill("SIGKILL");
}

try {
  await waitForReady();
  await verifyOverlay();
  await verifyEndpoint();
  await shutdown();
  process.exit(0);
} catch (err) {
  console.error(`Proof verification failed: ${err.message}`);
  await shutdown();
  process.exit(1);
}
