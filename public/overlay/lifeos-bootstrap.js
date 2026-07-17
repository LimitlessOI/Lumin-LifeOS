/**
 * SYNOPSIS: Shared overlay bootstrap — JWT/command key context, headers, and (when embedded)
 * Shared overlay bootstrap — JWT/command key context, headers, and (when embedded)
 * shell keyboard bridge so parent `lifeos-app.html` can open Lumin from iframe pages.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
(function initLifeOSBootstrap() {
  // ── Token management ─────────────────────────────────────────────────────────
  const ACCESS_KEY  = 'lifeos_access_token';
  const REFRESH_KEY = 'lifeos_refresh_token';

  function getAccessToken()  { return localStorage.getItem(ACCESS_KEY) || ''; }
  function getRefreshToken() { return localStorage.getItem(REFRESH_KEY) || ''; }

  function storeTokens(accessToken, refreshToken) {
    if (accessToken)  localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  }

  function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  function decodeB64Url(str) {
    const b64 = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    return atob(b64 + pad);
  }

  /** Decode the JWT payload (no verification — that happens server-side). */
  function decodeToken(token) {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      return JSON.parse(decodeB64Url(parts[1]));
    } catch { return null; }
  }

  /** True if token exists and is not expired (with 5 min refresh buffer). */
  function isTokenValid(token) {
    const p = decodeToken(token);
    return p && p.exp && (p.exp - 5 * 60_000) > Date.now();
  }

  /** True if token exists but is expired or expiring soon. */
  function tokenNeedsRefresh(token) {
    if (!token) return !!getRefreshToken();
    const p = decodeToken(token);
    if (!p || !p.exp) return !!getRefreshToken();
    return p.exp - 5 * 60_000 <= Date.now();
  }

  /**
   * Attempt a token refresh in the background.
   * Returns the new access token string, or '' on failure.
   */
  async function attemptRefresh() {
    const refresh = getRefreshToken();
    if (!refresh) return '';
    try {
      const r = await fetch('/api/v1/lifeos/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const data = await r.json();
      if (data.ok && data.access_token) {
        storeTokens(data.access_token, null);
        if (data.user) {
          localStorage.setItem('lifeos_user',  data.user.user_handle);
          localStorage.setItem('lifeosUser',   data.user.user_handle);
          localStorage.setItem('lifeos_name',  data.user.display_name || data.user.user_handle);
          localStorage.setItem('lifeos_tier',  data.user.tier || 'free');
          localStorage.setItem('lifeos_role',  data.user.role || 'member');
        }
        return data.access_token;
      }
    } catch { /* network error — handled by caller */ }
    return '';
  }

  // ── Legacy API key (internal tools / command center) ─────────────────────────
  function normalizeKey(raw) {
    return String(raw || '')
      .replace(/\uFEFF/g, '')
      .replace(/[\r\n\u200B-\u200D\u2060]+/g, '')
      .trim();
  }
  function normalizeUser(raw, fallback = 'adam') { return String(raw || '').trim() || fallback; }

  /** Doc placeholders and common copy mistakes — never treat as a real key. */
  function isPlaceholderKey(raw) {
    const k = normalizeKey(raw);
    if (!k || k.length < 8) return true;
    if (/^YOUR_/i.test(k)) return true;
    if (/^PASTE_/i.test(k)) return true;
    if (k === 'COMMAND_CENTER_KEY' || k === 'COMMAND_KEY' || k === 'LIFEOS_KEY') return true;
    return false;
  }

  function normalizeCommandKey(raw) {
    const k = normalizeKey(raw);
    return isPlaceholderKey(k) ? '' : k;
  }

  function clearStoredKeys() {
    localStorage.removeItem('commandKey');
    localStorage.removeItem('command_key');
    localStorage.removeItem('lifeos_key');
  }

  function persistKey(key) {
    const k = normalizeCommandKey(key);
    if (!k) return '';
    localStorage.setItem('commandKey',   k);
    localStorage.setItem('command_key',  k);
    localStorage.setItem('lifeos_key',   k);
    return k;
  }

  function persistUser(user) {
    if (!user) return;
    localStorage.setItem('lifeos_user',  user);
    localStorage.setItem('lifeosUser',   user);
  }

  // ── Main context factory ─────────────────────────────────────────────────────

  /**
   * getLifeOSContext({ promptForKey, defaultUser, keyPrompt })
   *
   * Returns a context object used by every overlay page:
   *   ctx.API          — base URL (empty = same origin)
   *   ctx.KEY          — legacy command key (for admin/internal routes)
   *   ctx.USER         — user handle string
   *   ctx.TOKEN        — JWT access token (preferred; may be '' for guests)
   *   ctx.authenticated— true if a valid JWT is present
   *   ctx.tier         — 'free' | 'core' | 'premium' | 'family'
   *   ctx.role         — 'admin' | 'member'
   *   ctx.headers(extra) — returns request headers for API calls
   *   ctx.setKey(k)    — update the legacy key
   *   ctx.setUser(u)   — update the user handle
   *   ctx.logout()     — clear all auth state
   *   ctx.requireAuth(redirectUrl) — redirect to login if not authenticated
   *   ctx.refreshIfNeeded()       — refresh access token in background if expiring
   */
  function getLifeOSContext(options = {}) {
    const {
      promptForKey = false,
      defaultUser  = 'adam',
      keyPrompt    = 'Enter your command key:',
    } = options;

    const params = new URLSearchParams(location.search);

    // Legacy command key (still used by internal admin routes)
    let key = normalizeCommandKey(
      params.get('commandKey')
      || params.get('command_key')
      || params.get('key')
      || localStorage.getItem('commandKey')
      || localStorage.getItem('command_key')
      || localStorage.getItem('lifeos_key')
    );
    if (isPlaceholderKey(localStorage.getItem('commandKey'))) clearStoredKeys();
    const hasAccountSession = !!(getAccessToken() || getRefreshToken());
    // Never block the founder with window.prompt — account login is the auth path.
    if (!key && promptForKey && !hasAccountSession) {
      const onLoginPage = /lifeos-login\.html/i.test(String(location.pathname || ''));
      const inIframe = typeof window !== 'undefined' && window.parent !== window;
      if (!onLoginPage && !inIframe) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace(`/overlay/lifeos-login.html?next=${next}`);
      }
    }
    if (key) persistKey(key);

    // User handle — from JWT payload first, then URL param, then localStorage
    let token = getAccessToken();
    const tokenPayload = decodeToken(token);
    const userFromToken = tokenPayload?.handle || '';

    const user = normalizeUser(
      userFromToken
      || params.get('user')
      || params.get('handle')
      || localStorage.getItem('lifeos_user')
      || localStorage.getItem('lifeosUser'),
      defaultUser
    );
    persistUser(user);

    let tier = localStorage.getItem('lifeos_tier') || 'free';
    let role = localStorage.getItem('lifeos_role') || 'member';
    if (tokenPayload) {
      if (tokenPayload.tier) {
        tier = tokenPayload.tier;
        localStorage.setItem('lifeos_tier', tier);
      }
      if (tokenPayload.role) {
        role = tokenPayload.role;
        localStorage.setItem('lifeos_role', role);
      }
    }

    function syncTokenFromStorage() {
      const stored = getAccessToken();
      if (stored) token = stored;
      return token;
    }

    function headers(extra = {}) {
      syncTokenFromStorage();
      const h = { 'Content-Type': 'application/json', ...extra };
      // Send account JWT when present, but also keep the legacy operator key
      // available so the server can fall back if the JWT is stale or invalid.
      const access = getAccessToken() || token || '';
      if (access) {
        h['Authorization'] = `Bearer ${access}`;
      }
      if (key) {
        h['x-command-key'] = key;
      }
      return h;
    }

    async function refreshIfNeeded() {
      syncTokenFromStorage();
      if (token && isTokenValid(token)) return token;
      if (!getRefreshToken()) return getAccessToken() || '';
      const newToken = await attemptRefresh();
      if (newToken) { token = newToken; return token; }
      return getAccessToken() || '';
    }

    async function requireAuth(redirectUrl = '/overlay/lifeos-login.html') {
      await refreshIfNeeded();
      syncTokenFromStorage();
      if (getAccessToken() || getRefreshToken()) return true;
      const nextPath = location.pathname + location.search;
      try {
        const target = new URL(redirectUrl, location.origin);
        if (!target.searchParams.has('next')) target.searchParams.set('next', nextPath);
        location.href = `${target.pathname}${target.search}${target.hash}`;
      } catch {
        const hasNext = /(?:[?&])next=/.test(String(redirectUrl || ''));
        if (hasNext) {
          location.href = redirectUrl;
        } else {
          const separator = String(redirectUrl || '').includes('?') ? '&' : '?';
          location.href = `${redirectUrl}${separator}next=${encodeURIComponent(nextPath)}`;
        }
      }
      return false;
    }

    async function fetchWithAuth(url, options = {}) {
      await refreshIfNeeded();
      syncTokenFromStorage();
      const opts = {
        credentials: 'same-origin',
        ...options,
        headers: headers(options.headers || {}),
      };
      let res = await fetch(url, opts);
      if (res.status === 401) {
        // A stale JWT can override the command key in the client's headers.
        // If we have a command key, retry with only the command key and drop
        // the bad bearer token so the server can authenticate the request.
        if (key) {
          const fallback = { 'Content-Type': 'application/json', ...(options.headers || {}), 'x-command-key': key };
          delete fallback.Authorization;
          opts.headers = fallback;
          res = await fetch(url, opts);
        } else if (getRefreshToken()) {
          const renewed = await attemptRefresh();
          if (renewed) {
            token = renewed;
            opts.headers = headers(options.headers || {});
            res = await fetch(url, opts);
          }
        }
      }
      return res;
    }

    function startSessionKeepAlive() {
      if (window.__lifeosSessionKeepAliveStarted) return;
      window.__lifeosSessionKeepAliveStarted = true;
      const tick = () => {
        if (tokenNeedsRefresh(token) || !token) attemptRefresh().then((t) => { if (t) token = t; });
      };
      tick();
      window.__lifeosSessionKeepAliveTimer = setInterval(tick, 10 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tick();
      });
    }

    function logout() {
      const refresh = getRefreshToken();
      // Best-effort server-side revocation
      if (refresh) {
        fetch('/api/v1/lifeos/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        }).catch(() => {});
      }
      clearTokens();
      localStorage.removeItem('commandKey');
      localStorage.removeItem('command_key');
      localStorage.removeItem('lifeos_key');
      localStorage.removeItem('lifeos_user');
      localStorage.removeItem('lifeosUser');
      localStorage.removeItem('lifeos_name');
      localStorage.removeItem('lifeos_tier');
      localStorage.removeItem('lifeos_role');
      location.href = '/overlay/lifeos-login.html';
    }

    return {
      API: '',
      KEY: key,
      USER: user,
      TOKEN: token,
      authenticated: !!(token && isTokenValid(token)),
      tier,
      role,
      params,
      headers,
      refreshIfNeeded,
      requireAuth,
      fetchWithAuth,
      startSessionKeepAlive,
      logout,
      setKey(nextKey) {
        key = persistKey(nextKey);
        return key;
      },
      setUser(nextUser) {
        const resolved = normalizeUser(nextUser, defaultUser);
        persistUser(resolved);
        return resolved;
      },
      storeTokens,
    };
  }

  window.LifeOSBootstrap = {
    getLifeOSContext,
    storeTokens,
    clearTokens,
    attemptRefresh,
    isPlaceholderKey,
    normalizeCommandKey,
    clearStoredKeys,
    normalizeKey,
    startSessionKeepAlive(ctx) {
      if (ctx && typeof ctx.startSessionKeepAlive === 'function') ctx.startSessionKeepAlive();
    },
  };

  // ── Shell keyboard bridge (iframe → parent lifeos-app) ───────────────────────
  // Cmd/Ctrl+L does not bubble from a child document to the parent. When an overlay
  // loads inside `#content-frame`, forward the chord to the shell so Lumin opens.
  // lifeos-chat.html keeps its own Cmd+L (focus chat input) — do not steal it here.
  if (window.parent !== window) {
    window.addEventListener(
      'keydown',
      (e) => {
        try {
          const path = (window.location.pathname || '').toLowerCase();
          if (path.includes('lifeos-chat.html')) return;
          const isMac = typeof navigator !== 'undefined'
            && navigator.platform
            && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const mod = isMac ? e.metaKey : e.ctrlKey;
          if (!mod || String(e.key).toLowerCase() !== 'l') return;
          const t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
          e.preventDefault();
          window.parent.postMessage(
            { type: 'lifeos-shell', action: 'open-lumin-drawer', source: 'lifeos-bootstrap' },
            window.location.origin,
          );
        } catch {
          /* ignore */
        }
      },
      true,
    );
  }
})();
