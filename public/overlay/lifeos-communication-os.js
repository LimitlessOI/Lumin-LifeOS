/**
 * SYNOPSIS: LifeOS Communication OS — primary conversation interface.
 * LifeOS Communication OS — primary conversation interface.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
(function (global) {
  'use strict';

  let lastResponseText = '';
  let voiceRecognition = null;
  let voiceListening = false;
  let attachmentManager = null;
  const SYSTEM_DIRECT_ENDPOINT = '/api/v1/lifeos/builderos/command-control/founder-interface/message';

  function getKey() {
    return localStorage.getItem('cc_key')
      || localStorage.getItem('lifeos_cmd_key')
      || localStorage.getItem('COMMAND_CENTER_KEY')
      || '';
  }

  function getAccessToken() {
    return localStorage.getItem('lifeos_access_token') || '';
  }

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    const key = getKey();
    if (token) h.authorization = `Bearer ${token}`;
    else if (key) h['x-command-key'] = key;
    return h;
  }

  async function api(url, opts = {}) {
    const r = await fetch(url, { credentials: 'same-origin', headers: headers(), ...opts });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { _raw: text }; }
    return { ok: r.ok, status: r.status, data };
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function pillClass(status) {
    if (status === 'VERIFIED') return 'pill-verified';
    if (status === 'PARTIAL') return 'pill-partial';
    return 'pill-unverified';
  }

  function renderIdentity(identity, evidence) {
    const st = identity?.evidence_status || evidence?.evidence_status || 'UNVERIFIED';
    const conf = identity?.confidence_pct ?? evidence?.confidence_pct ?? 0;
    const speaker = identity?.primary_speaker || 'Lumin';
    const contributors = (identity?.contributors || []).filter(Boolean);
    const disagreements = identity?.disagreements || evidence?.disagreements || [];
    let html = `<div class="msg-head">
      <span class="speaker">${esc(speaker)}</span>
      <span class="pill ${pillClass(st)}">${esc(st)}</span>
      <span class="pill">${conf}% conf</span>`;
    if (contributors.length) {
      html += `<span class="pill" style="color:var(--text-muted)">+ ${esc(contributors.join(', '))}</span>`;
    }
    html += `<span class="pill" data-comm-help="comm-evidence">?</span></div>`;
    if (disagreements.length) {
      html += `<div style="font-size:11px;color:var(--warning);margin-bottom:6px">Disagreements: ${disagreements.map((d) => esc(d.summary || d.topic)).join('; ')}</div>`;
    }
    return html;
  }

  function appendAdam(text, attachments) {
    const thread = document.getElementById('thread');
    const empty = thread.querySelector('.empty');
    if (empty) empty.remove();
    const el = document.createElement('div');
    el.className = 'msg adam';
    const attList = Array.isArray(attachments) ? attachments : [];
    const attHtml = attList
      .filter((a) => a.preview_url)
      .map((a) => `<img src="${esc(a.preview_url)}" alt="${esc(a.name || 'attachment')}" style="max-width:160px;max-height:120px;border-radius:8px;margin-bottom:6px">`)
      .join('');
    el.innerHTML = `<div class="msg-head"><span class="speaker">Adam</span></div>${attHtml ? `<div class="bubble-attachments">${attHtml}</div>` : ''}<div class="msg-body">${esc(text)}</div>`;
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
  }

  function appendResponse(payload) {
    const thread = document.getElementById('thread');
    const empty = thread.querySelector('.empty');
    if (empty) empty.remove();

    const identity = payload.identity || payload.communication?.identity_json || {};
    const evidence = payload.evidence || payload.communication?.evidence_json || {};
    const meeting = payload.meeting;

    const el = document.createElement('div');
    el.className = 'msg';
    let body = '';

    if (meeting?.turns?.length) {
      body = meeting.turns.map((t) => `
        <div class="meeting-turn">
          <div class="msg-head">
            <span class="speaker">${esc(t.speaker)}</span>
            <span class="pill ${pillClass(t.evidence_status)}">${esc(t.evidence_status)}</span>
            <span class="pill">${t.confidence_pct ?? 0}%</span>
            ${t.stance && t.stance !== 'neutral' ? `<span class="pill">${esc(t.stance)}</span>` : ''}
          </div>
          <div class="msg-body">${esc(t.text)}</div>
        </div>`).join('');
      el.innerHTML = renderIdentity({ ...identity, primary_speaker: 'Meeting' }, evidence) + body;
    } else {
      const text = payload.response_text || payload.communication?.response_text || '';
      lastResponseText = text;
      document.getElementById('btn-speak').disabled = !text;
      body = `<div class="msg-body">${esc(text)}</div>`;
      el.innerHTML = renderIdentity(identity, evidence) + body;
    }

    thread.appendChild(el);
    if (global.LifeOSCommHelp) LifeOSCommHelp.initHelp(el);
    thread.scrollTop = thread.scrollHeight;
  }

  function renderDisplayData(display) {
    if (!display || typeof display !== 'object') return '';
    const summary = display.queue_summary || null;
    const jobs = Array.isArray(display.recent_jobs) ? display.recent_jobs.slice(0, 8) : [];
    let html = '';
    if (summary) {
      html += `<div class="msg-body" style="margin-top:8px">
Queue: queued=${summary.queued || 0}, running=${summary.running || 0}, blocked=${summary.blocked || 0}, failed=${summary.failed || 0}, done=${summary.done || 0}
</div>`;
    }
    if (jobs.length) {
      html += `<div class="msg-body" style="margin-top:8px"><strong>Recent jobs</strong></div>`;
      html += jobs.map((job) => {
        const line = `${job.status || 'unknown'} · ${String(job.instruction || '').slice(0, 90)}`;
        return `<div class="hub-item">${esc(line)}</div>`;
      }).join('');
    }
    return html;
  }

  function appendSystemResponse(payload) {
    const thread = document.getElementById('thread');
    const empty = thread.querySelector('.empty');
    if (empty) empty.remove();

    const passFail = payload.pass_fail || payload.status || 'FAIL';
    const commandTruth = payload.command_truth || (payload.command_ran ? 'COMMAND_RAN' : 'NO_COMMAND_RAN');
    const identity = {
      primary_speaker: 'System',
      evidence_status: passFail === 'PASS' ? 'VERIFIED' : (commandTruth === 'COMMAND_RAN' ? 'PARTIAL' : 'UNVERIFIED'),
      confidence_pct: passFail === 'PASS' ? 100 : 70,
      contributors: [commandTruth],
    };

    const summary = payload.human_summary
      || payload.reason
      || payload.error
      || 'System responded with no summary.';
    lastResponseText = summary;
    document.getElementById('btn-speak').disabled = !summary;

    const receiptPaths = Array.isArray(payload.receipt_paths) ? payload.receipt_paths : [];
    const artifactPaths = Array.isArray(payload.artifact_paths) ? payload.artifact_paths : [];
    const displayHtml = renderDisplayData(payload.display);

    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = `
      ${renderIdentity(identity, {})}
      <div class="msg-body">${esc(summary)}</div>
      <div class="msg-body" style="margin-top:8px">
        ${esc(passFail)} · ${esc(commandTruth)}
      </div>
      ${payload.command_executed ? `<div class="msg-body" style="margin-top:8px;color:var(--text-muted)">${esc(payload.command_executed)}</div>` : ''}
      ${displayHtml}
      ${receiptPaths.length ? `<div class="msg-body" style="margin-top:8px"><strong>Receipts</strong>\n${esc(receiptPaths.join('\n'))}</div>` : ''}
      ${artifactPaths.length ? `<div class="msg-body" style="margin-top:8px"><strong>Artifacts</strong>\n${esc(artifactPaths.join('\n'))}</div>` : ''}
    `;
    thread.appendChild(el);
    if (global.LifeOSCommHelp) LifeOSCommHelp.initHelp(el);
    thread.scrollTop = thread.scrollHeight;
  }

  async function loadModes() {
    const sel = document.getElementById('comm-mode');
    sel.innerHTML = `
      <option value="direct_system">Direct System (terminal bridge)</option>
      <option value="display_only">Display only (reports/queues/receipts)</option>
      <option value="meeting">Meeting</option>
    `;
  }

  async function loadDomains() {
    const sel = document.getElementById('comm-domain');
    const r = await api('/api/v1/lifeos/builder/domains');
    const domains = r.ok ? (Array.isArray(r.data) ? r.data : (r.data?.domains || [])) : [];
    const opts = domains.map((d) => {
      const n = typeof d === 'string' ? d : (d.name || d.path);
      return `<option value="${esc(n)}">${esc(n)}</option>`;
    }).join('');
    sel.innerHTML = `<option value="">Domain (optional)</option>${opts}`;
  }

  async function fetchDeploySha() {
    const r = await api('/api/v1/lifeos/builder/ready');
    return r.data?.codegen?.deploy_commit_sha || null;
  }

  async function sendMessage() {
    const input = document.getElementById('comm-input');
    let text = input.value.trim();
    const attachments = attachmentManager?.getAttachments?.() || [];
    const displayAttachments = attachmentManager?.getDisplayAttachments?.() || [];
    if (!text && !attachments.length) return;
    const mode = document.getElementById('comm-mode').value;
    const domain = document.getElementById('comm-domain').value || null;

    if (attachments.length) {
      const dr = await api('/api/v1/lifeos/voice-rail/describe-attachments', {
        method: 'POST',
        body: JSON.stringify({ attachments }),
      });
      if (dr.data?.blocks?.length) {
        text = [dr.data.blocks.join('\n\n'), text].filter(Boolean).join('\n\n');
      } else if (!text) {
        text = '(attachment — vision unavailable; add a caption next time)';
      }
    }

    appendAdam(text, displayAttachments);
    // Keep composer comfortable for multi-line use after each turn.
    input.value = '';
    input.rows = Math.max(4, Number(input.rows || 1));
    attachmentManager?.clear?.();

    const deploySha = await fetchDeploySha();
    const action = mode === 'display_only' ? 'display' : 'auto';
    const body = {
      text,
      stage: 'development',
      source_mode: 'text',
      conversational_mode: true,
      dictate_then_send: false,
      action,
      display_scope: mode === 'meeting' ? 'overview' : undefined,
      deploy_sha: deploySha,
      domain: domain || undefined,
    };
    const r = await api(SYSTEM_DIRECT_ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
    if ((r.status === 401 || r.status === 403) && r.data?.redirect) {
      window.location.href = r.data.redirect;
      return;
    }
    if (!r.ok) {
      appendSystemResponse({
        pass_fail: 'FAIL',
        command_truth: 'NO_COMMAND_RAN',
        reason: `Error ${r.status}`,
        error: JSON.stringify(r.data),
      });
      return;
    }
    appendSystemResponse(r.data || {});
    loadHub();
  }

  async function loadRevenueBrief() {
    const el = document.getElementById('hub-revenue');
    el.innerHTML = '<div class="empty">Loading revenue brief…</div>';
    const r = await api('/api/v1/lifeos/communication/revenue');
    if (!r.ok) {
      el.innerHTML = `<div class="empty">Revenue brief unavailable (${r.status})</div>`;
      return;
    }
    const rev = r.data?.revenue || {};
    const ev = rev.evidence || {};
    el.innerHTML = (rev.opportunities || []).map((o) => `
      <div class="revenue-card">
        <strong>${esc(o.name)}</strong>
        <div>Score: ${o.revenue_score ?? '—'} · TTF$: ${esc(o.time_to_first_dollar)}</div>
        <div>Engineering: ${esc(o.engineering_required)} · Risk: ${esc(o.risk_level)}</div>
        <div class="pill ${pillClass(o.evidence_status)}">${esc(o.evidence_status)}</div>
        <div style="margin-top:4px;color:var(--text-muted)">${esc(o.note)}</div>
      </div>`).join('') +
      `<div style="font-size:11px;margin-top:8px"><strong>Next:</strong> ${esc(rev.recommended_next_action)}</div>` +
      `<div class="pill ${pillClass(ev.evidence_status)}" style="margin-top:6px">${esc(ev.evidence_status)} ${ev.confidence_pct ?? 0}%</div>`;
  }

  async function loadHub() {
    const r = await api('/api/v1/lifeos/communication/hub');
    if (!r.ok) return;
    const hub = r.data?.hub || {};

    const dec = document.getElementById('hub-decisions');
    dec.innerHTML = (hub.waiting_decisions || []).length
      ? hub.waiting_decisions.map((d) => `<div class="hub-item">${esc(d.title || d.type)}</div>`).join('')
      : '<div class="empty">Nothing waiting on Adam</div>';

    const builds = document.getElementById('hub-builds');
    builds.innerHTML = (hub.latest_builds || []).length
      ? hub.latest_builds.map((b) => `<div class="hub-item">${esc((b.task_preview || b.domain || '').slice(0, 60))}</div>`).join('')
      : '<div class="empty">No recent builds</div>';

    const conv = document.getElementById('hub-convos');
    conv.innerHTML = (hub.latest_conversations || []).length
      ? hub.latest_conversations.map((c) => `<div class="hub-item" data-id="${esc(c.id)}">${esc((c.topic || c.mode || 'conversation').slice(0, 50))}</div>`).join('')
      : '<div class="empty">No conversations yet</div>';
  }

  async function runSearch() {
    const q = document.getElementById('search-q').value.trim();
    const tag = q.startsWith('#') ? q.slice(1) : '';
    const url = tag
      ? `/api/v1/lifeos/communication/search?tag=${encodeURIComponent(tag)}`
      : `/api/v1/lifeos/communication/search?q=${encodeURIComponent(q)}`;
    const r = await api(url);
    const conv = document.getElementById('hub-convos');
    if (!r.ok || !r.data?.communications?.length) {
      conv.innerHTML = '<div class="empty">No matches</div>';
      return;
    }
    conv.innerHTML = r.data.communications.map((c) =>
      `<div class="hub-item">${esc((c.topic || c.transcript || '').slice(0, 60))} <span class="pill">${esc((c.tags || []).join(','))}</span></div>`).join('');
  }

  function initVoice() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    const status = document.getElementById('voice-status');
    const transcript = document.getElementById('voice-transcript');
    const recordBtn = document.getElementById('btn-record');
    const input = document.getElementById('comm-input');

    if (!SR) {
      if (status) status.textContent = 'Voice not supported';
      recordBtn.disabled = true;
      return;
    }

    voiceRecognition = new SR();
    voiceRecognition.lang = 'en-US';
    voiceRecognition.interimResults = true;
    voiceRecognition.continuous = true;

    voiceRecognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      const combined = (final + interim).trim();
      transcript.value = combined;
      if (combined) input.value = combined;
      if (/\bsend\b/i.test(final)) {
        stopVoice();
        sendMessage();
      }
    };

    recordBtn.addEventListener('click', () => {
      if (voiceListening) stopVoice();
      else startVoice();
    });

    function startVoice() {
      voiceListening = true;
      status.textContent = 'Listening…';
      recordBtn.classList.add('cc-recording');
      try { voiceRecognition.start(); } catch (e) {
        voiceListening = false;
        status.textContent = e.message;
      }
    }

    function stopVoice() {
      voiceListening = false;
      recordBtn.classList.remove('cc-recording');
      status.textContent = 'Voice idle';
      try { voiceRecognition.stop(); } catch { /* ignore */ }
    }
  }

  function init() {
    if (!getKey() && !getAccessToken()) {
      document.getElementById('thread').innerHTML =
        '<div class="empty">Login required — open <a href="/lifeos?direct_system=1" style="color:var(--accent)">LifeOS</a> or <a href="/overlay/lifeos-login.html?next=%2Flifeos%3Fdirect_system%3D1" style="color:var(--accent)">LifeOS Login</a>.</div>';
    }
    loadModes();
    loadDomains();
    loadHub();
    initVoice();
    if (global.LifeOSChatComposer?.createAttachmentManager) {
      attachmentManager = global.LifeOSChatComposer.createAttachmentManager({
        stripId: 'comm-attachment-strip',
        inputId: 'comm-file-input',
        attachBtnId: 'comm-btn-attach',
      });
      const inputEl = document.getElementById('comm-input');
      attachmentManager.setupPaste(inputEl);
      attachmentManager.setupDropzone(document.querySelector('#comm-input')?.closest('.chat-input-inner'));
    }
    if (global.LifeOSCommHelp) LifeOSCommHelp.initHelp(document);

    document.getElementById('btn-comm-options')?.addEventListener('click', () => {
      document.getElementById('comm-controls')?.classList.toggle('open');
    });

    document.getElementById('btn-send').addEventListener('click', sendMessage);
    document.getElementById('btn-meeting').addEventListener('click', () => {
      document.getElementById('comm-mode').value = 'meeting';
      document.getElementById('comm-input').focus();
    });
    document.getElementById('btn-revenue').addEventListener('click', loadRevenueBrief);
    document.getElementById('btn-search').addEventListener('click', runSearch);
    document.getElementById('btn-speak').addEventListener('click', () => {
      if (!lastResponseText || !('speechSynthesis' in global)) return;
      global.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(lastResponseText.slice(0, 2000));
      global.speechSynthesis.speak(u);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#comm-help-tooltip')) {
        if (global.LifeOSCommHelp) LifeOSCommHelp.hideTooltip();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
