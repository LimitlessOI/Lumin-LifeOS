/**
 * lifeos-ambient-sense.js — Opt-in, low-power environment hints for LifeOS
 *
 * Collects coarse, privacy-preserving device context (battery %, charging,
 * connection type, tab visibility). No microphone, no camera, no GPS.
 * Uploads at a long interval while the app is visible; backs off when hidden
 * or on battery. User enables via Settings (localStorage lifeos_ambient_sense=1).
 *
 * API: POST /api/v1/lifeos/ambient/snapshot { user, signals }
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function () {
  'use strict';

  const LS_KEY = 'lifeos_ambient_sense';
  const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 min when visible
  const MIN_INTERVAL_BATTERY_MS = 20 * 60 * 1000; // 20 min on battery, unplugged

  const state = {
    timer: null,
    lastSent: 0,
    getCtx: null,
    userHandle: 'adam',
    battery: null,
    batteryListener: null,
    wired: false,
  };

  function enabled() {
    return localStorage.getItem(LS_KEY) === '1';
  }

  function setEnabled(on) {
    if (on) localStorage.setItem(LS_KEY, '1');
    else localStorage.removeItem(LS_KEY);
    stop();
    if (on) start(state._lastOpts || {});
  }

  async function collectSignals() {
    const nav = navigator;
    const signals = {
      schema: 'lifeos_ambient_v1',
      visibility: document.visibilityState,
      tz_offset_min: new Date().getTimezoneOffset(),
      standalone: !!(nav.standalone || window.matchMedia('(display-mode: standalone)').matches),
      reduced_motion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
    try {
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      if (conn) {
        signals.network_type = conn.effectiveType || conn.type || null;
        signals.save_data = !!conn.saveData;
      }
    } catch { /* ignore */ }

    if (state.battery) {
      signals.battery_level = typeof state.battery.level === 'number' ? Math.round(state.battery.level * 100) : null;
      signals.battery_charging = !!state.battery.charging;
    }

    return signals;
  }

  async function flush() {
    if (!enabled() || !state.getCtx) return;
    const ctx = state.getCtx();
    if (!ctx || typeof ctx.headers !== 'function') return;
    try {
      if (ctx.refreshIfNeeded) await ctx.refreshIfNeeded();
      const signals = await collectSignals();
      const r = await fetch('/api/v1/lifeos/ambient/snapshot', {
        method: 'POST',
        headers: ctx.headers(),
        body: JSON.stringify({ user: state.userHandle, signals }),
      });
      if (!r.ok) return;
      state.lastSent = Date.now();
    } catch { /* offline / 401 — silent */ }
  }

  function nextDelayMs() {
    if (document.hidden) return MIN_INTERVAL_MS * 3;
    let base = MIN_INTERVAL_MS;
    if (state.battery && !state.battery.charging && state.battery.level < 0.25) {
      base = MIN_INTERVAL_BATTERY_MS * 2;
    } else if (state.battery && !state.battery.charging) {
      base = MIN_INTERVAL_BATTERY_MS;
    }
    return base;
  }

  function schedule() {
    clearTimeout(state.timer);
    state.timer = setTimeout(async () => {
      if (!enabled()) return;
      if (!document.hidden) await flush();
      schedule();
    }, nextDelayMs());
  }

  function onVisibility() {
    if (document.hidden) return;
    if (!enabled()) return;
    const since = Date.now() - state.lastSent;
    if (since > MIN_INTERVAL_MS * 0.9) flush();
  }

  function onPageHide() {
    if (!enabled()) return;
    if (Date.now() - state.lastSent < 60_000) return;
    flush();
  }

  function wireBattery() {
    if (!navigator.getBattery || state.batteryListener) return;
    navigator.getBattery().then((b) => {
      state.battery = b;
      function onBatt() { /* state.battery read in collectSignals */ }
      b.addEventListener('levelchange', onBatt);
      b.addEventListener('chargingchange', onBatt);
      state.batteryListener = { b, onBatt };
    }).catch(() => {});
  }

  /**
   * @param {{ getCtx: function, userHandle?: string }} opts
   */
  function start(opts) {
    state._lastOpts = opts;
    state.getCtx = opts.getCtx;
    state.userHandle = opts.userHandle || 'adam';
    if (!enabled()) return;
    if (!state.wired) {
      wireBattery();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onPageHide);
      state.wired = true;
    }
    if (!state.timer) {
      flush().finally(schedule);
    } else {
      schedule();
    }
  }

  function stop() {
    clearTimeout(state.timer);
    state.timer = null;
    state.wired = false;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    if (state.batteryListener) {
      try {
        state.batteryListener.b.removeEventListener('levelchange', state.batteryListener.onBatt);
        state.batteryListener.b.removeEventListener('chargingchange', state.batteryListener.onBatt);
      } catch { /* ignore */ }
      state.batteryListener = null;
    }
    state.battery = null;
  }

  window.LifeOSAmbientSense = { start, stop, setEnabled, enabled, collectSignals };
})();
