/**
 * SYNOPSIS: In-memory poll/post bridge that lets the generic browser-agent loop
 * (services/general-browser-agent.js) drive Adam's REAL browser through the
 * Universal Overlay extension instead of a server-side headless Puppeteer
 * session. The extension's frame.js polls for the next pending request and
 * posts back what happened; this module turns that request/response cycle
 * into the observe()/act()/verifyGoal() functions runBrowserGoal expects.
 * Single-process, in-memory by design -- one founder driving one browser tab
 * at a time, not a distributed job queue.
 *
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import driveSensitiveContentFilter from './drive-sensitive-content-filter.js';

const sessions = new Map();

export function createDriveSession(sessionId, meta = {}) {
  sessions.set(sessionId, {
    status: 'idle',
    meta,
    pendingRequest: null,
    resolve: null,
    createdAt: Date.now(),
  });
  return sessionId;
}

export function getSessionState(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  return { status: s.status, meta: s.meta, hasPending: !!s.pendingRequest };
}

export function stopDriveSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  s.status = 'stopped';
  if (s.resolve) {
    const resolve = s.resolve;
    s.pendingRequest = null;
    s.resolve = null;
    resolve(null);
  }
  return true;
}

export function peekPendingRequest(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return { error: 'unknown_session' };
  if (s.status === 'stopped') return { error: 'session_stopped' };
  return { pending: s.pendingRequest || null };
}

export function resolvePendingRequest(sessionId, payload) {
  const s = sessions.get(sessionId);
  if (!s || !s.resolve) return false;
  const resolve = s.resolve;
  s.pendingRequest = null;
  s.resolve = null;
  resolve(payload);
  return true;
}

function waitForFrame(sessionId, request, timeoutMs = 45000) {
  const s = sessions.get(sessionId);
  if (!s) return Promise.reject(new Error('unknown_session'));
  if (s.status === 'stopped') return Promise.reject(new Error('session_stopped'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (s.resolve === settle) {
        s.pendingRequest = null;
        s.resolve = null;
      }
      reject(new Error('frame_timeout'));
    }, timeoutMs);
    const settle = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    s.pendingRequest = request;
    s.resolve = settle;
    s.status = 'running';
  });
}

/**
 * Adapt content.js's page-read shape ({ url, title, bodyText, fields[], clickables[] })
 * into the { url, title, text, elements[] } shape formatObservation expects.
 */
function toObservation(payload) {
  const fields = Array.isArray(payload?.fields) ? payload.fields : [];
  const clickables = Array.isArray(payload?.clickables) ? payload.clickables : [];
  const elements = [
    ...fields.map((f) => ({
      tag: (f.type || 'input').toLowerCase(),
      type: f.type || '',
      name: f.name || '',
      id: f.id || '',
      text: (f.label || f.placeholder || '').slice(0, 80),
      selector: f.selector || '',
    })),
    ...clickables.map((c) => ({
      tag: (c.tag || 'button').toLowerCase(),
      type: '',
      name: '',
      id: '',
      text: (c.text || '').slice(0, 80),
      selector: c.selector || '',
    })),
  ].slice(0, 40);

  // Redact at the single real capture point: every downstream consumer
  // (the AI model prompt, the steps log, the drive UI) only ever sees the
  // redacted version, never the original -- founder requirement (2026-08-10):
  // sensitive content is never seen or recorded, not just hidden in the UI.
  return driveSensitiveContentFilter.redactObservation({
    url: payload?.url || '',
    title: payload?.title || '',
    text: (payload?.bodyText || '').slice(0, 4000),
    elements,
  });
}

export function makeExtensionObserve(sessionId) {
  return async function observe() {
    const payload = await waitForFrame(sessionId, { type: 'observe' });
    return toObservation(payload || {});
  };
}

export function makeExtensionAct(sessionId) {
  return async function act(action) {
    const result = await waitForFrame(sessionId, { type: 'act', action });
    if (!result) return { ok: false, error: 'no_result' };
    return result;
  };
}

/**
 * Goal verification is Adam's own real confirmation -- he is watching his own
 * tab -- never a self-reported model claim. Matches the Chair's original
 * non-negotiable guardrail on this engine.
 */
export function makeExtensionVerify(sessionId) {
  return async function verifyGoal({ goal, observation }) {
    const result = await waitForFrame(sessionId, {
      type: 'confirm_done',
      goal,
      observation_summary: { url: observation?.url || '', title: observation?.title || '' },
    });
    const reached = !!(result && result.confirmed === true);
    return { reached, evidence: { founder_confirmed: reached, url: observation?.url || '' } };
  };
}

export default {
  createDriveSession,
  getSessionState,
  stopDriveSession,
  peekPendingRequest,
  resolvePendingRequest,
  makeExtensionObserve,
  makeExtensionAct,
  makeExtensionVerify,
};
