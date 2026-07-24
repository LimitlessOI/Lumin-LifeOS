// SYNOPSIS: Interactive social-login browser sessions for MarketingOS Connect.
// Opens the platform's real login page in a server browser; the user drives it
// via screenshot + click/type from a popup (bank-style — password never enters SMOS forms).
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { createSession } from './browser-agent.js';
import { SOCIAL_PLATFORMS } from './marketing-social-goals.js';
import { saveConnection } from './marketing-social-connections.js';

const LOGIN_URLS = {
  instagram: 'https://www.instagram.com/accounts/login/',
  linkedin: 'https://www.linkedin.com/login',
  x: 'https://x.com/i/flow/login',
  facebook: 'https://www.facebook.com/login/',
};

const sessions = new Map();
const TTL_MS = 15 * 60 * 1000;

function sessionKey(ownerId, platform) {
  return `${ownerId}::${platform}`;
}

function purgeExpired() {
  const now = Date.now();
  for (const [key, row] of sessions.entries()) {
    if (now - row.startedAt > TTL_MS) {
      row.browserSession?.close?.().catch(() => {});
      sessions.delete(key);
    }
  }
}

export function isSupportedSocialPlatform(platform) {
  return SOCIAL_PLATFORMS.includes(String(platform || '').toLowerCase());
}

export async function startConnectSession({ ownerId, platform, logger = console } = {}) {
  purgeExpired();
  const pid = String(platform || '').toLowerCase();
  const oid = String(ownerId || '').trim();
  if (!oid) return { ok: false, error: 'owner_id_required' };
  if (!isSupportedSocialPlatform(pid)) {
    return { ok: false, error: 'unsupported_platform', platforms: SOCIAL_PLATFORMS };
  }

  const key = sessionKey(oid, pid);
  const existing = sessions.get(key);
  if (existing) {
    await existing.browserSession?.close?.().catch(() => {});
    sessions.delete(key);
  }

  let browserSession;
  try {
    browserSession = await createSession({ headless: true, logger });
    await browserSession.navigate(LOGIN_URLS[pid]);
  } catch (err) {
    await browserSession?.close?.().catch(() => {});
    return { ok: false, error: err?.message || 'browser_launch_failed' };
  }

  const row = {
    ownerId: oid,
    platform: pid,
    browserSession,
    startedAt: Date.now(),
    lastError: null,
  };
  sessions.set(key, row);

  const shot = await captureScreenshot(row);
  return {
    ok: true,
    platform: pid,
    ownerId: oid,
    loginUrl: LOGIN_URLS[pid],
    expiresInMs: TTL_MS,
    screenshotBase64: shot.screenshotBase64,
    url: shot.url,
  };
}

async function captureScreenshot(row) {
  const page = row.browserSession?.page;
  if (!page) return { screenshotBase64: null, url: null };
  const screenshotBase64 = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 62 });
  return { screenshotBase64, url: page.url() };
}

export async function getConnectSessionStatus({ ownerId, platform } = {}) {
  purgeExpired();
  const key = sessionKey(String(ownerId || '').trim(), String(platform || '').toLowerCase());
  const row = sessions.get(key);
  if (!row) return { ok: false, error: 'connect_session_not_found' };
  try {
    const shot = await captureScreenshot(row);
    return {
      ok: true,
      platform: row.platform,
      ownerId: row.ownerId,
      url: shot.url,
      screenshotBase64: shot.screenshotBase64,
      ageMs: Date.now() - row.startedAt,
      expiresInMs: Math.max(0, TTL_MS - (Date.now() - row.startedAt)),
      lastError: row.lastError,
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'status_failed' };
  }
}

export async function interactConnectSession({ ownerId, platform, action, payload = {} } = {}) {
  purgeExpired();
  const key = sessionKey(String(ownerId || '').trim(), String(platform || '').toLowerCase());
  const row = sessions.get(key);
  if (!row?.browserSession?.page) return { ok: false, error: 'connect_session_not_found' };
  const page = row.browserSession.page;
  try {
    const act = String(action || '').toLowerCase();
    if (act === 'click') {
      const x = Number(payload.x);
      const y = Number(payload.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: 'click_coords_required' };
      await page.mouse.click(x, y);
    } else if (act === 'type') {
      const text = String(payload.text ?? '');
      if (!text) return { ok: false, error: 'type_text_required' };
      await page.keyboard.type(text, { delay: 25 });
    } else if (act === 'press') {
      const keyName = String(payload.key || 'Enter');
      await page.keyboard.press(keyName);
    } else if (act === 'navigate') {
      const url = String(payload.url || LOGIN_URLS[row.platform]);
      await row.browserSession.navigate(url);
    } else {
      return { ok: false, error: 'unsupported_action' };
    }
    await page.waitForTimeout?.(350);
    const shot = await captureScreenshot(row);
    return { ok: true, url: shot.url, screenshotBase64: shot.screenshotBase64 };
  } catch (err) {
    row.lastError = err?.message || String(err);
    return { ok: false, error: row.lastError };
  }
}

export async function completeConnectSession({ pool, ownerId, platform } = {}) {
  purgeExpired();
  const pid = String(platform || '').toLowerCase();
  const oid = String(ownerId || '').trim();
  const key = sessionKey(oid, pid);
  const row = sessions.get(key);
  if (!row?.browserSession?.page) return { ok: false, error: 'connect_session_not_found' };

  try {
    const page = row.browserSession.page;
    const cookies = await page.cookies();
    if (!Array.isArray(cookies) || cookies.length < 1) {
      return { ok: false, error: 'no_cookies_captured', hint: 'Finish signing in on the platform, then click Connected.' };
    }

    const sessionState = {
      cookies,
      url: page.url(),
      capturedAt: new Date().toISOString(),
      userAgent: await page.evaluate(() => navigator.userAgent).catch(() => null),
    };

    const saved = await saveConnection(pool, {
      ownerId: oid,
      platform: pid,
      sessionState,
      status: 'connected',
    });

    await row.browserSession.close().catch(() => {});
    sessions.delete(key);

    if (!saved?.ok) return { ok: false, error: saved?.error || 'save_failed' };
    return { ok: true, connection: saved.connection };
  } catch (err) {
    return { ok: false, error: err?.message || 'complete_failed' };
  }
}

export async function cancelConnectSession({ ownerId, platform } = {}) {
  const key = sessionKey(String(ownerId || '').trim(), String(platform || '').toLowerCase());
  const row = sessions.get(key);
  if (!row) return { ok: true, cancelled: false };
  await row.browserSession?.close?.().catch(() => {});
  sessions.delete(key);
  return { ok: true, cancelled: true };
}

export async function applyConnectionCookies(session, sessionState) {
  const cookies = sessionState?.cookies;
  if (!session?.page || !Array.isArray(cookies) || !cookies.length) {
    return { ok: false, reason: 'no_cookies' };
  }
  const normalized = cookies
    .filter((c) => c && c.name && c.value && c.domain)
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.expires,
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite: c.sameSite,
    }));
  if (!normalized.length) return { ok: false, reason: 'no_valid_cookies' };
  await session.page.setCookie(...normalized);
  return { ok: true, count: normalized.length };
}

export default {
  startConnectSession,
  getConnectSessionStatus,
  interactConnectSession,
  completeConnectSession,
  cancelConnectSession,
  applyConnectionCookies,
  isSupportedSocialPlatform,
};