#!/usr/bin/env node
/**
 * SYNOPSIS: Prove founder chat path uses JWT only (no command key) — login → Lumin message.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
const RECEIPT = path.join(ROOT, 'products/receipts/FOUNDER_JWT_CHAT_PROOF.json');

function resolveCreds() {
  const pairs = [
    ['LIFEOS_FOUNDER_LOGIN_EMAIL', 'LIFEOS_FOUNDER_LOGIN_PASSWORD'],
    ['WORK_EMAIL', 'WORK_EMAIL_APP_PASSWORD'],
  ];
  for (const [ek, pk] of pairs) {
    const email = String(process.env[ek] || '').trim();
    const password = String(process.env[pk] || '');
    if (email && password.length >= 8 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { email, password, source: `${ek}+${pk}` };
    }
  }
  return null;
}

async function main() {
  const report = {
    schema: 'founder_jwt_chat_proof_v1',
    at: new Date().toISOString(),
    base: BASE,
    ok: false,
    auth_mode: null,
    steps: {},
  };

  const creds = resolveCreds();
  if (!creds) {
    report.blocker = 'MISSING_FOUNDER_CREDS_LOCAL';
    fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
    fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const loginRes = await fetch(`${BASE}/api/v1/lifeos/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  report.steps.login = { ok: loginRes.ok && loginData.ok, status: loginRes.status, user: loginData.user?.user_handle, role: loginData.user?.role };
  if (!report.steps.login.ok) {
    report.blocker = 'LOGIN_FAILED';
    report.steps.login.error = loginData.error;
    fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
    fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const token = loginData.access_token;
  const chatRes = await fetch(`${BASE}/api/v1/lifeos/builderos/command-control/founder-interface/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: 'counsel only — reply in one short sentence: are you receiving me on JWT auth?',
      action: 'auto',
      conversational_mode: true,
      async: false,
    }),
  });
  const chatData = await chatRes.json().catch(() => ({}));
  report.steps.chat = {
    ok: chatRes.ok && chatData.ok !== false,
    status: chatRes.status,
    auth_mode: chatData.auth_mode,
    pass_fail: chatData.pass_fail,
    command_truth: chatData.command_truth,
    reply_preview: String(chatData.human_summary || chatData.reason || '').slice(0, 200),
  };
  report.auth_mode = chatData.auth_mode || (chatRes.status === 401 ? 'auth_failed' : 'unknown');
  report.ok = report.steps.chat.ok && report.auth_mode === 'account_jwt';
  report.blocker = report.ok ? null : (report.auth_mode !== 'account_jwt' ? 'NOT_JWT_AUTH' : 'CHAT_FAILED');

  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
  process.exit(1);
});
