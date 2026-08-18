/**
 * SYNOPSIS: TALOA-A2Z-001 -- converts a raw browser/UI snapshot (the shape
 * services/extension-drive-bridge.js already produces: {url,title,text,
 * elements[]}, optionally extended with dialogs[]/generating/composerHint)
 * into a structured scene the rest of the Overlay A-to-Z pipeline consumes.
 * Dependency-light by design: no network calls, no secrets, no randomness --
 * pure transformation over whatever snapshot it is handed.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

function safeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeControl(el) {
  return {
    tag: String(el?.tag || '').toLowerCase(),
    type: String(el?.type || ''),
    name: String(el?.name || ''),
    id: String(el?.id || ''),
    text: String(el?.text || '').slice(0, 120),
    selector: String(el?.selector || ''),
  };
}

// Composer = the primary text-entry control on the page. Prefer an explicit
// hint from the caller (extension can flag it directly); otherwise fall back
// to the most input/textarea-like control with a non-empty selector.
function findComposer(controls, composerHint) {
  if (composerHint) {
    const hinted = controls.find((c) => c.selector && c.selector === composerHint);
    if (hinted) return { present: true, selector: hinted.selector, text: hinted.text };
  }
  const candidate = controls.find(
    (c) => c.selector && (c.tag === 'textarea' || (c.tag === 'input' && /text|search/.test(c.type)) || c.type === 'contenteditable')
  );
  if (!candidate) return null;
  return { present: true, selector: candidate.selector, text: candidate.text };
}

function deriveActionable(controls, composer) {
  const actionable = [];
  if (composer) actionable.push({ kind: 'type', selector: composer.selector, label: 'composer' });
  for (const c of controls) {
    if (!c.selector) continue;
    if (c.tag === 'button' || c.type === 'submit' || /send|submit|continue|allow|confirm/i.test(c.text)) {
      actionable.push({ kind: 'click', selector: c.selector, label: c.text || c.tag });
    }
  }
  return actionable.slice(0, 20);
}

function computeConfidence({ url, controls, generating }) {
  let confidence = 0.3;
  if (url) confidence += 0.2;
  if (controls.length > 0) confidence += 0.3;
  if (!generating) confidence += 0.2;
  return Math.min(1, Number(confidence.toFixed(2)));
}

export function createOverlayObservationEngine() {
  function observe(snapshot = {}) {
    const controls = Array.isArray(snapshot.elements) ? snapshot.elements.map(normalizeControl) : [];
    const composer = findComposer(controls, snapshot.composerHint || null);
    const dialogs = Array.isArray(snapshot.dialogs) ? snapshot.dialogs : [];
    const permissionPrompts = dialogs.filter((d) => /allow|permission|access|connect/i.test(String(d?.title || d?.text || '')));
    const generating = Boolean(snapshot.generating);
    const actionable = deriveActionable(controls, composer);
    const url = String(snapshot.url || '');

    return {
      observed_at: new Date().toISOString(),
      evidence: { url, title: String(snapshot.title || ''), source: snapshot.source || 'extension_drive' },
      confidence: computeConfidence({ url, controls, generating }),
      page_identity: { url, title: String(snapshot.title || ''), host: safeHost(url) },
      controls,
      composer,
      dialogs,
      permission_prompts: permissionPrompts,
      generating,
      actionable,
    };
  }

  function classify(snapshot = {}) {
    const scene = observe(snapshot);
    if (scene.permission_prompts.length > 0) return 'permission_required';
    if (scene.generating) return 'generating';
    if (scene.composer) return 'idle_composer_ready';
    if (scene.actionable.length > 0) return 'idle_action_available';
    return 'unknown';
  }

  return { observe, classify };
}

export default { createOverlayObservationEngine };
