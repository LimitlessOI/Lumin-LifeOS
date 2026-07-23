/**
 * SYNOPSIS: Flush Site Builder outreach queue (SMS/voice) only in local business hours.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 *
 * Usage:
 *   PUBLIC_BASE_URL=... COMMAND_CENTER_KEY=... node scripts/site-builder-flush-outreach-queue.mjs
 *   FORCE_SEND=1 …  # bypass business-hours window (tests only)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const QUEUE_PATH = path.join(process.cwd(), 'data/site-builder-outreach-queue.json');
const BASE = String(process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || '';
const FORCE = String(process.env.FORCE_SEND || '') === '1';
const TZ = 'America/Los_Angeles';

function localParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    stamp: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${TZ}`,
  };
}

function inBusinessHours(date = new Date()) {
  const { hour } = localParts(date);
  return hour >= 8 && hour < 17;
}

async function tipPost(pathname, body) {
  const resp = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-command-key': KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, json };
}

async function main() {
  if (!KEY) {
    console.error('COMMAND_CENTER_KEY required');
    process.exit(1);
  }
  const now = new Date();
  const local = localParts(now);
  if (!FORCE && !inBusinessHours(now)) {
    console.log(JSON.stringify({
      ok: true,
      deferred: true,
      reason: 'outside_business_hours',
      local: local.stamp,
      next: 'Re-run after 08:00 America/Los_Angeles',
    }, null, 2));
    process.exit(0);
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
  const results = [];
  for (const item of queue.queued || []) {
    if (item.status === 'sent' || item.status === 'skipped') {
      results.push({ id: item.id, skipped: true, status: item.status });
      continue;
    }
    if (item.clientId) {
      try {
        const st = await fetch(`${BASE}/api/v1/sites/prospects/${encodeURIComponent(item.clientId)}/status`, {
          headers: { 'x-command-key': KEY },
        });
        const body = await st.json().catch(() => ({}));
        if (String(body.status || '').toLowerCase() === 'contacted') {
          item.status = 'sent';
          item.skipReason = 'already_contacted_on_tip';
          results.push({ id: item.id, skipped: true, reason: 'already_contacted_on_tip' });
          continue;
        }
      } catch {
        // ignore — still attempt send
      }
    }
    if (item.sendAfterLocal && new Date(item.sendAfterLocal) > now && !FORCE) {
      results.push({ id: item.id, deferred: true, sendAfterLocal: item.sendAfterLocal });
      continue;
    }
    if (item.qa?.poisoned) {
      item.status = 'skipped';
      item.skipReason = 'poisoned_preview';
      results.push({ id: item.id, skipped: true, reason: 'poisoned_preview' });
      continue;
    }

    const out = { id: item.id, channels: {} };
    if (item.channels?.includes('sms') && item.phone && item.smsBody) {
      const sms = await tipPost('/api/v1/lifeos/founder/sms', {
        to: item.phone,
        body: item.smsBody,
      });
      out.channels.sms = { status: sms.status, ok: sms.json?.ok === true, sid: sms.json?.sid, error: sms.json?.error };
    }
    if (item.channels?.includes('voice') && item.phone) {
      const voice = await tipPost('/api/v1/lifeos/founder/voice/call', {
        to: item.phone,
        businessName: item.businessName,
        previewUrl: item.previewUrl,
      });
      out.channels.voice = { status: voice.status, ok: voice.json?.ok === true, sid: voice.json?.sid, error: voice.json?.error };
    }
    const anyOk = Object.values(out.channels).some((c) => c.ok);
    item.status = anyOk ? 'sent' : 'failed';
    item.sentAt = new Date().toISOString();
    item.lastResult = out.channels;

    // Tip status mark (best-effort). Queue file also flips to sent for this checkout.
    if (anyOk && item.clientId) {
      await fetch(`${BASE}/api/v1/sites/prospects/${encodeURIComponent(item.clientId)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-command-key': KEY },
        body: JSON.stringify({ status: 'contacted' }),
      }).catch(() => null);
    }

    results.push(out);
  }

  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, local: local.stamp, forced: FORCE, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});