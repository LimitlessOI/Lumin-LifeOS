(function () {
  'use strict';

  const getKey = () =>
    localStorage.getItem('cc_key')
    || localStorage.getItem('lifeos_cmd_key')
    || localStorage.getItem('COMMAND_CENTER_KEY')
    || '';

  const getAccessToken = () =>
    localStorage.getItem('lifeos_access_token')
    || '';

  const ui = {
    action: document.getElementById('action'),
    stage: document.getElementById('stage'),
    sourceMode: document.getElementById('sourceMode'),
    missionId: document.getElementById('missionId'),
    input: document.getElementById('input'),
    recordBtn: document.getElementById('recordBtn'),
    sendBtn: document.getElementById('sendBtn'),
    dictateThenSend: document.getElementById('dictateThenSend'),
    conversationalMode: document.getElementById('conversationalMode'),
    kPassFail: document.getElementById('kPassFail'),
    kCommandTruth: document.getElementById('kCommandTruth'),
    kExit: document.getElementById('kExit'),
    kMission: document.getElementById('kMission'),
    kBlocker: document.getElementById('kBlocker'),
    summary: document.getElementById('summary'),
    commandExecuted: document.getElementById('commandExecuted'),
    receiptPaths: document.getElementById('receiptPaths'),
    artifactPaths: document.getElementById('artifactPaths'),
    stdout: document.getElementById('stdout'),
    stderr: document.getElementById('stderr'),
  };

  let recognition = null;
  let listening = false;

  async function callBridge(payload) {
    const token = getAccessToken();
    const key = getKey();
    const headers = {
      'content-type': 'application/json',
    };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    } else if (key) {
      // Emergency/dev fallback only; normal access should use account JWT.
      headers['x-command-key'] = key;
    }
    const res = await fetch('/api/v1/lifeos/builderos/command-control/founder-interface/message', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { ok: false, pass_fail: 'FAIL', reason: 'INVALID_JSON', stdout: text }; }
    return { ok: res.ok, status: res.status, data };
  }

  function formatList(items) {
    if (!Array.isArray(items) || items.length === 0) return '—';
    return items.map((item) => `- ${item}`).join('\n');
  }

  function applyResult(data) {
    const passFail = data.pass_fail || data.status || '—';
    ui.kPassFail.textContent = passFail;
    ui.kPassFail.className = `v ${passFail === 'PASS' ? 'pass' : passFail === 'FAIL' ? 'fail' : ''}`;
    ui.kCommandTruth.textContent = data.command_truth || '—';
    ui.kExit.textContent = (data.exit_code == null ? '—' : String(data.exit_code));
    ui.kMission.textContent = data.mission_id || '—';
    ui.kBlocker.textContent = data.first_blocker || '—';
    ui.summary.textContent = data.human_summary || data.reason || 'No summary.';
    ui.commandExecuted.textContent = data.command_executed || 'NO_COMMAND_RAN';
    ui.receiptPaths.textContent = formatList(data.receipt_paths);
    ui.artifactPaths.textContent = formatList(data.artifact_paths);
    ui.stdout.textContent = (data.stdout || '').trim() || '—';
    ui.stderr.textContent = (data.stderr || '').trim() || '—';
  }

  async function send() {
    const text = String(ui.input.value || '').trim();
    if (!text) return;
    ui.sendBtn.disabled = true;
    ui.sendBtn.textContent = 'Running...';
    try {
      const payload = {
        text,
        action: ui.action.value,
        stage: ui.stage.value,
        mission_id: ui.missionId.value || null,
        source_mode: ui.sourceMode.value,
        dictate_then_send: ui.dictateThenSend.checked,
        conversational_mode: ui.conversationalMode.checked,
      };
      const res = await callBridge(payload);
      if ((res.status === 401 || res.status === 403) && res.data?.redirect) {
        window.location.href = res.data.redirect;
        return;
      }
      applyResult(res.data || {});
    } catch (err) {
      applyResult({
        pass_fail: 'FAIL',
        command_truth: 'NO_COMMAND_RAN',
        first_blocker: 'NETWORK_OR_RUNTIME_ERROR',
        human_summary: err.message,
      });
    } finally {
      ui.sendBtn.disabled = false;
      ui.sendBtn.textContent = 'Send to BuilderOS';
    }
  }

  function initDictation() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      ui.recordBtn.disabled = true;
      ui.recordBtn.textContent = 'Dictation unavailable';
      return;
    }
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let txt = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        txt += chunk;
        if (event.results[i].isFinal) finalChunk += chunk;
      }
      if (txt.trim()) ui.input.value = txt.trim();
      if (ui.dictateThenSend.checked && /\b(send|run now|submit)\b/i.test(finalChunk)) {
        stopDictation();
        send();
      }
    };
    recognition.onend = () => {
      listening = false;
      ui.recordBtn.classList.remove('recording');
      ui.recordBtn.textContent = 'Start Dictation';
    };
    ui.recordBtn.addEventListener('click', () => {
      if (listening) stopDictation();
      else startDictation();
    });
  }

  function startDictation() {
    if (!recognition) return;
    listening = true;
    ui.recordBtn.classList.add('recording');
    ui.recordBtn.textContent = 'Stop Dictation';
    try { recognition.start(); } catch (_e) { /* ignore */ }
  }

  function stopDictation() {
    if (!recognition) return;
    listening = false;
    ui.recordBtn.classList.remove('recording');
    ui.recordBtn.textContent = 'Start Dictation';
    try { recognition.stop(); } catch (_e) { /* ignore */ }
  }

  ui.sendBtn.addEventListener('click', send);
  initDictation();
})();
