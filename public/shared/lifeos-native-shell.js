/**
 * SYNOPSIS: Native Universal Overlay shell — Capacitor bridge; same platform as lifeos-app + extension overlay.
 * @ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
 */
(function (global) {
  const PARAM_NATIVE = 'native';
  const LS_NATIVE_FLAG = 'lifeos_native_shell_v1';

  const state = {
    isNative: false,
    isCapacitor: false,
    platform: 'web',
    shellConfig: null,
    appPlugin: null,
    ready: false,
  };

  function detectCapacitor() {
    return Boolean(global.Capacitor?.isNativePlatform?.());
  }

  function detectNativeParam() {
    try {
      return new URLSearchParams(global.location?.search || '').get(PARAM_NATIVE) === '1';
    } catch {
      return false;
    }
  }

  /** iPhone/iPad Add to Home Screen — treat like native shell (no Capacitor). */
  function detectPwaStandalone() {
    try {
      if (global.navigator?.standalone === true) return true;
      return global.matchMedia?.('(display-mode: standalone)')?.matches === true;
    } catch {
      return false;
    }
  }

  function markNative() {
    state.isNative = true;
    try {
      global.localStorage?.setItem(LS_NATIVE_FLAG, '1');
      document.documentElement?.setAttribute('data-lifeos-native', '1');
      document.body?.classList?.add('lifeos-native-universal-shell');
    } catch (_) {}
  }

  async function loadShellConfig() {
    try {
      const res = await fetch('/api/v1/extension/shell', { credentials: 'same-origin' });
      if (res.ok) {
        state.shellConfig = await res.json();
        return state.shellConfig;
      }
    } catch (_) {}
    state.shellConfig = {
      ok: true,
      role: 'universal_overlay_platform',
      canonical_shell: '/lifeos',
      native_entry: '/lifeos?native=1&layout=mobile&direct_system=1',
    };
    return state.shellConfig;
  }

  async function initCapacitorPlugins() {
    if (!detectCapacitor()) return;
    state.isCapacitor = true;
    state.platform = global.Capacitor.getPlatform?.() || 'native';
    markNative();

    const App = global.Capacitor?.Plugins?.App;
    if (App) {
      state.appPlugin = App;
      try {
        await App.addListener('appStateChange', ({ isActive }) => {
          global.dispatchEvent(new CustomEvent('lifeos-app-state', { detail: { isActive } }));
          if (isActive && global.LifeOSListeningOrchestrator) {
            LifeOSListeningOrchestrator.syncSubsystems?.();
          }
        });
        await App.addListener('appUrlOpen', ({ url }) => {
          global.dispatchEvent(new CustomEvent('lifeos-deep-link', { detail: { url } }));
          routeDeepLink(url);
        });
      } catch (_) {}
    }

    const SplashScreen = global.Capacitor?.Plugins?.SplashScreen;
    if (SplashScreen?.hide) {
      try { await SplashScreen.hide(); } catch (_) {}
    }
  }

  function routeDeepLink(url) {
    if (!url) return;
    try {
      const u = new URL(url);
      const path = u.pathname + u.search;
      if (path.includes('lifeos') || path.includes('/overlay/')) {
        global.location.href = path;
        return;
      }
      const page = u.searchParams.get('page');
      if (page) {
        global.location.href = `/lifeos?native=1&direct_system=1&page=${encodeURIComponent(page)}`;
      }
    } catch (_) {}
  }

  function openStack(stackId) {
    const stacks = state.shellConfig?.stacks || [];
    const stack = stacks.find((s) => s.stack_id === stackId);
    if (stack?.shell_entry) {
      global.location.href = stack.shell_entry + (stack.shell_entry.includes('?') ? '&' : '?') + 'native=1';
      return true;
    }
    if (stack?.stack_page) {
      global.loadPage?.(stack.stack_page.replace(/^.*\//, ''), stack.label || stackId);
      return true;
    }
    return false;
  }

  function getEntryUrl(baseUrl) {
    const base = String(baseUrl || global.location?.origin || '').replace(/\/$/, '');
    return `${base}/lifeos?native=1&layout=mobile&direct_system=1`;
  }

  async function init(opts = {}) {
    if (
      detectCapacitor()
      || detectNativeParam()
      || detectPwaStandalone()
      || global.localStorage?.getItem(LS_NATIVE_FLAG) === '1'
    ) {
      markNative();
      if (detectPwaStandalone()) {
        state.platform = 'ios-pwa';
        try {
          document.documentElement?.setAttribute('data-lifeos-pwa', '1');
        } catch (_) {}
      }
    }
    await loadShellConfig();
    await initCapacitorPlugins();
    state.ready = true;
    global.dispatchEvent(new CustomEvent('lifeos-native-shell-ready', { detail: getPublicState() }));
    if (typeof opts.onReady === 'function') opts.onReady(getPublicState());
    return getPublicState();
  }

  function getPublicState() {
    return {
      ready: state.ready,
      isNative: state.isNative,
      isCapacitor: state.isCapacitor,
      platform: state.platform,
      role: 'universal_overlay_platform',
      shellConfig: state.shellConfig,
      openStack,
      getEntryUrl,
    };
  }

  global.LifeOSNativeShell = {
    init,
    getState: getPublicState,
    openStack,
    isNative: () => state.isNative,
    isCapacitor: () => state.isCapacitor,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
