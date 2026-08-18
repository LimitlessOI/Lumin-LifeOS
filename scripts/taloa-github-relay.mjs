#!/usr/bin/env node
/**
 * SYNOPSIS: Local Mac relay between a GitHub control file and Taloa's proven
 * /tmp/taloa-cmd command channel. Designed to run continuously on the founder's
 * Mac. It polls one dedicated command file, executes only a narrow allowlist,
 * and writes a receipt back without exposing secrets or raw screen captures.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.env.TALOA_REPO_ROOT || '/Users/adamhopkins/Projects/Lumin-LifeOS';
const ENV_PATH = path.join(ROOT, '.env');
const OWNER_REPO = process.env.GITHUB_REPO || readEnv('GITHUB_REPO') || 'LimitlessOI/Lumin-LifeOS';
const TOKEN = process.env.GITHUB_TOKEN || readEnv('GITHUB_TOKEN');
const BRANCH = process.env.TALOA_RELAY_BRANCH || 'main';
const COMMAND_PATH = process.env.TALOA_RELAY_COMMAND_PATH || 'control/taloa-live-command.json';
const RECEIPT_PATH = process.env.TALOA_RELAY_RECEIPT_PATH || 'control/taloa-live-receipt.json';
const POLL_MS = Math.max(1000, Number(process.env.TALOA_RELAY_POLL_MS || 2500));
const CLI = path.join(ROOT, 'scripts/taloa.mjs');
const OCR = path.join(ROOT, 'scripts/taloa-vision-ocr.swift');
const FRAME_DIR = '/tmp/taloa-relay-frames';

const ALLOWED = new Set(['state', 'capture', 'capture_all', 'click', 'type', 'point', 'highlight', 'caption', 'clear']);
let lastRequestId = null;

if (!TOKEN) throw new Error('GITHUB_TOKEN is required in local environment');
if (!OWNER_REPO.includes('/')) throw new Error('GITHUB_REPO must be owner/repo');

function readEnv(name) {
  try {
    const body = fs.readFileSync(ENV_PATH, 'utf8');
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 1) continue;
      if (line.slice(0, idx).trim() !== name) continue;
      let value = line.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      return value;
    }
  } catch {}
  return '';
}

function api(pathname) {
  return `https://api.github.com/repos/${OWNER_REPO}/${pathname}`;
}

async function gh(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

async function readControlFile(filePath) {
  try {
    const data = await gh(api(`contents/${filePath}?ref=${encodeURIComponent(BRANCH)}`));
    return {
      sha: data.sha,
      value: JSON.parse(Buffer.from(String(data.content || '').replace(/\n/g, ''), 'base64').toString('utf8')),
    };
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function writeControlFile(filePath, value, message) {
  let sha = null;
  try { sha = (await readControlFile(filePath))?.sha || null; } catch {}
  const payload = {
    message,
    branch: BRANCH,
    content: Buffer.from(JSON.stringify(value, null, 2) + '\n').toString('base64'),
  };
  if (sha) payload.sha = sha;
  return gh(api(`contents/${filePath}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function run(argv, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), { cwd: ROOT, env: process.env });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function cliArgs(command) {
  const op = command.op;
  switch (op) {
    case 'state': return ['node', CLI, 'state'];
    case 'clear': return ['node', CLI, 'clear'];
    case 'caption': return ['node', CLI, 'caption', String(command.text || ''), String(command.seconds || 5)];
    case 'point': return ['node', CLI, 'point', String(command.x), String(command.y), String(command.label || ''), String(command.seconds || 4)];
    case 'highlight': return ['node', CLI, 'highlight', String(command.x), String(command.y), String(command.width), String(command.height), String(command.label || ''), String(command.seconds || 4)];
    case 'click': return ['node', CLI, 'click', String(command.x), String(command.y), String(command.label || 'click target')];
    case 'type': return ['node', CLI, 'type', String(command.x), String(command.y), String(command.text || ''), command.press_return ? 'return' : ''];
    case 'capture': return ['node', CLI, 'capture', String(command.display || 1), String(command.path || `${FRAME_DIR}/display-${command.display || 1}.png`)];
    case 'capture_all': return ['node', CLI, 'capture-all', FRAME_DIR];
    default: return null;
  }
}

async function ocrImage(imagePath, displayBounds = null) {
  const result = await run(['/usr/bin/swift', OCR, imagePath], 60000);
  if (!result.ok) return { ok: false, error: result.stderr || 'ocr_failed' };
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { return { ok: false, error: 'ocr_unparseable' }; }
  const [gx, gy, gw, gh] = displayBounds || [0, 0, parsed.imageWidth, parsed.imageHeight];
  const sx = parsed.imageWidth ? gw / parsed.imageWidth : 1;
  const sy = parsed.imageHeight ? gh / parsed.imageHeight : 1;
  return {
    ok: parsed.ok,
    imageWidth: parsed.imageWidth,
    imageHeight: parsed.imageHeight,
    items: (parsed.items || []).map(item => ({
      text: item.text,
      confidence: item.confidence,
      global: {
        x: gx + item.x * sx,
        y: gy + item.y * sy,
        width: item.width * sx,
        height: item.height * sy,
        center_x: gx + (item.x + item.width / 2) * sx,
        center_y: gy + (item.y + item.height / 2) * sy,
      },
    })),
  };
}

async function execute(command) {
  if (!command || !ALLOWED.has(command.op)) return { ok: false, error: 'op_not_allowed' };
  const args = cliArgs(command);
  if (!args) return { ok: false, error: 'unsupported_shape' };
  const result = await run(args, command.op.startsWith('capture') ? 60000 : 30000);
  let parsed = null;
  try { parsed = result.stdout ? JSON.parse(result.stdout) : null; } catch {}
  const receipt = { ok: result.ok, op: command.op, taloa: parsed, stderr: result.ok ? undefined : result.stderr };

  if (result.ok && command.op === 'capture') {
    const capturePath = parsed?.path || command.path || `${FRAME_DIR}/display-${command.display || 1}.png`;
    const bounds = parsed?.display_bounds || null;
    receipt.ocr = await ocrImage(capturePath, bounds);
  }
  if (result.ok && command.op === 'capture_all') {
    const frames = [];
    for (const frame of parsed?.frames || []) {
      const bounds = [frame.x, frame.y, frame.width, frame.height];
      frames.push({ index: frame.index, name: frame.name, ocr: await ocrImage(frame.path, bounds) });
    }
    receipt.frames = frames;
  }
  return receipt;
}

async function loop() {
  fs.mkdirSync(FRAME_DIR, { recursive: true });
  console.log(`[taloa-relay] polling ${OWNER_REPO}:${BRANCH}/${COMMAND_PATH} every ${POLL_MS}ms`);
  while (true) {
    try {
      const remote = await readControlFile(COMMAND_PATH);
      const command = remote?.value || null;
      const requestId = String(command?.request_id || '');
      if (requestId && requestId !== lastRequestId) {
        lastRequestId = requestId;
        const startedAt = new Date().toISOString();
        const result = await execute(command);
        await writeControlFile(RECEIPT_PATH, {
          schema: 'taloa_live_relay_receipt_v1',
          request_id: requestId,
          started_at: startedAt,
          completed_at: new Date().toISOString(),
          host: os.hostname(),
          ...result,
        }, `[taloa-relay] receipt ${requestId}`);
      }
    } catch (error) {
      console.error(`[taloa-relay] ${error.message}`);
    }
    await sleep(POLL_MS);
  }
}

loop();
