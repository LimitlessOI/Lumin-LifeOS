/**
 * SYNOPSIS: Command Center — real C2 communication layer.
 * Command Center — real C2 communication layer.
 * Typed/threaded history, explicit send, browser STT/TTS controls, search, and
 * C2 job integration. No fake UI, no mock-only flows.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */
(function (global) {
  'use strict';

  const COMM_MODES = {
    c2_command: {
      label: 'C2 Command',
      placeholder: 'Tell BuilderOS exactly what to do through governed C2...',
    },
    quick_ask: {
      label: 'Quick Ask',
      placeholder: 'Short question with one clear answer...',
    },
    brainstorm: {
      label: 'Brainstorming',
      placeholder: 'Explore options and tradeoffs...',
    },
    step_build: {
      label: 'Step-by-step Build',
      placeholder: 'Break the work into safe, buildable steps...',
    },
    audit: {
      label: 'Audit / Verify',
      placeholder: 'What should be verified against repo/runtime truth?...',
    },
    meeting: {
      label: 'Meeting Mode',
      placeholder: 'Decision or agenda item that needs structured output...',
    },
  };

  const HELP = {
    'cc-mode': {
      short: 'How the communication layer frames your request.',
      long: 'C2 Command routes through BuilderOS command-control jobs. Other modes still produce typed history and system responses, but remain governed and explicit-send only.',
    },
    'cc-domain': {
      short: 'Domain prompt file from prompts/.',
      long: 'Domain selection is recorded with each message so the history stays searchable by operational context.',
    },
    'cc-ask': {
      short: 'Send the current message through the real C2 communication path.',
      long: 'This persists a typed user message, creates a BuilderOS command-control job, optionally executes it immediately, then stores the typed system response with evidence and job linkage.',
    },
    'cc-voice-record': {
      short: 'Browser speech-to-text with explicit send only.',
      long: 'Dictation mode keeps listening through thinking pauses. Push-to-talk records only while pressed. Voice never auto-sends.',
    },
    'cc-evidence': {
      short: 'Trust guard — VERIFIED / PARTIAL / UNVERIFIED.',
      long: 'Server verifies cited repo paths, records live endpoints used, and keeps communication history separate from BuilderOS epistemic proof memory.',
    },
    'cc-snapshot': {
      short: 'Live system health tiles.',
      long: 'Aggregated from runtime endpoints. Not a substitute for communication history or command-control job truth.',
    },
    'cc-builder': {
      short: 'Builder mode and recent build surface.',
      long: 'Builds still require governed loop and pre-commit verification. Communication history is not itself a build receipt.',
    },
    'cc-queue': {
      short: 'Items needing Adam approval.',
      long: 'Separate from the communication thread. Approval queues are not chat history.',
    },
  };

  let voiceRecognition = null;
  let voiceListening = false;
  let voiceMode = 'dictation';
  let isThinking = false;
  let selectedVoiceName = '';
  let currentThreadId = null;
  let availableVoices = [];
  let longPressTimer = null;
  let initialized = false;
  let activeJobPoller = null;

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
    const response = await fetch(url, { headers: headers(), ...opts });
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { _raw: text }; }
    return { ok: response.ok, status: response.status, data };
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getPlaybackRate() {
    const el = document.getElementById('cc-playback-rate');
    return Number(el?.value || 1) || 1;
  }

  function buildTransport() {
    return voiceListening || document.getElementById('cc-voice-transcript')?.value ? 'voice' : 'text';
  }

  function getMode() {
    return document.getElementById('cc-comm-mode')?.value || 'c2_command';
  }

  function setVoiceStatus(text) {
    const status = document.getElementById('cc-voice-status');
    if (status) status.textContent = text;
  }

  function setThreadStatus(text) {
    const status = document.getElementById('cc-thread-status');
    if (status) status.textContent = text;
  }

  function setThinking(active) {
    isThinking = active;
    const sendButtons = ['cc-voice-send'];
    sendButtons.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = active;
    });
    const recordBtn = document.getElementById('cc-voice-record');
    if (recordBtn) recordBtn.disabled = active;
    if (active) {
      setVoiceStatus('System thinking — explicit send only');
      stopVoice();
    } else if (!voiceListening) {
      setVoiceStatus('Voice idle · explicit send only');
    }
  }

  function renderEvidence(evidence) {
    if (!evidence) return '';
    const statusClass = evidence.evidence_status === 'VERIFIED'
      ? 'pill-success'
      : evidence.evidence_status === 'PARTIAL'
        ? 'pill-warning'
        : 'pill-error';
    const files = (evidence.files_checked || []).map((file) =>
      `<li>${file.exists ? '✓' : '✗'} <code>${escapeHtml(file.path)}</code></li>`).join('') || '<li>No file paths cited</li>';
    const endpoints = (evidence.commands_or_endpoints_used || []).map((endpoint) =>
      `<li><code>${escapeHtml(endpoint)}</code></li>`).join('') || '<li>No live endpoints recorded</li>';
    const warnings = (evidence.warnings || []).map((warning) => `<li>${escapeHtml(warning)}</li>`).join('');

    return `
      <div class="cc-evidence-box" data-cc-help="cc-evidence">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          <span class="pill ${statusClass}">${escapeHtml(evidence.evidence_status)}</span>
          ${evidence.advisory_only ? '<span class="pill pill-muted">ADVISORY</span>' : ''}
          ${evidence.committed ? '<span class="pill pill-success">COMMITTED</span>' : ''}
        </div>
        <div class="cc-evidence-grid">
          <div><strong>Endpoints used</strong><ul>${endpoints}</ul></div>
          <div><strong>Files checked</strong><ul>${files}</ul></div>
          <div><strong>Voice / replay</strong><ul><li>Playback rate: ${escapeHtml(String(evidence.playback_rate || getPlaybackRate()))}x</li><li>Voice: ${escapeHtml(evidence.selected_voice || selectedVoiceName || 'default')}</li></ul></div>
        </div>
        ${warnings ? `<div style="margin-top:8px;font-size:11px;color:var(--warning)"><strong>Warnings</strong><ul>${warnings}</ul></div>` : ''}
        <div style="font-size:10px;color:var(--text-muted);margin-top:6px">Communication history only — excluded from BuilderOS memory proof.</div>
      </div>`;
  }

  function renderHistoryRows(rows) {
    if (!rows.length) {
      return '<div class="empty-state">No communication history yet.</div>';
    }
    return rows.map((row) => {
      const evidence = row.evidence_json || {};
      const pill = row.message_type === 'user_message'
        ? 'pill-accent'
        : row.message_type === 'system_response'
          ? 'pill-success'
          : 'pill-muted';
      const preview = row.message_type === 'user_message'
        ? (row.transcript || '')
        : (row.response_text || '');
      const status = row.status ? `<span class="pill pill-muted" style="font-size:9px">${escapeHtml(row.status)}</span>` : '';
      const evidencePill = evidence.evidence_status
        ? `<span class="pill ${evidence.evidence_status === 'VERIFIED' ? 'pill-success' : evidence.evidence_status === 'PARTIAL' ? 'pill-warning' : 'pill-error'}" style="font-size:9px">${escapeHtml(evidence.evidence_status)}</span>`
        : '';
      return `
        <div class="history-row">
          <span class="pill ${pill}" style="font-size:9px">${escapeHtml(row.message_type || 'message')}</span>
          ${status}
          ${evidencePill}
          <span class="history-main">
            <strong>${escapeHtml(row.speaker || 'system')}</strong>
            ${row.thread_title ? ` · <span class="history-meta">${escapeHtml(row.thread_title)}</span>` : ''}
            <div>${escapeHtml(preview.slice(0, 160))}</div>
          </span>
          <span class="history-ts">${row.created_at ? new Date(row.created_at).toLocaleString() : ''}</span>
        </div>`;
    }).join('');
  }

  async function fetchDeploySha() {
    const response = await ccFetch('/api/v1/lifeos/builder/ready');
    return response.data?.codegen?.deploy_commit_sha || null;
  }

  async function loadDomains() {
    const select = document.getElementById('council-domain');
    if (!select) return;
    const response = await ccFetch('/api/v1/lifeos/builder/domains');
    const domains = response.ok
      ? (Array.isArray(response.data) ? response.data : (response.data?.domains || []))
      : [];
    if (!domains.length) {
      select.innerHTML = '<option value="lifeos-core">lifeos-core</option>';
      return;
    }
    select.innerHTML = domains.map((domain) => {
      const name = typeof domain === 'string' ? domain : (domain.name || domain.path || domain.file);
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
  }

  async function loadCommHistory() {
    const el = document.getElementById('council-history');
    if (!el) return;
    const q = document.getElementById('cc-history-search')?.value?.trim() || '';
    const params = new URLSearchParams({ limit: '20' });
    if (currentThreadId) params.set('thread_id', currentThreadId);
    if (q) params.set('q', q);
    const response = await ccFetch(`/api/v1/lifeos/command-center/communications?${params.toString()}`);
    if (!response.ok) {
      el.innerHTML = `<div class="not-wired">ERROR<span>GET /communications returned ${response.status}</span></div>`;
      return;
    }
    const rows = response.data?.communications || [];
    el.innerHTML = `
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">
        ${currentThreadId ? `Thread ${escapeHtml(currentThreadId.slice(0, 8))} · ` : ''}typed communication history
      </div>
      ${renderHistoryRows(rows)}
    `;
  }

  async function loadBuildHistory() {
    const el = document.getElementById('cc-build-history');
    if (!el) return;
    const response = await ccFetch('/api/v1/lifeos/builderos/command-control/jobs?limit=5');
    if (!response.ok) {
      el.innerHTML = '<div class="not-wired">Recent C2 jobs unavailable</div>';
      return;
    }
    const jobs = response.data?.jobs || [];
    if (jobs.length) {
      el.innerHTML = renderHistoryRows(jobs.map((job) => ({
        message_type: 'system_status',
        speaker: 'C2',
        status: job.status,
        response_text: `Job ${job.id} · ${job.status} · ${job.instruction || 'no instruction'}`,
        created_at: job.updated_at || job.created_at,
      })));
      return;
    }
    el.innerHTML = '<div class="empty-state">Use the Builder Control panel or a saved job to inspect recent C2 jobs.</div>';
  }

  function populateVoiceSelect() {
    const select = document.getElementById('cc-voice-select');
    if (!select || !('speechSynthesis' in global)) return;
    availableVoices = global.speechSynthesis.getVoices() || [];
    const current = select.value;
    select.innerHTML = '<option value="">Default system voice</option>' +
      availableVoices.map((voice) =>
        `<option value="${escapeHtml(voice.name)}">${escapeHtml(voice.name)} (${escapeHtml(voice.lang)})</option>`).join('');
    if (current) select.value = current;
  }

  function speakResponse(text) {
    if (!('speechSynthesis' in global) || !text) return;
    global.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 2000));
    utterance.rate = getPlaybackRate();
    const voice = availableVoices.find((item) => item.name === selectedVoiceName);
    if (voice) utterance.voice = voice;
    global.speechSynthesis.speak(utterance);
  }

  function startVoice() {
    if (!voiceRecognition || isThinking) return;
    try {
      voiceRecognition.start();
      voiceListening = true;
      const recordBtn = document.getElementById('cc-voice-record');
      if (recordBtn) {
        recordBtn.classList.add('cc-recording');
        recordBtn.textContent = voiceMode === 'push_to_talk' ? 'Talking…' : 'Listening…';
      }
      setVoiceStatus(voiceMode === 'push_to_talk'
        ? 'Push-to-talk active — release to stop'
        : 'Listening — pauses do not send automatically');
    } catch (error) {
      voiceListening = false;
      setVoiceStatus(`Could not start mic: ${error.message}`);
    }
  }

  function stopVoice() {
    if (!voiceRecognition) return;
    voiceListening = false;
    const recordBtn = document.getElementById('cc-voice-record');
    if (recordBtn) {
      recordBtn.classList.remove('cc-recording');
      recordBtn.textContent = voiceMode === 'push_to_talk' ? 'Hold to Talk' : 'Start Mic';
    }
    try { voiceRecognition.stop(); } catch { /* ignore */ }
    if (!isThinking) setVoiceStatus('Voice idle · explicit send only');
  }

  function bindPushToTalk(recordBtn) {
    const start = (event) => {
      if (voiceMode !== 'push_to_talk') return;
      event.preventDefault();
      startVoice();
    };
    const stop = (event) => {
      if (voiceMode !== 'push_to_talk') return;
      event.preventDefault();
      stopVoice();
    };
    recordBtn.addEventListener('mousedown', start);
    recordBtn.addEventListener('mouseup', stop);
    recordBtn.addEventListener('mouseleave', stop);
    recordBtn.addEventListener('touchstart', start, { passive: false });
    recordBtn.addEventListener('touchend', stop, { passive: false });
  }

  function initVoice() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    const transcript = document.getElementById('cc-voice-transcript');
    const message = document.getElementById('council-msg');
    const recordBtn = document.getElementById('cc-voice-record');
    const stopBtn = document.getElementById('cc-voice-stop');
    const sendBtn = document.getElementById('cc-voice-send');
    const modeSelect = document.getElementById('cc-voice-mode');
    const voiceSelect = document.getElementById('cc-voice-select');

    if (!SR) {
      setVoiceStatus('Voice not supported in this browser');
      if (recordBtn) recordBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
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
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      const combined = `${message?.value || ''} ${final}${interim}`.trim();
      if (transcript) transcript.value = `${final}${interim}`.trim();
      if (message && combined) message.value = combined;
    };

    voiceRecognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setVoiceStatus(`Voice error: ${event.error}`);
      }
    };

    voiceRecognition.onend = () => {
      if (voiceMode === 'dictation' && voiceListening && !isThinking) {
        try { voiceRecognition.start(); } catch { voiceListening = false; }
      } else if (!isThinking) {
        stopVoice();
      }
    };

    modeSelect?.addEventListener('change', () => {
      voiceMode = modeSelect.value || 'dictation';
      stopVoice();
    });

    voiceSelect?.addEventListener('change', () => {
      selectedVoiceName = voiceSelect.value || '';
    });

    recordBtn?.addEventListener('click', () => {
      if (voiceMode === 'push_to_talk') return;
      if (voiceListening) stopVoice();
      else startVoice();
    });
    bindPushToTalk(recordBtn);
    stopBtn?.addEventListener('click', () => stopVoice());
    sendBtn?.addEventListener('click', () => askCouncil());

    populateVoiceSelect();
    if ('speechSynthesis' in global) {
      global.speechSynthesis.onvoiceschanged = populateVoiceSelect;
    }
  }

  const JOB_TERMINAL = new Set(['committed', 'failed', 'blocked', 'done', 'halted', 'cancelled']);

  function stopJobPolling() {
    if (activeJobPoller) {
      clearInterval(activeJobPoller);
      activeJobPoller = null;
    }
    const indicator = document.getElementById('cc-job-poll-indicator');
    if (indicator) indicator.textContent = '';
  }

  function startJobPolling(threadId, systemMessageId) {
    stopJobPolling();
    let polls = 0;
    const MAX_POLLS = 40;

    activeJobPoller = setInterval(async () => {
      polls += 1;
      if (polls > MAX_POLLS) {
        stopJobPolling();
        const indicator = document.getElementById('cc-job-poll-indicator');
        if (indicator) indicator.textContent = 'Poll timeout — check job manually';
        return;
      }

      const resp = await ccFetch(`/api/v1/lifeos/command-center/communications/thread/${threadId}`);
      if (!resp.ok) return;

      const sysMsg = (resp.data?.messages || []).find((m) => m.id === systemMessageId);
      if (!sysMsg) return;

      const liveStatus = sysMsg.job_status || sysMsg.status || 'queued';
      const liveBlocker = sysMsg.job_blocker || '';
      const liveText = sysMsg.response_text || '';

      const pill = document.getElementById('cc-job-status-pill');
      if (pill) {
        const cls = liveStatus === 'committed' ? 'pill-success'
          : (liveStatus === 'failed' || liveStatus === 'blocked' || liveStatus === 'halted') ? 'pill-error'
          : liveStatus === 'running' ? 'pill-warning'
          : 'pill-muted';
        pill.className = `pill ${cls}`;
        pill.style.fontSize = '9px';
        pill.textContent = liveBlocker ? `${liveStatus} · ${liveBlocker}` : liveStatus;
      }

      const textEl = document.getElementById('cc-response-text');
      if (textEl && liveText && liveText !== textEl.getAttribute('data-text')) {
        textEl.setAttribute('data-text', liveText);
        textEl.innerHTML = escapeHtml(liveText).replace(/\n/g, '<br>');
      }

      const indicator = document.getElementById('cc-job-poll-indicator');
      if (JOB_TERMINAL.has(liveStatus)) {
        if (indicator) indicator.textContent = '';
        stopJobPolling();
      } else if (indicator) {
        indicator.textContent = `updating… (${polls})`;
      }
    }, 3000);
  }

  async function askCouncil() {
    const messageEl = document.getElementById('council-msg');
    const responseEl = document.getElementById('council-response');
    const domain = document.getElementById('council-domain')?.value || '';
    const text = messageEl?.value?.trim() || '';
    if (!text || !responseEl || isThinking) return;

    stopJobPolling();
    setThinking(true);
    responseEl.style.display = 'block';
    responseEl.innerHTML = '<div class="cc-loading">Sending through C2…</div>';

    const deploySha = await fetchDeploySha();
    const response = await ccFetch('/api/v1/lifeos/command-center/communications/send', {
      method: 'POST',
      body: JSON.stringify({
        thread_id: currentThreadId,
        mode: getMode(),
        domain,
        transcript: text,
        transport: buildTransport(),
        selected_voice: selectedVoiceName || null,
        playback_rate: getPlaybackRate(),
        explicit_send: true,
        auto_execute: true,
        deploy_sha: deploySha,
      }),
    });

    setThinking(false);

    if (!response.ok || !response.data?.ok) {
      responseEl.innerHTML = `<span style="color:var(--error)">Error ${response.status}: ${escapeHtml(JSON.stringify(response.data))}</span>`;
      return;
    }

    const data = response.data;
    currentThreadId = data.thread_id || currentThreadId;
    setThreadStatus(`Thread ${String(currentThreadId).slice(0, 8)} · job ${String(data.job?.id || '').slice(0, 8)}`);
    messageEl.value = '';
    const transcript = document.getElementById('cc-voice-transcript');
    if (transcript) transcript.value = '';

    const initialStatus = data.job?.status || 'queued';
    const initialText = String(data.system_message?.response_text || '');
    responseEl.innerHTML = `
      <div class="cc-response-head">
        <strong style="color:var(--accent)">C2</strong>
        <span class="pill pill-accent" style="font-size:9px">${escapeHtml(COMM_MODES[getMode()]?.label || getMode())}</span>
        <span class="pill pill-muted" id="cc-job-status-pill" style="font-size:9px">${escapeHtml(initialStatus)}</span>
        <span id="cc-job-poll-indicator" style="font-size:9px;color:var(--text-muted,#888);margin-left:4px">${data.async_execute ? 'updating…' : ''}</span>
        ${(data.thread_context_count > 0) ? `<span style="font-size:9px;color:var(--text-muted,#888);margin-left:6px" title="Prior thread messages included as context">↩ ${data.thread_context_count} prior</span>` : ''}
      </div>
      <div class="cc-response-body" id="cc-response-text" data-text="${escapeHtml(initialText)}">${escapeHtml(initialText).replace(/\n/g, '<br>')}</div>
      ${renderEvidence(data.evidence)}
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="btn btn-ghost btn-sm" id="cc-speak-response">Speak response</button>
      </div>`;

    if (data.async_execute && data.thread_id && data.system_message?.id) {
      startJobPolling(data.thread_id, data.system_message.id);
    }

    document.getElementById('cc-speak-response')?.addEventListener('click', () => {
      speakResponse(data.system_message?.response_text || '');
    });
    await loadCommHistory();
  }

  function showTooltip(el, helpKey, expanded) {
    let tip = document.getElementById('cc-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'cc-tooltip';
      tip.className = 'cc-tooltip';
      document.body.appendChild(tip);
    }
    const help = HELP[helpKey] || { short: helpKey, long: '' };
    tip.innerHTML = expanded && help.long
      ? `<div>${escapeHtml(help.short)}</div><div class="cc-tooltip-more">${escapeHtml(help.long)}</div>`
      : `<div>${escapeHtml(help.short)}</div>${help.long ? '<button type="button" class="cc-tooltip-more-btn">More</button>' : ''}`;
    tip.querySelector('.cc-tooltip-more-btn')?.addEventListener('click', (event) => {
      event.stopPropagation();
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
      el.addEventListener('touchstart', (event) => {
        longPressTimer = setTimeout(() => {
          event.preventDefault();
          showTooltip(el, key, true);
        }, 500);
      }, { passive: false });
      el.addEventListener('touchend', () => clearTimeout(longPressTimer));
      el.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#cc-tooltip')) hideTooltip();
    });
  }

  function initModeSelector() {
    const select = document.getElementById('cc-comm-mode');
    const message = document.getElementById('council-msg');
    if (!select) return;
    select.innerHTML = Object.entries(COMM_MODES).map(([key, value]) =>
      `<option value="${key}">${escapeHtml(value.label)}</option>`).join('');
    select.value = 'c2_command';
    select.addEventListener('change', () => {
      const mode = COMM_MODES[select.value];
      if (message && mode) message.placeholder = mode.placeholder;
    });
    select.dispatchEvent(new Event('change'));
  }

  function initSearch() {
    const search = document.getElementById('cc-history-search');
    search?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        loadCommHistory();
      }
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    initModeSelector();
    initVoice();
    initSearch();
    initHelp();
    loadDomains();
    loadCommHistory();
    loadBuildHistory();
    setThreadStatus('Thread not started');
  }

  global.CcComm = {
    init,
    askCouncil,
    loadCommHistory,
    loadBuildHistory,
    loadDomains,
    speakResponse,
    stopJobPolling,
    COMM_MODES,
  };
})(window);
