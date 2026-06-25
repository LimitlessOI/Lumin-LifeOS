/**
 * SYNOPSIS: Listening orchestrator — profile sync, schedule, family guard, ambient, vault, mediation offer.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function (global) {
  const LS_PROFILE = 'lifeos_listening_profile_cache_v1';
  const LS_MASTER = 'lifeos_listening_master_v1';

  const state = {
    profile: null,
    master: false,
    tickTimer: null,
    clipRecorder: null,
    onProfileChange: null,
    onToast: null,
    getCtx: null,
  };

  function toast(msg, kind) {
    if (typeof state.onToast === 'function') {
      try { state.onToast(msg, kind); } catch (_) {}
    }
  }

  async function apiFetch(path, options = {}) {
    const ctx = state.getCtx?.() || global.LifeOSBootstrap?.getLifeOSContext?.({ promptForKey: false });
    const payload = {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };
    if (ctx?.fetchWithAuth) return ctx.fetchWithAuth(`/api/v1/lifeos/listening${path}`, payload);
    if (ctx?.headers) payload.headers = ctx.headers(payload.headers);
    return fetch(`/api/v1/lifeos/listening${path}`, payload);
  }

  function cacheLocal(data) {
    if (!data?.profile) return;
    state.profile = data.profile;
    state.master = Boolean(data.master_enabled);
    try {
      global.localStorage?.setItem(LS_PROFILE, JSON.stringify(data.profile));
      global.localStorage?.setItem(LS_MASTER, state.master ? '1' : '0');
    } catch (_) {}
    notify();
  }

  function loadLocal() {
    try {
      const raw = global.localStorage?.getItem(LS_PROFILE);
      if (raw) state.profile = JSON.parse(raw);
      state.master = global.localStorage?.getItem(LS_MASTER) === '1';
    } catch (_) {}
  }

  function notify() {
    if (typeof state.onProfileChange === 'function') {
      try { state.onProfileChange(getStatus()); } catch (_) {}
    }
  }

  function parseTimeHHMM(str) {
    const m = String(str || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function minutesNow() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function inScheduleWindow() {
    const p = state.profile;
    if (!p?.schedule?.enabled) return true;
    const start = parseTimeHHMM(p.schedule.start);
    const end = parseTimeHHMM(p.schedule.end);
    if (start == null || end == null) return true;
    const now = minutesNow();
    if (start <= end) return now >= start && now < end;
    return now >= start || now < end;
  }

  function inEveningConflictWindow() {
    const p = state.profile;
    if (!p?.evening_conflict_only?.enabled) return false;
    const after = parseTimeHHMM(p.evening_conflict_only.after);
    if (after == null) return false;
    return minutesNow() >= after;
  }

  function shouldActivateFamilyGuard() {
    if (!state.master || !state.profile) return false;
    const mode = state.profile.mode;
    if (mode === 'off') return false;
    if (mode === 'wake_word') return false;
    if (mode === 'scheduled' && !inScheduleWindow()) return false;
    if (mode === 'conflict_only' && !inEveningConflictWindow()) return false;
    return Boolean(state.profile.family_guard?.vibrate_on_yell || state.profile.family_guard?.vibrate_on_snippy);
  }

  function shouldActivateAmbient() {
    if (!state.master || !state.profile) return false;
    if (state.profile.mode !== 'ambient_full') return false;
    if (state.profile.schedule?.enabled && !inScheduleWindow()) return false;
    return Boolean(state.profile.capture?.transcripts_to_server);
  }

  function shouldCaptureConflictClip() {
    const c = state.profile?.capture;
    return Boolean(state.master && c?.audio_clips_local && c?.conflict_clips);
  }

  async function fetchProfile() {
    try {
      const res = await apiFetch('/profile');
      const data = await res.json();
      if (data.ok) cacheLocal(data);
      return data;
    } catch (err) {
      loadLocal();
      return { ok: false, error: err.message, profile: state.profile };
    }
  }

  async function applyProfile(patch, opts = {}) {
    const res = await apiFetch('/onboarding/apply', {
      method: 'POST',
      body: JSON.stringify({
        profile: patch,
        onboarding_done: opts.onboarding_done !== false,
      }),
    });
    const data = await res.json();
    if (data.ok) cacheLocal(data);
    await syncSubsystems();
    return data;
  }

  async function setMaster(on) {
    const res = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({ master_enabled: !!on }),
    });
    const data = await res.json();
    if (data.ok) cacheLocal(data);
    await syncSubsystems();
    return data;
  }

  async function postCrisisSignal(kind, extra = {}) {
    const ctx = state.getCtx?.() || global.LifeOSBootstrap?.getLifeOSContext?.({ promptForKey: false });
    const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    const payload = {
      method: 'POST',
      credentials: 'same-origin',
      headers: ctx?.headers ? ctx.headers(headers) : headers,
      body: JSON.stringify({
        user: ctx?.USER || global.localStorage?.getItem('lifeos_user') || 'adam',
        kind,
        metadata: { ...extra, client: 'lifeos-listening-orchestrator' },
      }),
    };
    const url = '/api/v1/lifeos/ambient/crisis-signal';
    try {
      if (ctx?.fetchWithAuth) await ctx.fetchWithAuth(url, payload);
      else await fetch(url, payload);
    } catch (_) {}
  }

  function offerMediationIfEnabled(reason) {
    const fg = state.profile?.family_guard;
    if (!fg?.offer_mediation) return;
    const msg = 'Want Lumin to help mediate this? Tap to open mediation.';
    toast(msg, 'mediation');
    if (fg.speak_mediation_offer && global.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(
          'Hey — I noticed things are heated. Would you both be open to me helping open the escalator and get everyone to a better place? Say yes if you consent.'
        );
        u.rate = 0.92;
        global.speechSynthesis.speak(u);
      } catch (_) {}
    }
    global.dispatchEvent(new CustomEvent('lifeos-mediation-offer', { detail: { reason } }));
  }

  function hookFamilyGuardEvents() {
    global.addEventListener('lifeos-family-guard-yelling-start', () => {
      postCrisisSignal('yelling_start', { mediation_offer: Boolean(state.profile?.family_guard?.offer_mediation) });
      if (shouldCaptureConflictClip() && state.clipRecorder) {
        state.clipRecorder.start('conflict', 'Conflict moment');
      }
      if (state.profile?.family_guard?.offer_mediation) {
        offerMediationIfEnabled('yelling');
      }
    });
    global.addEventListener('lifeos-family-guard-yelling-end', () => {
      state.clipRecorder?.stopEarly?.();
    });
    global.addEventListener('lifeos-family-guard-snippy', () => {
      postCrisisSignal('snippy_tone', { mediation_offer: Boolean(state.profile?.family_guard?.offer_mediation) });
      if (state.profile?.family_guard?.offer_mediation) {
        offerMediationIfEnabled('snippy');
      }
    });
  }

  async function syncSubsystems() {
    const fg = global.LifeOSFamilyToneGuard;
    const amb = global.LifeOSAmbientSense;
    const ambListen = global.LifeOSAmbientListener;

    const wantGuard = shouldActivateFamilyGuard();
    if (fg) {
      if (wantGuard && !fg.isEnabled()) {
        if (fg.hasConsent?.()) fg.setEnabled(true);
        else await fg.toggle();
      } else if (!wantGuard && fg.isEnabled()) {
        fg.setEnabled(false);
      }
    }

    if (ambListen && state.profile?.mode === 'ambient_full') {
      const wantAmb = shouldActivateAmbient();
      if (wantAmb && !ambListen.isEnabled?.()) await ambListen.enable?.();
      if (!wantAmb && ambListen.isEnabled?.()) ambListen.disable?.();
    }

    if (global.LuminVoice && state.profile?.mode === 'wake_word' && state.master) {
      if (!global.LuminVoice.isAlwaysOn?.()) {
        global.LuminVoice.toggleWakeWordListen({
          wakeWordMode: true,
          onTranscript: (text, meta) => {
            global.dispatchEvent(new CustomEvent('lifeos-lumen-wake', { detail: { text, meta } }));
          },
        });
      }
    } else if (global.LuminVoice?.isAlwaysOn?.()) {
      global.LuminVoice.toggleWakeWordListen({});
    }

    notify();
  }

  function startScheduleTick() {
    clearInterval(state.tickTimer);
    state.tickTimer = global.setInterval(() => syncSubsystems(), 60000);
  }

  function getStatus() {
    return {
      master: state.master,
      profile: state.profile,
      active: {
        family_guard: shouldActivateFamilyGuard(),
        ambient: shouldActivateAmbient(),
        in_schedule: inScheduleWindow(),
        evening_conflict: inEveningConflictWindow(),
      },
    };
  }

  async function init(opts = {}) {
    state.getCtx = opts.getCtx || null;
    state.onProfileChange = opts.onProfileChange || null;
    state.onToast = opts.onToast || null;
    loadLocal();
    hookFamilyGuardEvents();
    await fetchProfile();
    await syncSubsystems();
    startScheduleTick();
    notify();
  }

  async function captureWinMoment(label) {
    const c = state.profile?.capture;
    if (!state.master || !c?.win_clips || !c?.audio_clips_local) return { ok: false, error: 'win capture not enabled' };
    if (!global.navigator?.mediaDevices?.getUserMedia) return { ok: false, error: 'no mic' };
    try {
      const stream = await global.navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const rec = global.LifeOSLocalVault?.createClipRecorder(stream, {
        maxMs: 90000,
        onSaved: () => toast('Win moment saved on this device', 'win'),
      });
      rec?.start('win', label || 'Win moment');
      global.setTimeout(() => {
        rec?.stopEarly?.();
        stream.getTracks().forEach((t) => t.stop());
      }, 90000);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  global.LifeOSListeningOrchestrator = {
    init,
    fetchProfile,
    applyProfile,
    setMaster,
    getStatus,
    syncSubsystems,
    shouldCaptureConflictClip,
    captureWinMoment,
  };
})(typeof window !== 'undefined' ? window : globalThis);
