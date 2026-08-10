/**
 * SYNOPSIS: Native Universal Overlay shell — Capacitor bridge; same platform as lifeos-app + extension overlay.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
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

  /**
   * Android-only driving bridge (LifeosAccessibilityService). This is the
   * Android equivalent of the desktop overlay's AXUIElement driving: reads
   * and drives the foreground app's real UI tree, not screen-coordinate taps.
   * No-op on iOS/web -- iOS has no comparable API and this stays unused there.
   */
  const ACCESSIBILITY_STEPS = [
    'Tap "Enable" below -- this opens Android Settings > Accessibility.',
    'Find "LifeOS Driving Assistant" in the list (may be under "Downloaded apps" or "Installed apps").',
    'Tap it, then toggle it ON.',
    'Confirm "Allow" on the warning dialog Android shows.',
    'Return to LifeOS -- it will detect the permission automatically.',
  ];

  function getAccessibilityPlugin() {
    return global.Capacitor?.Plugins?.LifeosAccessibility || null;
  }

  async function accessibilityIsEnabled() {
    const plugin = getAccessibilityPlugin();
    if (!plugin) return false;
    try {
      const res = await plugin.isEnabled();
      return Boolean(res?.enabled);
    } catch (_) {
      return false;
    }
  }

  async function accessibilityRequestEnable() {
    const plugin = getAccessibilityPlugin();
    if (!plugin) return { ok: false, reason: 'not_available', steps: [] };
    try {
      await plugin.openAccessibilitySettings();
      return { ok: true, steps: ACCESSIBILITY_STEPS };
    } catch (e) {
      return { ok: false, reason: String(e?.message || e), steps: ACCESSIBILITY_STEPS };
    }
  }

  global.LifeOSAccessibilityDriver = {
    isAvailable: () => Boolean(getAccessibilityPlugin()),
    isEnabled: accessibilityIsEnabled,
    requestEnable: accessibilityRequestEnable,
    steps: ACCESSIBILITY_STEPS,
    clickByText: async (text, exact = false) => {
      const plugin = getAccessibilityPlugin();
      if (!plugin) return { ok: false, reason: 'not_available' };
      return plugin.clickByText({ text, exact });
    },
    setTextByLabel: async (label, value) => {
      const plugin = getAccessibilityPlugin();
      if (!plugin) return { ok: false, reason: 'not_available' };
      return plugin.setTextByLabel({ label, value });
    },
    dumpVisibleText: async () => {
      const plugin = getAccessibilityPlugin();
      if (!plugin) return { ok: false, reason: 'not_available' };
      return plugin.dumpVisibleText();
    },
  };

  /**
   * Confirms it's really the founder before the AI acts -- wraps Android's
   * real BiometricPrompt (fingerprint/face + PIN/pattern/password fallback,
   * unified by the OS, not three separate systems). Requires the device to
   * have a screen-lock credential set (an Android platform requirement for
   * enrolling any biometric).
   */
  function getBiometricPlugin() {
    return global.Capacitor?.Plugins?.LifeosBiometricGate || null;
  }

  global.LifeOSBiometricGate = {
    isAvailable: async () => {
      const plugin = getBiometricPlugin();
      if (!plugin) return { available: false, status: 'not_available' };
      try {
        return await plugin.isAvailable();
      } catch (e) {
        return { available: false, status: String(e?.message || e) };
      }
    },
    authenticate: async (reason) => {
      const plugin = getBiometricPlugin();
      if (!plugin) return { ok: false, error: 'not_available' };
      try {
        return await plugin.authenticate({ reason: reason || "Confirm it's you before LifeOS continues" });
      } catch (e) {
        return { ok: false, error: String(e?.message || e) };
      }
    },
  };

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
