#!/usr/bin/env node

import "dotenv/config";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import net from "node:net";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || "20000");
const POLL_MS = Number(process.env.SMOKE_POLL_MS || "500");
const HEALTHZ_WAIT_MS = Number(process.env.SMOKE_TIMEOUT_MS || "30000");

const COUNCIL_TIMEOUT_MS = Number(process.env.COUNCIL_TIMEOUT_MS || "120000");
const COUNCIL_MEMBER = process.env.SMOKE_COUNCIL_MEMBER || "ollama_deepseek";

const AUTONOMY_PORT_FILE =
  process.env.AUTONOMY_PORT_FILE ||
  path.join(process.cwd(), "scripts", "autonomy", "last-port.txt");

const REQUESTED_PORT = process.env.REQUESTED_PORT || "64266";
const COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY || "smoke_test_key";
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";

const results = {
  ok: false,
  mode: null,
  steps: {},
};

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

function recordStep(name, payload) {
  results.steps[name] = { ...(results.steps[name] || {}), ...payload };
}

function normalizeError(err) {
  if (!err) return "Unknown error";
  if (err instanceof Error) return err.message;
  return String(err);
}

function emitResults(exitCode) {
  originalConsole.log(JSON.stringify(results, null, 2));
  process.exit(exitCode);
}

function suppressConsole() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

async function canBind(host) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", (err) => {
      if (["EACCES", "EPERM"].includes(err.code)) return resolve(false);
      resolve(true);
    });
    probe.listen(0, host, () => probe.close(() => resolve(true)));
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function makeRingBuffer(maxLines) {
  const lines = [];
  return {
    push(data) {
      const text = data.toString("utf-8");
      text.split(/\r?\n/).forEach((line) => {
        if (!line) return;
        lines.push(line);
        if (lines.length > maxLines) lines.shift();
      });
    },
    snapshot() {
      return [...lines];
    },
  };
}

function startChild(childEnv, buffers, onExit) {
  const child = spawn(process.execPath, ["server.js"], {
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => buffers.stdout.push(chunk));
  child.stderr.on("data", (chunk) => buffers.stderr.push(chunk));

  child.on("exit", (code, signal) => {
    const normalized = code ?? (signal ? 1 : 0);
    onExit(normalized, signal || null);
  });

  return child;
}

async function readPortFileIfFresh(startTimeMs) {
  try {
    const stat = await fs.stat(AUTONOMY_PORT_FILE);
    if (stat.mtimeMs < startTimeMs) return null;
    const raw = await fs.readFile(AUTONOMY_PORT_FILE, "utf-8");
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) return String(parsed);
  } catch {
    return null;
  }
  return null;
}

async function waitForHealthz(baseUrl, childExitRef) {
  const start = Date.now();
  while (Date.now() - start < HEALTHZ_WAIT_MS) {
    if (childExitRef.code !== null) {
      throw new Error(`Server exited early with code ${childExitRef.code}`);
    }
    try {
      const res = await fetchWithTimeout(`${baseUrl}/healthz`, {}, 5000);
      if (res.ok) return;
    } catch {
      // retry
    }
    await delay(POLL_MS);
  }
  throw new Error(`Timed out waiting for ${baseUrl}/healthz`);
}

async function verifyApiHealth(baseUrl) {
  const res = await fetchWithTimeout(`${baseUrl}/api/health`, {}, 8000);
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("/api/health did not return valid JSON");
  }
  if (!res.ok) throw new Error(`/api/health returned ${res.status}`);
  if (parsed.status !== "OK") throw new Error("/api/health status not OK");
  return parsed;
}

async function verifyOverlayNetwork(overlayUrl) {
  const res = await fetchWithTimeout(overlayUrl, {}, 8000);
  const body = await res.text();
  if (!res.ok) throw new Error(`Overlay page returned ${res.status}`);
  if (!body || body.length < 50) throw new Error("Overlay page response too small");
}

async function verifyAuditNetwork(endpointUrl, commandKey) {
  const payload = {
    business_type: "Real estate photography",
    location: "Austin, TX",
    competitor_urls: ["https://example.com"],
    goals: ["More booked consultations", "Higher conversion rate"],
  };

  const res = await fetchWithTimeout(
    endpointUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-command-key": commandKey,
      },
      body: JSON.stringify(payload),
    },
    180000
  );

  const text = await res.text();
  if (!res.ok) throw new Error(`Audit endpoint returned ${res.status}: ${text.slice(0, 300)}`);
  try {
    JSON.parse(text);
  } catch {
    throw new Error("Audit endpoint did not return valid JSON");
  }
}

function councilPayload() {
  return {
    message: "ping",
    member: COUNCIL_MEMBER,
    autoImplement: false,
    maxTokens: 64,
    temperature: 0,
  };
}

async function attemptCouncilConsultNetwork(baseUrl, commandKey) {
  const res = await fetchWithTimeout(
    `${baseUrl}/api/v1/chat`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-command-key": commandKey,
      },
      body: JSON.stringify(councilPayload()),
    },
    COUNCIL_TIMEOUT_MS
  );

  const text = await res.text();
  const ok = res.status >= 200 && res.status < 300;
  recordStep("council_consult", {
    ok,
    statusCode: res.status,
    response_preview: (text || "").slice(0, 300),
  });
  if (!ok) throw new Error(`Council consult failed with ${res.status}`);
}

async function injectRequest(app, { method, url, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const normalizedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[String(key).toLowerCase()] = value;
    }
    if (body && !normalizedHeaders["content-length"]) {
      normalizedHeaders["content-length"] = Buffer.byteLength(body);
    }

    const req = new Readable({
      read() {
        if (body) this.push(body);
        this.push(null);
      },
    });
    req.method = method;
    req.url = url;
    req.headers = normalizedHeaders;

    const socket = new net.Socket();
    Object.defineProperty(socket, "remoteAddress", { value: "127.0.0.1" });
    req.connection = socket;
    req.socket = socket;
    req.ip = "127.0.0.1";

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.locals = {};
    res.headersSent = false;
    res.finished = false;

    res.setHeader = (key, value) => {
      res.headers[String(key).toLowerCase()] = value;
    };
    res.getHeader = (key) => res.headers[String(key).toLowerCase()];
    res.removeHeader = (key) => {
      delete res.headers[String(key).toLowerCase()];
    };
    res.writeHead = (status, head) => {
      res.statusCode = status;
      if (head) Object.entries(head).forEach(([k, v]) => res.setHeader(k, v));
    };

    const chunks = [];
    res.write = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      res.headersSent = true;
      res.finished = true;
      res.emit("finish");
    };

    res.on("finish", () => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString("utf-8"),
      });
    });

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

async function attemptCouncilConsultInProcess(app, commandKey) {
  const result = await injectRequest(app, {
    method: "POST",
    url: "/api/v1/chat",
    headers: {
      "content-type": "application/json",
      "x-command-key": commandKey,
    },
    body: JSON.stringify(councilPayload()),
  });

  const ok = result.statusCode >= 200 && result.statusCode < 300;
  recordStep("council_consult", {
    ok,
    statusCode: result.statusCode,
    response_preview: (result.body || "").slice(0, 300),
  });
  if (!ok) throw new Error(`Council consult failed with ${result.statusCode}`);
}

function checkChildExit(childExitRef) {
  if (childExitRef.code !== null) {
    recordStep("child_exit", { ok: false, code: childExitRef.code, signal: childExitRef.signal });
    throw new Error(`Server exited early with code ${childExitRef.code}`);
  }
}

async function runNetworkMode(childEnv) {
  results.mode = "network";

  const buffers = { stdout: makeRingBuffer(220), stderr: makeRingBuffer(220) };
  const childExitRef = { code: null, signal: null };

  recordStep("server_start", { ok: true, detail: "spawned" });
  const startTime = Date.now();
  const child = startChild(childEnv, buffers, (code, signal) => {
    childExitRef.code = code;
    childExitRef.signal = signal;
  });

  try {
    const portFromFile = await readPortFileIfFresh(startTime);
    const activePort = portFromFile || REQUESTED_PORT;

    const baseUrl = `http://${HOST}:${activePort}`;
    const endpointUrl = `${baseUrl}/api/v1/website/audit`;
    const overlayUrl = `${baseUrl}/overlay/website-audit`;

    recordStep("base_url", { ok: true, url: baseUrl });

    try {
      await waitForHealthz(baseUrl, childExitRef);
      recordStep("healthz", { ok: true, url: `${baseUrl}/healthz` });
    } catch (err) {
      recordStep("healthz", { ok: false, error: normalizeError(err), url: `${baseUrl}/healthz` });
      throw err;
    }
    checkChildExit(childExitRef);

    try {
      const apiHealth = await verifyApiHealth(baseUrl);
      recordStep("api_health", { ok: true, url: `${baseUrl}/api/health` });
      recordStep("ollama_status", {
        ok: apiHealth?.ollama?.status === "ok",
        endpoint: apiHealth?.ollama?.endpoint,
      });
    } catch (err) {
      recordStep("api_health", { ok: false, error: normalizeError(err), url: `${baseUrl}/api/health` });
      throw err;
    }
    checkChildExit(childExitRef);

    try {
      await verifyOverlayNetwork(overlayUrl);
      recordStep("overlay", { ok: true, url: overlayUrl });
    } catch (err) {
      recordStep("overlay", { ok: false, error: normalizeError(err), url: overlayUrl });
      throw err;
    }
    checkChildExit(childExitRef);

    try {
      await attemptCouncilConsultNetwork(baseUrl, childEnv.COMMAND_CENTER_KEY);
    } catch (err) {
      if (!results.steps.council_consult) {
        recordStep("council_consult", { ok: false, error: normalizeError(err) });
      }
      throw err;
    }
    checkChildExit(childExitRef);

    try {
      await verifyAuditNetwork(endpointUrl, childEnv.COMMAND_CENTER_KEY);
      recordStep("audit", { ok: true, url: endpointUrl });
    } catch (err) {
      recordStep("audit", { ok: false, error: normalizeError(err), url: endpointUrl });
      throw err;
    }
  } catch (err) {
    recordStep("error", { ok: false, message: normalizeError(err) });
    recordStep("child_logs_tail", {
      ok: false,
      stdout_tail: buffers.stdout.snapshot(),
      stderr_tail: buffers.stderr.snapshot(),
      childExitCode: childExitRef.code,
    });
    throw err;
  } finally {
    if (childExitRef.code === null && child?.pid) {
      child.kill("SIGTERM");
      const shutdownStart = Date.now();
      while (Date.now() - shutdownStart < 6000) {
        if (childExitRef.code !== null) break;
        await delay(200);
      }
      if (childExitRef.code === null) child.kill("SIGKILL");
    }
  }
}

async function runInProcessMode(childEnv) {
  results.mode = "in_process";

  process.env.AUTONOMY_NO_LISTEN = "true";
  process.env.COMMAND_CENTER_KEY = childEnv.COMMAND_CENTER_KEY;
  process.env.DATABASE_URL = childEnv.DATABASE_URL;
  process.env.OLLAMA_ENDPOINT = childEnv.OLLAMA_ENDPOINT;

  suppressConsole();
  const { default: app } = await import(new URL("../../server.js", import.meta.url));

  try {
    await attemptCouncilConsultInProcess(app, childEnv.COMMAND_CENTER_KEY);
  } catch (err) {
    if (!results.steps.council_consult) {
      recordStep("council_consult", { ok: false, error: normalizeError(err) });
    }
    throw err;
  }

  const health = await injectRequest(app, { method: "GET", url: "/healthz" });
  const healthOk = health.statusCode >= 200 && health.statusCode < 300;
  recordStep("healthz", { ok: healthOk, statusCode: health.statusCode });
  if (!healthOk) throw new Error(`Health check failed: ${health.statusCode}`);

  const apiHealth = await injectRequest(app, { method: "GET", url: "/api/health" });
  let apiHealthOk = apiHealth.statusCode >= 200 && apiHealth.statusCode < 300;
  if (apiHealthOk) {
    try {
      const parsed = JSON.parse(apiHealth.body);
      apiHealthOk = parsed?.status === "OK";
    } catch {
      apiHealthOk = false;
    }
  }
  recordStep("api_health", { ok: apiHealthOk, statusCode: apiHealth.statusCode });
  if (!apiHealthOk) throw new Error("/api/health failed in-process");

  const overlay = await injectRequest(app, { method: "GET", url: "/overlay/website-audit" });
  const overlayOk = overlay.statusCode >= 200 && overlay.statusCode < 300 && overlay.body?.length >= 50;
  recordStep("overlay", { ok: overlayOk, statusCode: overlay.statusCode });
  if (!overlayOk) throw new Error(`Overlay failed: ${overlay.statusCode}`);

  const audit = await injectRequest(app, {
    method: "POST",
    url: "/api/v1/website/audit",
    headers: {
      "content-type": "application/json",
      "x-command-key": childEnv.COMMAND_CENTER_KEY,
    },
    body: JSON.stringify({
      business_type: "Real estate photography",
      location: "Austin, TX",
      competitor_urls: ["https://example.com"],
      goals: ["More booked consultations", "Higher conversion rate"],
    }),
  });

  let auditOk = audit.statusCode >= 200 && audit.statusCode < 300;
  if (auditOk) {
    try {
      JSON.parse(audit.body);
    } catch {
      auditOk = false;
    }
  }
  recordStep("audit", { ok: auditOk, statusCode: audit.statusCode });
  if (!auditOk) throw new Error("Audit endpoint failed in-process");
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    recordStep("database_url", { ok: false, error: "DATABASE_URL not set" });
    results.ok = false;
    emitResults(1);
  }
  recordStep("database_url", { ok: true });

  const bindAllowed = await canBind(HOST);
  recordStep("bind_check", { ok: true, allowed: bindAllowed });

  const childEnv = {
    ...process.env,
    PORT: REQUESTED_PORT,
    HOST,
    COMMAND_CENTER_KEY,
    DATABASE_URL,
    SANDBOX_MODE: "false",
    AUTONOMY_PORT_FILE,
    OLLAMA_ENDPOINT,
  };

  try {
    if (bindAllowed) {
      await runNetworkMode(childEnv);
    } else {
      recordStep("bind_check", { ok: true, allowed: false, detail: "fallback" });
      await runInProcessMode(childEnv);
    }

    const required = ["database_url", "bind_check", "healthz", "api_health", "overlay", "council_consult", "audit"];
    results.ok = required.every((k) => results.steps[k]?.ok === true);
  } catch (err) {
    recordStep("verification", { ok: false, error: normalizeError(err) });
    results.ok = false;
  }

  emitResults(results.ok ? 0 : 1);
}

main().catch((err) => {
  recordStep("verification", { ok: false, error: normalizeError(err) });
  results.ok = false;
  emitResults(1);
});
