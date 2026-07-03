#!/usr/bin/env node
/**
 * SYNOPSIS: Drive SocialMediaOS intake blueprint A→Z through founder chat (JWT path).
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOCIALMEDIAOS_INTAKE_SESSION } from '../services/lifeos-mission-pipeline-executor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
const RECEIPT = path.join(ROOT, 'products/receipts/SOCIALMEDIAOS_FOUNDER_CHAT_A2Z.json');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';

function resolveCreds() {
  const pairs = [
    ['LIFEOS_FOUNDER_LOGIN_EMAIL', 'LIFEOS_FOUNDER_LOGIN_PASSWORD'],
    ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
  ];
  for (const [ek, pk] of pairs) {
    const email = String(process.env[ek] || '').trim();
    const password = String(process.env[pk] || '');
    if (email && password.length >= 8) return { email, password, source: `${ek}+${pk}` };
  }
  return null;
}

async function founderChat(token, text) {
  const res = await fetch(`${BASE}/api/v1/lifeos/builderos/command-control/founder-interface/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : undefined,
      ...(token ? {} : { 'x-command-key': KEY }),
    },
    body: JSON.stringify({
      text,
      action: 'auto',
      conversational_mode: false,
      async: false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function main() {
  const started = Date.now();
  const report = {
    schema: 'socialmediaos_founder_chat_a2z_v1',
    at: new Date().toISOString(),
    base: BASE,
    session_id: SOCIALMEDIAOS_INTAKE_SESSION,
    ok: false,
    auth_path: null,
    steps: {},
  };

  let token = null;
  const creds = resolveCreds();
  if (creds) {
    const loginRes = await fetch(`${BASE}/api/v1/lifeos/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    });
    const loginData = await loginRes.json().catch(() => ({}));
    report.steps.login = { ok: loginRes.ok && loginData.ok, role: loginData.user?.role, source: creds.source };
    if (loginData.access_token) {
      token = loginData.access_token;
      report.auth_path = 'jwt';
    }
  }

  if (!token && KEY) {
    report.auth_path = 'command_key_fallback';
    report.steps.login = { ok: true, note: 'no local founder creds — using command key for chat drive only' };
  }

  if (!token && !KEY) {
    report.blocker = 'NO_AUTH';
    fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
    fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const buildMsg = `do: build SocialMediaOS intake blueprint A to Z — session ${SOCIALMEDIAOS_INTAKE_SESSION}`;
  const chat = await founderChat(token, buildMsg);
  report.steps.intake_chat = {
    ok: chat.res.ok,
    status: chat.res.status,
    auth_mode: chat.data.auth_mode,
    pass_fail: chat.data.pass_fail,
    command_truth: chat.data.command_truth,
    action: chat.data.action,
    chair_channel: chat.data.chair_channel,
    session_id: chat.data.session_id,
    first_blocker: chat.data.first_blocker,
    summary: String(chat.data.human_summary || chat.data.human_summary_technical || '').slice(0, 500),
  };

  report.ok = chat.data.pass_fail === 'PASS'
    || (chat.data.command_truth === 'COMMAND_RAN' && chat.data.ok !== false)
    || chat.data.already_complete === true;
  report.duration_ms = Date.now() - started;
  report.blocker = report.ok ? null : (chat.data.first_blocker || chat.data.reason || 'INTAKE_CHAT_FAILED');

  if (report.ok && KEY) {
    const acc = await fetch(`${BASE}/api/v1/socialmediaos/sessions`, {
      headers: { 'x-command-key': KEY },
    }).catch(() => null);
    if (acc) {
      const accData = await acc.json().catch(() => ({}));
      report.steps.api_probe = { ok: acc.ok, status: acc.status, body_ok: accData.ok };
    }
  }

  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
