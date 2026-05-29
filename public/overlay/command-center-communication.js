/**
 * Command Center — Communication UX, proof guard UI, tooltips, voice prototype.
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
(function (global) {
  'use strict';

  const COMM_MODES = {
    quick_ask: {
      label: 'Quick Ask',
      placeholder: 'Short question — one clear answer…',
      frame: (t) => `QUICK ASK — answer in ≤8 sentences. If citing repo files or routes, only name paths that exist. State uncertainty plainly.\n\n${t}`,
    },
    brainstorm: {
      label: 'Brainstorming',
      placeholder: 'Explore options — no commitment yet…',
      frame: (t) => `BRAINSTORM — list 3–5 options with tradeoffs. Label speculative ideas. Do NOT invent file paths.\n\n${t}`,
    },
    step_build: {
      label: 'Step-by-step Build',
      placeholder: 'Describe what to build step by step…',
      frame: (t) => `STEP-BY-STEP BUILD — numbered steps, smallest safe diffs first. Cite only verified repo paths.\n\n${t}`,
    },
    audit: {
      label: 'Audit / Verify',
      placeholder: 'What should be verified against live system?…',
      frame: (t) => `AUDIT — verify against live endpoints and repo files only. Mark UNVERIFIED when proof missing.\n\n${t}`,
    },
    meeting: {
      label: 'Meeting Mode',
      placeholder: 'Agenda item or decision to discuss…',
      frame: (t) => `MEETING — structured: Context / Options / Recommendation / Decision needed from Adam.\n\n${t}`,
    },
    dictation: {
      label: 'Dictation / Voice',
      placeholder: 'Speak or type — say "send" to submit…',
      frame: (t) => `VOICE COMMAND — concise operator instruction. Confirm ambiguities.\n\n${t}`,
    },
  };

  const HELP = {
    'cc-mode': {
      short: 'How the council frames your message.',
      long: 'Modes change prompt structure and response format. Proof guard still applies — advisory answers stay UNVERIFIED.',
    },
    'cc-domain': {
      short: 'Domain prompt file from prompts/.',
      long: 'Loads prompts/{domain}.md into builder context. Source: GET /api/v1/lifeos/builder/domains',
    },
    'cc-ask': {
      short: 'Send to builder council (/task).',
      long: 'POST /api/v1/lifeos/builder/task — advisory unless a build commits. Every response shows evidence_status.',
    },
    'cc-voice-record': {
      short: 'Browser speech-to-text (Web Speech API).',
      long: 'Uses microphone when supported. Say "send" to submit. Does not upload audio to server.',
    },
    'cc-evidence': {
      short: 'Trust guard — VERIFIED vs UNVERIFIED.',
      long: 'Server checks cited repo paths on disk and records endpoints used. Never treats placeholder paths as real.',
    },
    'cc-snapshot': {
      short: 'Live system health tiles.',
      long: 'Aggregated from GET /api/v1/lifeos/command-center/* endpoints. Refresh updates counts — not proof memory.',
    },
    'cc-builder': {
      short: 'Builder mode, directed loop, recent jobs.',
      long: 'Data from builder readiness + supervisor state. Builds require governed loop when directed mode is on.',
    },
    'cc-queue': {
      short: 'Items needing Adam approval.',
      long: 'From pending_adam and governance queues. Approve/dismiss actions write receipts — not chat history.',
    },
  };

  let voiceRecognition = null;
  let voiceListening = false;
  let longPressTimer = null;
  let _inited = false;

  function getKey() {
    return global.KEY
      || localStorage.getItem('cc_key')
      || localStorage.getItem('lifeos_cmd_key')
      || '';
  }

  function headers() {
    return { 'Content-Type': 'application/json', 'x-command-key': getKey() };
  }

  async function ccFetch(url, opts = {}) {
    const r = await fetch(url, { headers: headers(), ...opts });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { _raw: text }; }
    return { ok: r.ok, status: r.status, data };
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderEvidence(ev) {
    if (!ev) return '';
    const statusClass = ev.evidence_status === 'VERIFIED' ? 'pill-success' : 'pill-warning';
    const files = (ev.files_checked || []).map((f) =>
      `<li>${f.exists ? '✓' : '✗'} <code>${escapeHtml(f.path)}</code></li>`).join('') || '<li>No file paths cited</li>';
    const routes = (ev.routes_checked || []).map((r) => `<li><code>${escapeHtml(r)}</code></li>`).join('') || '<li>None cited in text</li>';
    const endpoints = (ev.commands_or_endpoints_used || []).map((e) => `<li><code>${escapeHtml(e)}</code></li>`).join('') || '<li>None recorded</li>';
    const warns = (ev.warnings || []).map((w) => `<li>${escapeHtml(w)}</li>`).join('');
    return `
      <div class="cc-evidence-box" data-cc-help="cc-evidence">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span class="pill ${statusClass}">${escapeHtml(ev.evidence_status)}</span>
          ${ev.advisory_only ? '<span class="pill pill-muted">ADVISORY</span>' : ''}
          ${ev.committed ? '<span class="pill pill-success">COMMITTED</span>' : ''}
        </div>
        <div class="cc-evidence-grid">
          <div><strong>Endpoints used</strong><ul>${endpoints}</ul></div>
          <div><strong>Files checked</strong><ul>${files}</ul></div>
          <div><strong>Routes cited</strong><ul>${routes}</ul></div>
        </div>
        ${ev.commit_sha ? `<div style="font-size:10px;margin-top:6px">Commit: <code>${escapeHtml(String(ev.commit_sha).slice(0, 12))}</code></div>` : ''}
        ${ev.railway_sha ? `<div style="font-size:10px">Railway: <code>${escapeHtml(String(ev.railway_sha).slice(0, 12))}</code></div>` : ''}
        ${warns ? `<div style="margin-top:8px;font-size:11px;color:var(--warning)"><strong>Warnings</strong><ul>${warns}</ul></div>` : ''}
        <div style="font-size:10px;color:var(--text-muted);margin-top:6px">Not BuilderOS proof memory — communication history only.</div>
      </div>`;
  }

  async function fetchDeploySha() {
    const r = await ccFetch('/api/v1/lifeos/builder/ready');
    return r.data?.codegen?.deploy_commit_sha || null;
  }

  async function loadDomains() {
    const sel = document.getElementById('council-domain');
    if (!sel) return;
    const r = await ccFetch('/api/v1/lifeos/builder/domains');
    const domains = r.ok
      ? (Array.isArray(r.data) ? r.data : (r.data?.domains || []))
      : [];
    if (domains.length) {
      sel.innerHTML = domains.map((d) => {
        const name = typeof d === 'string' ? d : (d.name || d.path || d.file);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }).join('');
    } else {
      sel.innerHTML = '<option value="lifeos-core">lifeos-core (default)</option>';
    }
  }

  function getMode() {
    const el = document.getElementById('cc-comm-mode');
    return el?.value || 'quick_ask';
  }

  function frameMessage(text) {
    const mode = COMM_MODES[getMode()] || COMM_MODES.quick_ask;
    return mode.frame(text);
  }

  async function askCouncil() {
    const msgEl = document.getElementById('council-msg');
    const resp = document.getElementById('council-response');
    const domain = document.getElementById('council-domain')?.value || '';
    const raw = msgEl?.value?.trim() || '';
    if (!raw || !resp) return;

    const mode = getMode();
    const framed = frameMessage(raw);
    resp.style.display = 'block';
    resp.innerHTML = '<div class="cc-loading">Asking council…</div>';

    const endpointsUsed = ['POST /api/v1/lifeos/builder/task'];
    const deploySha = await fetchDeploySha();

    const taskR = await ccFetch('/api/v1/lifeos/builder/task', {
      method: 'POST',
      body: JSON.stringify({ task: framed, domain: domain || undefined, execution_only: true }),
    });

    const out = taskR.ok
      ? (taskR.data?.output || taskR.data?.result || JSON.stringify(taskR.data, null, 2))
      : (taskR.data?.error || JSON.stringify(taskR.data));

    const builderMeta = {
      model_used: taskR.data?.model_used,
      committed: taskR.data?.committed === true,
      commit_sha: taskR.data?.commit_sha || taskR.data?.sha,
      railway_sha: deploySha,
      advisory_only: taskR.data?.committed !== true,
      execution_only: true,
    };

    endpointsUsed.push('POST /api/v1/lifeos/command-center/communications/record');

    const rec = await ccFetch('/api/v1/lifeos/command-center/communications/record', {
      method: 'POST',
      body: JSON.stringify({
        speaker: 'adam',
        council_member: builderMeta.model_used || 'council',
        mode,
        domain,
        transcript: raw,
        response_text: String(out || ''),
        endpoints_used: endpointsUsed,
        builder_meta: builderMeta,
        deploy_sha: deploySha,
      }),
    });

    const ev = rec.data?.evidence || rec.data?.communication?.evidence_json;
    const member = builderMeta.model_used || 'council';

    if (!taskR.ok) {
      resp.innerHTML = `<span style="color:var(--error)">Error ${taskR.status}: ${escapeHtml(JSON.stringify(taskR.data))}</span>`;
      return;
    }

    resp.innerHTML = `
      <div class="cc-response-head">
        <strong style="color:var(--accent)">Council (${escapeHtml(member)})</strong>
        <span class="pill pill-accent" style="font-size:9px">${escapeHtml(COMM_MODES[mode]?.label || mode)}</span>
      </div>
      <div class="cc-response-body" id="cc-response-text">${escapeHtml(String(out)).replace(/\n/g, '<br>')}</div>
      ${renderEvidence(ev)}
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="btn btn-ghost btn-sm" id="cc-speak-response">Speak response</button>
      </div>`;

    document.getElementById('cc-speak-response')?.addEventListener('click', () => speakResponse(out));
    loadCommHistory();
  }

  async function loadCommHistory() {
    const el = document.getElementById('council-history');
    if (!el) return;
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted)">Loading communication history…</div>';
    const r = await ccFetch('/api/v1/lifeos/command-center/communications?limit=10');
    if (!r.ok) {
      el.innerHTML = `<div class="not-wired">NOT_WIRED<span>GET /communications returned ${r.status}</span></div>`;
      return;
    }
    const rows = r.data?.communications || [];
    if (!rows.length) {
      el.innerHTML = '<div class="empty-state">No communication history yet.</div>';
      return;
    }
    el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Communication history (not proof memory)</div>` +
      rows.map((h) => {
        const ev = h.evidence_json || {};
        const st = ev.evidence_status || 'UNVERIFIED';
        const pill = st === 'VERIFIED' ? 'pill-success' : 'pill-warning';
        return `<div class="history-row">
          <span class="pill ${pill}" style="font-size:9px">${escapeHtml(st)}</span>
          <span class="pill pill-muted" style="font-size:9px">${escapeHtml(h.mode || '')}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml((h.transcript || '').slice(0, 80))}</span>
          <span style="color:var(--text-muted);white-space:nowrap;font-size:10px">${h.created_at ? new Date(h.created_at).toLocaleString() : ''}</span>
        </div>`;
      }).join('');
  }

  async function loadBuildHistory() {
    const el = document.getElementById('cc-build-history');
    if (!el) return;
    const r = await ccFetch('/api/v1/lifeos/builder/history?limit=5');
    if (!r.ok || !r.data?.history) {
      el.innerHTML = '<div class="not-wired">Recent builds unavailable</div>';
      return;
    }
    const rows = r.data.history;
    if (!rows.length) { el.innerHTML = '<div class="empty-state">No recent builds.</div>'; return; }
    el.innerHTML = rows.map((h) => `
      <div class="history-row">
        <span class="pill ${h.committed ? 'pill-success' : 'pill-muted'}">${h.committed ? 'COMMITTED' : 'DRAFT'}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(h.task_preview || h.domain || '—')}</span>
        <span style="color:var(--text-muted);font-size:10px">${h.created_at ? new Date(h.created_at).toLocaleDateString() : ''}</span>
      </div>`).join('');
  }

  function speakResponse(text) {
    if (!('speechSynthesis' in global)) return;
    global.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).slice(0, 2000));
    u.rate = 0.95;
    global.speechSynthesis.speak(u);
  }

  function initVoice() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    const status = document.getElementById('cc-voice-status');
    const transcript = document.getElementById('cc-voice-transcript');
    const recordBtn = document.getElementById('cc-voice-record');
    const sendBtn = document.getElementById('cc-voice-send');
    const msg = document.getElementById('council-msg');

    if (!SR) {
      if (status) status.textContent = 'Voice not supported in this browser.';
      recordBtn?.setAttribute('disabled', 'true');
      return;
    }

    voiceRecognition = new SR();
    voiceRecognition.lang = 'en-US';
    voiceRecognition.interimResults = true;
    voiceRecognition.continuous = true;

    voiceRecognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const combined = (final + interim).trim();
      if (transcript) transcript.value = combined;
      if (msg && (final || interim)) msg.value = combined;
      if (/^\s*send[.!\s]*$/i.test(final.trim()) || /\bsend\b/i.test(final)) {
        stopVoice();
        askCouncil();
      }
    };

    voiceRecognition.onerror = (e) => {
      if (status && e.error !== 'no-speech') status.textContent = `Voice error: ${e.error}`;
    };

    voiceRecognition.onend = () => {
      if (voiceListening) {
        try { voiceRecognition.start(); } catch { voiceListening = false; }
      }
    };

    recordBtn?.addEventListener('click', () => {
      if (voiceListening) stopVoice();
      else startVoice();
    });

    sendBtn?.addEventListener('click', () => askCouncil());

    function startVoice() {
      voiceListening = true;
      if (status) status.textContent = 'Listening… (say "send" or tap Send)';
      recordBtn?.classList.add('cc-recording');
      try { voiceRecognition.start(); } catch (e) {
        voiceListening = false;
        if (status) status.textContent = `Could not start mic: ${e.message}`;
      }
    }

    function stopVoice() {
      voiceListening = false;
      recordBtn?.classList.remove('cc-recording');
      if (status) status.textContent = 'Voice idle';
      try { voiceRecognition.stop(); } catch { /* ignore */ }
    }
  }

  function showTooltip(el, helpKey, expanded) {
    let tip = document.getElementById('cc-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'cc-tooltip';
      tip.className = 'cc-tooltip';
      document.body.appendChild(tip);
    }
    const h = HELP[helpKey] || { short: helpKey, long: '' };
    tip.innerHTML = expanded && h.long
      ? `<div>${escapeHtml(h.short)}</div><div class="cc-tooltip-more">${escapeHtml(h.long)}</div>`
      : `<div>${escapeHtml(h.short)}</div>${h.long ? '<button type="button" class="cc-tooltip-more-btn">More</button>' : ''}`;
    tip.querySelector('.cc-tooltip-more-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showTooltip(el, helpKey, true);
    });
    const rect = el.getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`;
    tip.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  }

  function hideTooltip() {
    const tip = document.getElementById('cc-tooltip');
    if (tip) tip.style.display = 'none';
  }

  function initHelp() {
    document.querySelectorAll('[data-cc-help]').forEach((el) => {
      const key = el.getAttribute('data-cc-help');
      if (!el.querySelector('.cc-help-icon')) {
        const icon = document.createElement('span');
        icon.className = 'cc-help-icon';
        icon.textContent = '?';
        icon.setAttribute('tabindex', '0');
        icon.setAttribute('aria-label', 'Help');
        el.appendChild(icon);
      }
      el.addEventListener('mouseenter', () => showTooltip(el, key, false));
      el.addEventListener('mouseleave', hideTooltip);
      el.addEventListener('focusin', () => showTooltip(el, key, false));
      el.addEventListener('focusout', hideTooltip);
      el.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
          e.preventDefault();
          showTooltip(el, key, true);
        }, 500);
      }, { passive: false });
      el.addEventListener('touchend', () => clearTimeout(longPressTimer));
      el.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#cc-tooltip')) hideTooltip();
    });
  }

  function initModeSelector() {
    const sel = document.getElementById('cc-comm-mode');
    const msg = document.getElementById('council-msg');
    if (!sel) return;
    sel.innerHTML = Object.entries(COMM_MODES).map(([k, v]) =>
      `<option value="${k}">${escapeHtml(v.label)}</option>`).join('');
    sel.addEventListener('change', () => {
      const m = COMM_MODES[sel.value];
      if (msg && m) msg.placeholder = m.placeholder;
    });
    sel.dispatchEvent(new Event('change'));
  }

  function init() {
    if (_inited) return;
    _inited = true;
    initModeSelector();
    initVoice();
    initHelp();
    loadDomains();
    loadCommHistory();
    loadBuildHistory();
  }

  global.CcComm = {
    init,
    askCouncil,
    loadCommHistory,
    loadBuildHistory,
    loadDomains,
    COMM_MODES,
  };
})(window);
