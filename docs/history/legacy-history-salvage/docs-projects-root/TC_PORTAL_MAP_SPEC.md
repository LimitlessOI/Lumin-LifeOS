<!-- SYNOPSIS: Documentation — TC PORTAL MAP SPEC. -->

(function () {
  let lastWorkspaceTests = null;
  let lastWorkspaceValidation = null;
  let lastWorkspaceIntakeRun = null;
  let lastPhotoPackageSend = null;

  function getApiKey() {
    return (
      localStorage.getItem('COMMAND_CENTER_KEY') ||
      localStorage.getItem('lifeos_cmd_key') ||
      localStorage.getItem('x_api_key') ||
      ''
    );
  }

  function setApiKey(value) {
    localStorage.setItem('COMMAND_CENTER_KEY', value);
    localStorage.setItem('lifeos_cmd_key', value);
    localStorage.setItem('x_api_key', value);
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function badgeClass(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'green' || v === 'healthy' || v === 'pass' || v === 'sent' || v === 'resolved') return 'ok';
    if (v === 'yellow' || v === 'watch' || v === 'review' || v === 'prepared') return 'warn';
    return 'bad';
  }

  async function api(url, options) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'content-type': 'application/json',
        'x-api-key': getApiKey(),
        ...(options && options.headers ? options.headers : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  async function pingTcService() {
    try {
      const res = await fetch('/api/v1/tc/status');
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && data.ok === true, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    }
  }

  function renderWorkspaceLoadFailure(err, ping) {
    const is401 = err?.status === 401 || /unauthorized/i.test(err?.message || '');
    const dbBad = ping?.data?.db === 'error';
    return `
      <div class="wrap">
        <div class="card error">
          <h2>Workspace load failed</h2>
          <p>${escapeHtml(err?.message || 'Unknown error')}</p>
          ${dbBad ? '<p><strong>Database</strong> check failed on <code>/api/v1/tc/status</code>. Confirm <code>DATABASE_URL</code> on Railway and redeploy.</p>' : ''}
          ${is401 ? ` <div style="margin-top:14px;padding:14px;background:#141c31;border-radius:12px;border:1px solid #2d3b5f"> <p><strong>Unauthorized</strong> usually means the command key in this browser does not match Railway.</p> <ol style="margin:8px 0 0 18px;line-height:1.5"> <li>Open <a href="https://docs.railway.app/develop/variables" target="_blank" rel="noopener">Railway → your service → Variables</a>.</li> <li>Copy <code>COMMAND_CENTER_KEY</code> (or <code>API_KEY</code> / <code>LIFEOS_KEY</code> if that is what you set).</li> <li>Paste into <strong>Command key</strong> at the top of this page (after reload) and click Save.</li> </ol> </div>` : ''}
          <p style="margin-top:16px"><a href="/tc/agent-portal.html">Reload portal</a>
            · <a href="/api/v1/tc/status" target="_blank" rel="noopener">Open TC status JSON</a> (no key required)</p>
        </div>
      </div>`;
  }

  async function multipartApi(url, formData) {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'x-api-key': getApiKey(),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  async function load() {
    const txId = qs('tx');
    const view = document.body.dataset.view || 'agent';

    if (!txId) {
      if (view === 'agent') {
        const ping = await pingTcService();
        try {
          const workspace = await api('/api/v1/tc/intake/workspace');
          renderWorkspace(workspace.workspace || workspace, ping);
        } catch (err) {
          document.getElementById('app').innerHTML = renderWorkspaceLoadFailure(err, ping);
        }
        return;
      }
      document.getElementById('app').innerHTML = '<div class="card"><h2>Missing transaction id</h2><p>Add <code>?tx=123</code> to the URL.</p></div>';
      return;
    }

    try {
      const requests = [
        api(`/api/v1/tc/transactions/${txId}/overview?view=${view}`),
        api(`/api/v1/tc/transactions/${txId}/reports`),
      ];
      if (view === 'agent') requests.push(api(`/api/v1/tc/transactions/${txId}/approvals?limit=25`));
      if (view === 'agent') requests.push(api(`/api/v1/tc/transactions/${txId}/interactions?limit=20`));
      if (view === 'agent') requests.push(api(`/api/v1/tc/transactions/${txId}/inspection`));

      const [overview, reports, approvals, interactions, inspection] = await Promise.all(requests);
      renderOverview(overview, reports.items || [], approvals?.items || [], interactions?.items || [], inspection || null);
    } catch (err) {
      document.getElementById('app').innerHTML = `<div class="card error"><h2>Load failed</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  async function runApprovalAction(id, action) {
    await api(`/api/v1/tc/approvals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, actor: 'agent_portal' }),
    });
    await load();
  }

  async function runAlertAction(id, action, extra = {}) {
    await api(`/api/v1/tc/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, actor: 'agent_portal', ...extra }),
    });
    await load();
  }

  async function createMobileLink(kind, id, action) {
    const data = await api(`/api/v1/tc/mobile-links/${kind}/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    const url = data.execute_url || data.review_url || '';
    if (url && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      alert(`Copied link: ${url}`);
      return;
    }
    alert(url || 'Link generated');
  }

  async function bootstrapAccessFromForm() {
    const payload = {
      work_email: document.getElementById('work-email')?.value || '',
      tc_imap_user: document.getElementById('tc-imap-user')?.value || '',
      tc_agent_name: document.getElementById('tc-agent-name')?.value || '',
      tc_agent_phone: document.getElementById('tc-agent-phone')?.value || '',
      tc_email_from: document.getElementById('tc-email-from')?.value || '',
      imap_password: document.getElementById('imap-password')?.value || '',
      glvar_username: document.getElementById('glvar-username')?.value || '',
      glvar_password: document.getElementById('glvar-password')?.value || '',
      exp_okta_username: document.getElementById('exp-okta-username')?.value || '',
      exp_okta_password: document.getElementById('exp-okta-password')?.value || '',
    };
    await api('/api/v1/tc/access/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    ['imap-password', 'glvar-password', 'exp-okta-password'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    await load();
  }

  async function seedKnownEnvDefaultsFromForm() {
    const payload = {
      work_email: document.getElementById('work-email')?.value || '',
      tc_imap_user: document.getElementById('tc-imap-user')?.value || '',
      tc_agent_name: document.getElementById('tc-agent-name')?.value || '',
      tc_agent_phone: document.getElementById('tc-agent-phone')?.value || '',
      tc_email_from: document.getElementById('tc-email-from')?.value || '',
    };
    await api('/api/v1/tc/access/seed-defaults', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function runInboxScan() {
    await api('/api/v1/tc/email/scan', {
      method: 'POST',
      body: JSON.stringify({})
    });
    await load();
  }

  async function runExecutedAgreementSearch() {
    const result = await api('/api/v1/tc/intake/email-search', {
      method: 'POST',
      body: JSON.stringify({ days: 90 })
    });
    alert(`Found ${result.found || 0} relevant email(s) in the inbox search.`);
    await load();
  }

  async function runAccessTest(kind) {
    const path = kind === 'glvar' ? '/api/v1/tc/test-glvar-login' : '/api/v1/tc/test-skyslope-login';
    const result = await api(path, {
      method: 'POST',
      body: JSON.stringify({ dryRun: true }),
    });
    lastWorkspaceTests = {
      ...(lastWorkspaceTests || {}),
      [kind]: {
        checked_at: new Date().toISOString(),
        ok: Boolean(result.ok),
        screenshots: result.screenshots || [],
      },
    };
    const node = document.getElementById('access-test-results');
    if (node) node.innerHTML = renderWorkspaceTests(lastWorkspaceTests);
  }

  async function markTriageHandled(id) {
    await api(`/api/v1/tc/email/triage/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Handled from TC intake workspace' }),
    });
    await load();
  }

  async function createTransactionFromTriage(id) {
    await api(`/api/v1/tc/email/triage/${id}/create-transaction`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await load();
  }

  async function linkTransactionFromTriage(id, transactionId) {
    if (!transactionId) throw new Error('Select a transaction first');
    await api(`/api/v1/tc/email/triage/${id}/link-transaction`, {
      method: 'POST',
      body: JSON.stringify({ transaction_id: Number(transactionId), actor: 'agent_portal' }),
    });
    await load();
  }

  async function runWorkspaceDocumentAction(mode) {
    const fileInput = document.getElementById('workspace-document');
    const file = fileInput?.files?.[0];
    if (!file) throw new Error('Choose a document first');

    const form = new FormData();
    form.append('document', file);
    form.append('doc_type', document.getElementById('workspace-doc-type')?.value || 'Transaction Document');
    form.append('address', document.getElementById('workspace-doc-address')?.value || '');
    if (mode === 'upload') form.append('dry_run', 'true');

    const path = mode === 'upload' ? '/api/v1/tc/intake/upload' : '/api/v1/tc/intake/validate';
    const result = await multipartApi(path, form);

    lastWorkspaceValidation = {
      mode,
      file_name: file.name,
      checked_at: new Date().toISOString(),
      result,
    };
    const node = document.getElementById('workspace-validation-results');
    if (node) node.innerHTML = renderWorkspaceValidation(lastWorkspaceValidation);
  }

  async function runWorkspaceIntake() {
    const payload = {
      address: document.getElementById('workspace-intake-address')?.value || '',
      days: Number(document.getElementById('workspace-intake-days')?.value || 90),
      dry_run: true,
    };
    const result = await api('/api/v1/tc/intake/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    lastWorkspaceIntakeRun = {
      checked_at: new Date().toISOString(),
      payload,
      result,
    };
    const node = document.getElementById('workspace-intake-results');
    if (node) node.innerHTML = renderWorkspaceIntakeRun(lastWorkspaceIntakeRun);
  }

  async function runPhotoPackageSend(dryRun) {
    const payload = {
      transaction_id: document.getElementById('workspace-photo-transaction')?.value || '',
      recipient_email: document.getElementById('workspace-photo-recipient-email')?.value || '',
      recipient_name: document.getElementById('workspace-photo-recipient-name')?.value || '',
      subject: document.getElementById('workspace-photo-subject')?.value || '',
      body: document.getElementById('workspace-photo-body')?.value || '',
      search: {
        subject_contains: document.getElementById('workspace-photo-subject-search')?.value || '',
        from_contains: document.getElementById('workspace-photo-from-search')?.value || '',
        filename_contains: document.getElementById('workspace-photo-filename-search')?.value || '',
        days: Number(document.getElementById('workspace-photo-days')?.value || 14),
      },
      combine_photos: true,
      attach_originals: Boolean(document.getElementById('workspace-photo-attach-originals')?.checked),
      dry_run: dryRun,
    };
    const result = await api('/api/v1/tc/email/send-attachment-package', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    lastPhotoPackageSend = {
      checked_at: new Date().toISOString(),
      dry_run: dryRun,
      result,
    };
    const node = document.getElementById('workspace-photo-results');
    if (node) node.innerHTML = renderPhotoPackageResult(lastPhotoPackageSend);
  }

  let listingSyncPollTimer = null;

  function formatListingSyncStepLine(s) {
    const bits = [s.at, s.label];
    if (s.message) bits.push(s.message);
    if (s.url) bits.push(s.url);
    if (s.via) bits.push(`via:${s.via}`);
    if (s.error) bits.push(`ERROR:${s.error}`);
    if (s.path) bits.push(s.path);
    return bits.filter(Boolean).join(' | ');
  }

  async function pollListingSyncJob(jobId, preEl) {
    const data = await api(`/api/v1/tc/browser-jobs/${jobId}`);
    const job = data.job;
    const text = (job.steps || []).map(formatListingSyncStepLine).join('\n');
    preEl.textContent = `${text}\n--- ${job.status} ---${job.error ? `\n${job.error}` : ''}`;

    if (job.status === 'completed' || job.status === 'failed') {
      if (listingSyncPollTimer) {
        clearInterval(listingSyncPollTimer);
        listingSyncPollTimer = null;
      }
    }
    return job;
  }

  async function startListingSyncJob(live) {
    const txId = document.getElementById('listing-sync-transaction')?.value || '';
    const search = document.getElementById('listing-sync-search')?.value?.trim() || '';
    const pre = document.getElementById('listing-sync-log');
    if (!txId) throw new Error('Select a transaction');
    if (!pre) return;

    pre.textContent = 'Starting…';
    const res = await api(`/api/v1/tc/transactions/${encodeURIComponent(txId)}/browser/listing-to-skyslope`, {
      method: 'POST',
      body: JSON.stringify({
        address_search: search,
        dry_run: !live,
        force_upload: false,
      }),
    });
    const jobId = res.job_id;

    if (listingSyncPollTimer) {
      clearInterval(listingSyncPollTimer);
      listingSyncPollTimer = null;
    }
    listingSyncPollTimer = setInterval(() => {
      pollListingSyncJob(jobId, pre).catch((e) => {
        pre.textContent += `\n${e.message}`;
      });
    }, 2000);

    await pollListingSyncJob(jobId, pre);
  }

  async function createDocRequestsFromValidation(transactionId) {
    if (!transactionId) throw new Error('Select a transaction first');
    const validation = lastWorkspaceValidation?.result?.validation;
    if (!validation) throw new Error('Run document validation first');
    const missingItems = validation.missing_items || [];
    if (!missingItems.length) throw new Error('No missing items to request');

    for (const item of missingItems) {
      await api(`/api/v1/tc/transactions/${transactionId}/document-requests`, {
        method: 'POST',
        body: JSON.stringify({
          title: `${validation.doc_type || 'Document'}: ${item}`,
          description: `Requested from workspace QA after validating ${validation.file_name || lastWorkspaceValidation?.file_name || 'document'}.`,
          requested_from: 'client',
          metadata: {
            source: 'workspace_validation',
            file_name: validation.file_name || lastWorkspaceValidation?.file_name || null,
            doc_type: validation.doc_type || null,
            missing_item: item,
          },
        }),
      });
    }
    await load();
  }

  function renderWorkspaceTests(results) {
    const entries = Object.entries(results || {});
    if (!entries.length) return '<p>No access tests run yet.</p>';
    return `
      <table>
        <thead><tr><th>Check</th><th>Status</th><th>Checked</th><th>Screenshots</th></tr></thead>
        <tbody>
          ${entries.map(([key, value]) => `
            <tr>
              <td>${escapeHtml(key)}</td>
              <td><span class="badge ${badgeClass(value.ok ? 'healthy' : 'red')}">${escapeHtml(value.ok ? 'ok' : 'failed')}</span></td>
              <td>${escapeHtml(value.checked_at || '')}</td>
              <td>${escapeHtml(String((value.screenshots || []).length))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function renderWorkspaceValidation(state) {
    if (!state?.result) return '<p>No validation run yet.</p>';
    const validation = state.result.validation || {};
    const checks = validation.checks || [];
    return `
      <div style="margin-bottom:10px">
        <strong>${escapeHtml(state.file_name || '')}</strong>
        <span class="badge ${badgeClass(validation.blocks_upload ? 'bad' : 'healthy')}">${escapeHtml(validation.blocks_upload ? 'blocked' : 'pass')}</span>
        <span style="margin-left:8px;color:#98a5c3">${escapeHtml(state.mode === 'upload' ? 'dry-run upload' : 'validate only')} · ${escapeHtml(state.checked_at || '')}</span>