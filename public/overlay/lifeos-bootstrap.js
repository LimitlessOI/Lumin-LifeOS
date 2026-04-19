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

  /** Decode the JWT payload (no verification — that happens server-side). */
  function decodeToken(token) {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
  }

  /** True if token exists and is not expired (with 60s buffer). */
  function isTokenValid(token) {
    const p = decodeToken(token);
    return p && p.exp && (p.exp - 60_000) > Date.now();
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
  function normalizeKey(raw)  { return String(raw || '').trim(); }
  function normalizeUser(raw, fallback = 'adam') { return String(raw || '').trim() || fallback; }

  function persistKey(key) {
    if (!key) return;
    localStorage.setItem('commandKey',   key);
    localStorage.setItem('command_key',  key);
    localStorage.setItem('lifeos_key',   key);
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
    let key = normalizeKey(
      params.get('commandKey')
      || params.get('command_key')
      || params.get('key')
      || localStorage.getItem('commandKey')
      || localStorage.getItem('command_key')
      || localStorage.getItem('lifeos_key')
    );
    if (!key && promptForKey) key = normalizeKey(window.prompt(keyPrompt) || '');
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

    const tier = localStorage.getItem('lifeos_tier') || 'free';
    const role = localStorage.getItem('lifeos_role') || 'member';

    function headers(extra = {}) {
      const h = { 'Content-Type': 'application/json', ...extra };
      // Prefer JWT auth; fall back to legacy key for internal routes
      if (token) {
        h['Authorization'] = `Bearer ${token}`;
      } else if (key) {
        h['x-command-key'] = key;
      }
      return h;
    }

    async function refreshIfNeeded() {
      if (token && isTokenValid(token)) return token;
      const newToken = await attemptRefresh();
      if (newToken) { token = newToken; return token; }
      return '';
    }

    function requireAuth(redirectUrl = '/overlay/lifeos-login.html') {
      if (!token || !isTokenValid(token)) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = `${redirectUrl}?next=${next}`;
        return false;
      }
      return true;
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
      logout,
      setKey(nextKey) {
        key = normalizeKey(nextKey);
        if (key) persistKey(key);
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

  window.LifeOSBootstrap = { getLifeOSContext, storeTokens, clearTokens, attemptRefresh };
})();
