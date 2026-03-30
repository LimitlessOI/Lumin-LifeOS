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
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
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
        try {
          const workspace = await api('/api/v1/tc/intake/workspace');
          renderWorkspace(workspace.workspace || workspace);
        } catch (err) {
          document.getElementById('app').innerHTML = `<div class="card error"><h2>Workspace load failed</h2><p>${escapeHtml(err.message)}</p></div>`;
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
    await api('/api/v1/tc/email/scan', { method: 'POST', body: JSON.stringify({}) });
    await load();
  }

  async function runExecutedAgreementSearch() {
    const result = await api('/api/v1/tc/intake/email-search', { method: 'POST', body: JSON.stringify({ days: 90 }) });
    alert(`Found ${result.found || 0} relevant email(s) in the inbox search.`);
    await load();
  }

  async function runAccessTest(kind) {
    const path = kind === 'glvar'
      ? '/api/v1/tc/test-glvar-login'
      : '/api/v1/tc/test-skyslope-login';
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
      </div>
      <p>${escapeHtml(validation.recommendation || '')}</p>
      <table>
        <thead><tr><th>Check</th><th>Status</th><th>Why</th></tr></thead>
        <tbody>
          ${checks.map((item) => `
            <tr>
              <td>${escapeHtml(item.label || item.id || '')}</td>
              <td><span class="badge ${badgeClass(item.passed ? 'healthy' : 'red')}">${escapeHtml(item.passed ? 'pass' : 'missing')}</span></td>
              <td>${escapeHtml(item.reason || '')}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No validation checks returned.</td></tr>'}
        </tbody>
      </table>
    `;
  }

  function renderWorkspaceIntakeRun(state) {
    if (!state?.result) return '<p>No intake run yet.</p>';
    const result = state.result || {};
    const matches = result.matches || result.emails || [];
    return `
      <div style="margin-bottom:10px">
        <strong>Dry-run intake</strong>
        <span class="badge ${badgeClass(result.ok ? 'healthy' : 'red')}">${escapeHtml(result.ok ? 'ok' : 'failed')}</span>
        <span style="margin-left:8px;color:#98a5c3">${escapeHtml(state.checked_at || '')}</span>
      </div>
      <div class="mini-grid" style="margin-bottom:12px">
        <div><span>Address</span><strong>${escapeHtml(state.payload?.address || 'any')}</strong></div>
        <div><span>Days</span><strong>${escapeHtml(String(state.payload?.days || 90))}</strong></div>
        <div><span>Matches</span><strong>${escapeHtml(String(matches.length || 0))}</strong></div>
        <div><span>Blocked</span><strong>${escapeHtml(String(Boolean(result.blocked)))}</strong></div>
      </div>
      <table>
        <thead><tr><th>Subject / File</th><th>From / Type</th><th>Status</th></tr></thead>
        <tbody>
          ${matches.slice(0, 10).map((item) => `
            <tr>
              <td>${escapeHtml(item.subject || item.filename || item.address || '')}</td>
              <td>${escapeHtml(item.from || item.docType || '')}</td>
              <td>${escapeHtml(item.message || item.status || (item.files ? `${item.files.length} file(s)` : 'matched'))}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No intake matches returned.</td></tr>'}
        </tbody>
      </table>
    `;
  }

  function renderPhotoPackageResult(state) {
    if (!state?.result) return '<p>No photo package run yet.</p>';
    const result = state.result || {};
    const sourceEmail = result.sourceEmail || {};
    const attachments = result.downloadedAttachments || [];
    return `
      <div style="margin-bottom:10px">
        <strong>${escapeHtml(state.dry_run ? 'Photo package dry run' : 'Photo package send')}</strong>
        <span class="badge ${badgeClass(result.ok ? 'healthy' : 'red')}">${escapeHtml(result.ok ? 'ok' : 'failed')}</span>
        <span style="margin-left:8px;color:#98a5c3">${escapeHtml(state.checked_at || '')}</span>
      </div>
      <div class="mini-grid" style="margin-bottom:12px">
        <div><span>Source email</span><strong>${escapeHtml(sourceEmail.subject || '—')}</strong></div>
        <div><span>From</span><strong>${escapeHtml(sourceEmail.from || '—')}</strong></div>
        <div><span>Attachments</span><strong>${escapeHtml(String(attachments.length))}</strong></div>
        <div><span>Combined PDF</span><strong>${escapeHtml(result.combinedAttachment?.filename || 'none')}</strong></div>
      </div>
      <table>
        <thead><tr><th>Attachment</th><th>Type</th><th>Bytes</th></tr></thead>
        <tbody>
          ${attachments.map((item) => `
            <tr>
              <td>${escapeHtml(item.filename || '')}</td>
              <td>${escapeHtml(item.contentType || '')}</td>
              <td>${escapeHtml(String(item.size || ''))}</td>
            </tr>
          `).join('') || '<tr><td colspan="3">No attachments downloaded.</td></tr>'}
        </tbody>
      </table>
      ${result.delivery ? `<p style="margin-top:12px">Delivery: <span class="badge ${badgeClass(result.delivery.success ? 'sent' : 'red')}">${escapeHtml(result.delivery.success ? 'sent' : (result.delivery.error || 'failed'))}</span></p>` : ''}
    `;
  }

  function normalizeParty(value) {
    if (!value) return null;
    if (typeof value === 'string') return { name: value, email: null, phone: null };
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = normalizeParty(item);
        if (normalized?.name || normalized?.email || normalized?.phone) return normalized;
      }
      return null;
    }
    return {
      name: value.name || value.full_name || null,
      email: value.email || value.client_email || null,
      phone: value.phone || value.mobile || value.cell || null,
    };
  }

  function getCounterpartyAgent(transaction) {
    const parties = transaction?.parties || {};
    const role = String(transaction?.agent_role || '').toLowerCase();
    if (role === 'listing') return normalizeParty(parties.buyer_agent || parties.agent);
    return normalizeParty(parties.listing_agent || parties.agent);
  }

  function getPrimaryClient(transaction) {
    const parties = transaction?.parties || {};
    const role = String(transaction?.agent_role || '').toLowerCase();
    if (role === 'listing') return normalizeParty(parties.seller || parties.client || parties.owner);
    return normalizeParty(parties.buyer || parties.client);
  }

  function formatPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return value || 'No phone on file';
  }

  function formatStageLabel(value) {
    const text = String(value || '').replace(/_/g, ' ').trim();
    if (!text) return 'Not set';
    return text.replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function formatDaysRemaining(value) {
    if (value == null || value === '') return 'No deadline';
    const days = Number(value);
    if (Number.isNaN(days)) return String(value);
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  function nextMorningIso() {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(7, 0, 0, 0);
    return next.toISOString();
  }

  function parseAddressDisplay(raw) {
    const text = String(raw || '').trim();
    if (!text) {
      return { number: '', street: '', cityLine: '', hasParts: false };
    }
    const segments = text.split(',').map((s) => s.trim()).filter(Boolean);
    const firstSegment = segments[0] || '';
    const cityLine = segments.slice(1).join(', ');
    const m = firstSegment.match(/^(\d+[A-Za-z\-]*)\s+(.+)$/);
    if (m) {
      return { number: m[1], street: m[2], cityLine, hasParts: true };
    }
    return { number: '', street: firstSegment || text, cityLine, hasParts: false };
  }

  function renderAddressBlock(address) {
    const p = parseAddressDisplay(address);
    if (p.hasParts && p.number) {
      return `
        <div class="tx-address-block">
          <div class="tx-address-row">
            <span class="tx-street-num">${escapeHtml(p.number)}</span>
            <span class="tx-street-name">${escapeHtml(p.street)}</span>
          </div>
          ${p.cityLine ? `<div class="tx-city-line">${escapeHtml(p.cityLine)}</div>` : ''}
        </div>`;
    }
    const head = p.street || 'Address pending';
    return `
      <div class="tx-address-block">
        <h3 class="tx-address">${escapeHtml(head)}</h3>
        ${p.cityLine ? `<div class="tx-city-line">${escapeHtml(p.cityLine)}</div>` : ''}
      </div>`;
  }

  function renderHeroAddress(address) {
    const p = parseAddressDisplay(address);
    if (p.hasParts && p.number) {
      return `
        <h1 class="hero-addr">
          <span class="hero-addr-row">
            <span class="hero-addr-num">${escapeHtml(p.number)}</span>
            <span class="hero-addr-street">${escapeHtml(p.street)}</span>
          </span>
          ${p.cityLine ? `<div class="hero-addr-city">${escapeHtml(p.cityLine)}</div>` : ''}
        </h1>`;
    }
    const head = p.street || address || 'Transaction';
    return `
      <h1 class="hero-addr">
        ${escapeHtml(head)}
        ${p.cityLine ? `<div class="hero-addr-city">${escapeHtml(p.cityLine)}</div>` : ''}
      </h1>`;
  }

  function renderWorkspaceCardChips(item, state) {
    const chips = [];
    const pa = Number(item.pending_approvals || 0);
    const oa = Number(item.open_operator_alerts || 0);
    const md = Number(item.missing_doc_count || 0);
    if (pa > 0) chips.push(`<span class="tx-chip bad">${pa} sign-off</span>`);
    if (oa > 0) chips.push(`<span class="tx-chip bad">${oa} alert${oa === 1 ? '' : 's'}</span>`);
    if (md > 0) chips.push(`<span class="tx-chip warn">${md} missing doc${md === 1 ? '' : 's'}</span>`);
    if (state.state === 'yellow' && !chips.length) {
      chips.push('<span class="tx-chip warn">Watch</span>');
    }
    if (!chips.length) return '';
    return `<div class="tx-chips">${chips.join('')}</div>`;
  }

  function deriveWorkspaceCardState(transaction) {
    const pendingApprovals = Number(transaction.pending_approvals || 0);
    const opAlerts = Number(transaction.open_operator_alerts || 0);
    const owner = String(transaction?.next_action_owner || '').toLowerCase();

    const youMustAct =
      owner === 'internal' ||
      pendingApprovals > 0 ||
      opAlerts > 0;

    if (youMustAct) {
      const parts = [];
      if (pendingApprovals > 0) parts.push(`${pendingApprovals} item(s) need your review or sign-off.`);
      if (opAlerts > 0) parts.push(`${opAlerts} open alert(s) need TC attention.`);
      if (owner === 'internal' && transaction?.next_action) parts.push(transaction.next_action);
      return {
        state: 'red',
        ringLabel: 'You',
        hoverSummary: parts.join(' ') || 'You (TC) need to take the next step on this file.',
      };
    }

    const waitingOn = String(transaction?.waiting_on || '').toLowerCase();
    const waitingOutsideTeam =
      waitingOn &&
      waitingOn !== 'none' &&
      waitingOn !== 'tc_team';

    if (
      (transaction?.blocker_count || 0) > 0 ||
      String(transaction?.health_status || '').toLowerCase() === 'red' ||
      String(transaction?.health_status || '').toLowerCase() === 'yellow' ||
      (transaction?.missing_doc_count || 0) > 0 ||
      waitingOutsideTeam
    ) {
      return {
        state: 'yellow',
        ringLabel: 'Watch',
        hoverSummary:
          transaction?.risk_flags?.[0] ||
          transaction?.next_action ||
          (waitingOutsideTeam
            ? `Waiting on ${formatStageLabel(waitingOn)} — no TC action until they move or you escalate.`
            : 'The system or another party is driving the next step — check in, but you may not need to act yet.'),
      };
    }

    return {
      state: 'green',
      ringLabel: 'OK',
      hoverSummary: 'No TC action needed right now. Open for routine status.',
    };
  }

  function deriveWorkspaceJumpSection(transaction, state) {
    if (Number(transaction.pending_approvals || 0) > 0) return 'approvals';
    if (Number(transaction.open_operator_alerts || 0) > 0) return 'alerts';
    if (state.state === 'yellow') return 'status';
    return '';
  }

  function buildTransactionActionLabel(transaction, state) {
    if (state.state === 'red') return 'Open — your action';
    if (state.state === 'yellow') return 'Open — review status';
    return 'Open file';
  }

  function renderTransactionCards(transactions) {
    if (!transactions.length) {
      return '<div class="card"><p>No active transactions yet.</p></div>';
    }

    return `<div class="tx-board">${transactions.map((item) => {
      const client = getPrimaryClient(item);
      const counterparty = getCounterpartyAgent(item);
      const state = deriveWorkspaceCardState(item);
      const hoverSummary = state.hoverSummary;
      const stage = formatStageLabel(item.stage || item.status);
      const nextAction = item.next_action || (state.state === 'green' ? 'No immediate action needed.' : 'Review this file.');
      const syncStatus = item.portal_sync_status?.transactionDesk || (item.transaction_desk_id ? 'linked' : 'pending');
      const primaryPhone = client?.phone || counterparty?.phone || '';
      const nearestContingency = (item.contingencies || []).find((contingency) => contingency.daysRemaining != null);
      const phoneMarkup = primaryPhone
        ? `<a class="tx-contact-phone" href="tel:${escapeHtml(String(primaryPhone).replace(/[^\d+]/g, ''))}">${escapeHtml(formatPhone(primaryPhone))}</a>`
        : `<span class="tx-contact-phone dim">${escapeHtml(formatPhone(primaryPhone))}</span>`;
      return `
        <div
          class="tx-card"
          data-open-tx="${escapeHtml(item.id)}"
          data-open-section="${escapeHtml(deriveWorkspaceJumpSection(item, state))}"
          title="${escapeHtml(hoverSummary)}"
          data-state="${escapeHtml(state.state)}"
          tabindex="0"
          role="button"
          aria-label="${escapeHtml(`Open ${item.address || `transaction ${item.id}`}: ${hoverSummary}`)}"
        >
          <div class="tx-card-head">
            <div>
              ${renderAddressBlock(item.address)}
              ${renderWorkspaceCardChips(item, state)}
            </div>
            <div class="tx-ring ${escapeHtml(state.state)}">${escapeHtml(state.ringLabel)}</div>
          </div>
          <div class="tx-contact">
            <div style="flex:1;min-width:0">
              <div class="tx-contact-line">
                <span class="tx-contact-name">${escapeHtml(client?.name || 'Client name missing')}</span>
                <span class="tx-contact-sep" aria-hidden="true">·</span>
                ${phoneMarkup}
              </div>
              <div class="tx-subline">${escapeHtml(counterparty?.name ? `Other side: ${counterparty.name}` : 'Counterparty not on file')}</div>
            </div>
          </div>
          <div class="tx-meta-grid">
            <div class="tx-meta-item"><span>Stage</span><strong>${escapeHtml(stage)}</strong></div>
            <div class="tx-meta-item"><span>Needs</span><strong>${escapeHtml(item.waiting_on ? formatStageLabel(item.waiting_on) : state.ringLabel)}</strong></div>
            <div class="tx-meta-item"><span>TransactionDesk</span><strong>${escapeHtml(formatStageLabel(syncStatus))}</strong></div>
            <div class="tx-meta-item"><span>${escapeHtml(nearestContingency?.label || 'Missing docs')}</span><strong>${escapeHtml(nearestContingency ? formatDaysRemaining(nearestContingency.daysRemaining) : String(item.missing_doc_count || 0))}</strong></div>
          </div>
          <div class="tx-summary">
            <span>What is happening now</span>
            <strong>${escapeHtml(nextAction)}</strong>
          </div>
          <div class="tx-hover">
            <strong style="display:block;margin-bottom:6px">${escapeHtml(state.state === 'red' ? 'Your move (TC)' : state.state === 'yellow' ? 'Watch / in progress' : 'All clear for you')}</strong>
            ${escapeHtml(hoverSummary)}
          </div>
          <div class="tx-actions">
            <span class="tx-open">${escapeHtml(buildTransactionActionLabel(item, state))}</span>
            <span class="badge ${badgeClass(state.state)}">${escapeHtml(state.state)}</span>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  }

  function getSetupFieldConfig(name) {
    const map = {
      TC_IMAP_USER: {
        fieldId: 'tc-imap-user',
        title: 'TC mailbox',
        guidance: 'Use the inbox where transaction emails actually arrive. For you, that should usually be adam@hopkinsgroup.org, not the system mailbox.',
      },
      TC_IMAP_APP_PASSWORD: {
        fieldId: 'imap-password',
        title: 'TC IMAP app password',
        guidance: 'For Google Workspace/Gmail, create an App Password on the mailbox account after 2-Step Verification is enabled, then paste it here.',
      },
      TC_AGENT_NAME: {
        fieldId: 'tc-agent-name',
        title: 'Agent display name',
        guidance: 'This is the human name the TC emails should show. Usually Adam Hopkins.',
      },
      TC_AGENT_PHONE: {
        fieldId: 'tc-agent-phone',
        title: 'Outbound phone',
        guidance: 'Use the phone number you want shown in TC communications.',
      },
      EMAIL_WEBHOOK_SECRET: {
        fieldId: null,
        title: 'Email webhook secret',
        guidance: 'Optional. Only needed if you want inbound Postmark webhook validation. Safe to skip for now.',
      },
      TWILIO_WEBHOOK_SECRET: {
        fieldId: null,
        title: 'Twilio webhook secret',
        guidance: 'Optional. Only needed for inbound Twilio callback validation. Safe to skip for now.',
      },
      ASANA_ACCESS_TOKEN: {
        fieldId: null,
        title: 'Asana token',
        guidance: 'Optional. Only needed if you want Asana sync. Safe to skip for now.',
      },
      ASANA_TC_PROJECT_GID: {
        fieldId: null,
        title: 'Asana project',
        guidance: 'Optional. Only needed if you want Asana sync. Safe to skip for now.',
      },
      glvar_mls: {
        fieldId: 'glvar-username',
        title: 'GLVAR / TransactionDesk login',
        guidance: 'Use your Clareity/GLVAR login. Username goes in GLVAR username, password goes in GLVAR password.',
      },
      exp_okta: {
        fieldId: 'exp-okta-username',
        title: 'eXp Okta login',
        guidance: 'Use your eXp Okta username/password. This is what unlocks SkySlope and BoldTrail through SSO.',
      },
    };
    return map[name] || {
      fieldId: null,
      title: name,
      guidance: 'Review this setup item and enter the missing value if it is required for your workflow.',
    };
  }

  function buildMissingSetupItems(readiness, envTemplate, vault) {
    const requiredEnvNames = ['TC_IMAP_USER', 'TC_IMAP_APP_PASSWORD', 'TC_AGENT_NAME', 'TC_AGENT_PHONE'];
    const optionalEnvNames = ['EMAIL_WEBHOOK_SECRET', 'TWILIO_WEBHOOK_SECRET', 'ASANA_ACCESS_TOKEN', 'ASANA_TC_PROJECT_GID'];

    const items = [];
    const seen = new Set();

    envTemplate.forEach((item) => {
      if (seen.has(item.name)) return;
      if (item.known) return;
      if (![...requiredEnvNames, ...optionalEnvNames].includes(item.name)) return;
      const config = getSetupFieldConfig(item.name);
      items.push({
        name: item.name,
        label: config.title,
        required: requiredEnvNames.includes(item.name),
        fieldId: config.fieldId,
        guidance: config.guidance,
      });
      seen.add(item.name);
    });

    (vault || []).forEach((item) => {
      if (item.present || seen.has(item.service)) return;
      const config = getSetupFieldConfig(item.service);
      items.push({
        name: item.service,
        label: config.title,
        required: true,
        fieldId: config.fieldId,
        guidance: config.guidance,
      });
      seen.add(item.service);
    });

    return items;
  }

  function renderMissingSetupItems(items) {
    if (!items.length) {
      return '<p>No required setup items are missing. Raw env/vault details stay hidden unless you ask for them.</p>';
    }
    return `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${items.map((item, idx) => `
          <button
            type="button"
            class="ghost"
            data-missing-setup="${escapeHtml(item.name)}"
            style="text-align:left;padding:14px;border-radius:12px"
          >
            <div style="display:flex;justify-content:space-between;gap:16px;align-items:center">
              <strong>${escapeHtml(item.label)}</strong>
              <span class="badge ${badgeClass(item.required ? 'red' : 'review')}">${escapeHtml(item.required ? 'missing' : 'optional')}</span>
            </div>
            <div style="margin-top:6px;color:#98a5c3">${escapeHtml(item.guidance)}</div>
          </button>
          <div id="missing-setup-help-${idx}" style="display:none;margin:-2px 0 6px 0;padding:12px 14px;background:#141c31;border:1px solid #2d3b5f;border-radius:10px;color:#c8d4f0">
            ${escapeHtml(item.guidance)}
            ${item.fieldId ? `<div style="margin-top:8px"><button type="button" class="ghost" data-focus-field="${escapeHtml(item.fieldId)}">Open input</button></div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderWorkspace(data) {
    const root = document.getElementById('app');
    const readiness = data.readiness || {};
    const readinessSummary = readiness.readiness || {};
    const envTemplate = readiness.env_template || [];
    const managedEnvPlan = readiness.managed_env?.plan || [];
    const vault = readiness.vault || [];
    const intakeQueue = data.intake_queue || [];
    const transactions = data.active_transactions || [];
    const recentActivity = data.recent_activity || [];
    const missingSetupItems = buildMissingSetupItems(readiness, envTemplate, vault);
    const transactionMap = Object.fromEntries(transactions.map((item) => [String(item.id), item]));
    const txOptions = transactions.map((item) => ({
      id: item.id,
      label: `${item.address || `Transaction #${item.id}`} (${item.stage || item.status || 'pending'})`,
    }));

    const readinessCards = [
      { label: 'IMAP', value: readinessSummary.imap_ready ? 'Ready' : 'Missing', status: readinessSummary.imap_ready ? 'ok' : 'bad' },
      { label: 'GLVAR / TransactionDesk', value: readinessSummary.glvar_ready ? 'Ready' : 'Missing', status: readinessSummary.glvar_ready ? 'ok' : 'bad' },
      { label: 'SkySlope', value: readinessSummary.skyslope_ready ? 'Ready' : 'Missing', status: readinessSummary.skyslope_ready ? 'ok' : 'bad' },
      { label: 'Actionable emails', value: data.summary?.actionable_emails || 0, status: (data.summary?.actionable_emails || 0) > 0 ? 'warn' : 'ok' },
    ];

    const envRows = (readiness.env || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td><span class="badge ${badgeClass(item.present ? 'healthy' : 'red')}">${escapeHtml(item.present ? 'set' : 'missing')}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="3">No env info available.</td></tr>';

    const vaultRows = vault.map((item) => `
      <tr>
        <td>${escapeHtml(item.service)}</td>
        <td>${escapeHtml(item.key || '')}</td>
        <td><span class="badge ${badgeClass(item.present ? 'healthy' : 'red')}">${escapeHtml(item.present ? 'stored' : 'missing')}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="3">No vault credentials tracked yet.</td></tr>';

    const templateRows = envTemplate.map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.description || '')}</td>
        <td>${item.secret ? (item.known ? '<em>already set in environment</em>' : '<em>leave blank until you enter it</em>') : escapeHtml(item.value || '')}</td>
        <td><span class="badge ${badgeClass(item.known ? 'healthy' : 'review')}">${escapeHtml(item.known ? 'known' : item.secret ? 'needs secret' : 'needs value')}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4">No env template available.</td></tr>';

    const managedEnvRows = managedEnvPlan.map((item) => `
      <tr>
        <td>${escapeHtml(item.envName)}</td>
        <td>${escapeHtml(item.currentPresent ? 'present' : 'missing')}</td>
        <td>${escapeHtml(item.same ? 'in sync' : item.action || 'review')}</td>
        <td>${escapeHtml(item.maskedCurrent || item.maskedDesired || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No managed env snapshot available.</td></tr>';

    const queueRows = intakeQueue.map((item) => {
      const matchCandidates = item.match_candidates || [];
      const defaultTransactionId = item.suggested_transaction?.transaction_id || '';
      const selectOptions = [
        { id: '', label: 'Select transaction' },
        ...txOptions,
      ];
      const candidateSummary = matchCandidates.length > 1
        ? `<div style="margin-top:6px;color:#98a5c3;font-size:12px">Also matches: ${matchCandidates.slice(1).map((candidate) => `${escapeHtml(candidate.address)} (${escapeHtml(candidate.confidence)})`).join(', ')}</div>`
        : '';
      return `
      <tr>
        <td>${escapeHtml(item.received_at || '')}</td>
        <td>${escapeHtml(item.subject || '')}</td>
        <td><span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category || '')}</span></td>
        <td>${item.suggested_transaction ? `<a href="/tc/agent-portal.html?tx=${encodeURIComponent(item.suggested_transaction.transaction_id)}">${escapeHtml(item.suggested_transaction.address)}</a> <span class="badge ${badgeClass(item.suggested_transaction.confidence)}">${escapeHtml(item.suggested_transaction.confidence)}</span>${candidateSummary}` : '—'}</td>
        <td>${escapeHtml(item.next_step || '')}${item.preview_text ? `<div style="margin-top:6px;color:#98a5c3;font-size:12px">${escapeHtml(item.preview_text)}</div>` : ''}</td>
        <td>
          <div class="row-actions">
            <select data-triage-select="${item.id}">
              ${selectOptions.map((option) => `<option value="${escapeHtml(option.id)}" ${String(option.id) === String(defaultTransactionId) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
            </select>
            <button data-triage-link="${item.id}" class="ghost">Link selected</button>
            ${item.category === 'tc_contract' && !item.suggested_transaction ? `<button data-triage-create="${item.id}">Create transaction</button>` : ''}
            <button data-triage-handle="${item.id}" class="ghost">${item.actioned_at ? 'Handled' : 'Mark handled'}</button>
          </div>
        </td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="6">No actionable triage items.</td></tr>';

    const activityRows = recentActivity.map((item) => `
      <tr>
        <td>${escapeHtml(item.created_at || '')}</td>
        <td>${escapeHtml(item.event_type || '')}</td>
        <td><a href="/tc/agent-portal.html?tx=${encodeURIComponent(item.transaction_id)}">${escapeHtml(item.address || '')}</a></td>
        <td>${escapeHtml(item.payload?.subject || item.payload?.transactionDeskId || item.payload?.error || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No intake activity yet.</td></tr>';

    root.innerHTML = `
      <div class="hero">
        <div>
          <div class="eyebrow">TC Intake Workspace</div>
          <h1>Transaction Intake Control</h1>
          <p>Readiness, inbox triage, and first-file routing before live filing runs.</p>
        </div>
        <div class="card">
          <label>Command key</label>
          <input id="api-key" type="password" value="${escapeHtml(getApiKey())}" placeholder="x-api-key">
          <div class="row-actions" style="margin-top:10px">
            <button id="save-api-key">Save key</button>
            <button id="scan-inbox" class="ghost">Run inbox scan</button>
            <button id="search-agreements" class="ghost">Search agreements</button>
          </div>
        </div>
      </div>

      <div class="grid four">
        ${readinessCards.map((item) => `<div class="card stat"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></div>`).join('')}
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Access Setup</h2>
          <div class="grid two">
            <div>
              <label>Work email</label>
              <input id="work-email" value="${escapeHtml(readiness.bootstrap_defaults?.WORK_EMAIL || '')}" placeholder="adam@hopkinsgroup.org">
            </div>
            <div>
              <label>TC IMAP user</label>
              <input id="tc-imap-user" value="${escapeHtml(readiness.bootstrap_defaults?.TC_IMAP_USER || '')}" placeholder="adam@hopkinsgroup.org">
            </div>
            <div>
              <label>TC agent name</label>
              <input id="tc-agent-name" value="${escapeHtml(readiness.bootstrap_defaults?.TC_AGENT_NAME || '')}" placeholder="Adam Hopkins">
            </div>
            <div>
              <label>TC agent phone</label>
              <input id="tc-agent-phone" value="${escapeHtml(readiness.bootstrap_defaults?.TC_AGENT_PHONE || '')}" placeholder="702-555-1212">
            </div>
            <div>
              <label>TC email from</label>
              <input id="tc-email-from" value="${escapeHtml(readiness.bootstrap_defaults?.TC_EMAIL_FROM || '')}" placeholder="adam@hopkinsgroup.org">
            </div>
            <div>
              <label>IMAP app password</label>
              <input id="imap-password" type="password" placeholder="App password">
            </div>
            <div>
              <label>GLVAR username</label>
              <input id="glvar-username" placeholder="GLVAR login">
            </div>
            <div>
              <label>GLVAR password</label>
              <input id="glvar-password" type="password" placeholder="GLVAR password">
            </div>
            <div>
              <label>eXp Okta username</label>
              <input id="exp-okta-username" placeholder="adam.hopkins@exprealty.com">
            </div>
            <div>
              <label>eXp Okta password</label>
              <input id="exp-okta-password" type="password" placeholder="Okta password">
            </div>
          </div>
          <div class="row-actions" style="margin-top:12px">
            <button id="seed-known-envs" class="ghost">Seed known envs</button>
            <button id="bootstrap-access">Save access</button>
          </div>
          <p><strong>Next actions:</strong> ${(data.next_actions || []).map((item) => escapeHtml(item)).join(' | ') || 'None'}</p>
        </div>

        <div class="card">
          <h2>Fix What Is Missing</h2>
          <p>Only missing or optional setup items show here. Raw env details stay hidden unless you open Advanced details.</p>
          <div class="row-actions" style="margin-bottom:12px">
            <button id="test-glvar" class="ghost">Test GLVAR</button>
            <button id="test-skyslope" class="ghost">Test SkySlope</button>
          </div>
          <div id="access-test-results">${renderWorkspaceTests(lastWorkspaceTests)}</div>
          <div id="missing-setup-items">${renderMissingSetupItems(missingSetupItems)}</div>
          <details style="margin-top:16px">
            <summary style="cursor:pointer;color:#98a5c3">Advanced details</summary>
            <div style="margin-top:12px">
              <table><thead><tr><th>Env</th><th>Purpose</th><th>Status</th></tr></thead><tbody>${envRows}</tbody></table>
              <h2 style="margin-top:16px">Env Template</h2>
              <table><thead><tr><th>Name</th><th>Purpose</th><th>Value to seed</th><th>Status</th></tr></thead><tbody>${templateRows}</tbody></table>
              <h2 style="margin-top:16px">Managed Env Snapshot</h2>
              <table><thead><tr><th>Name</th><th>Runtime</th><th>Sync</th><th>Masked value</th></tr></thead><tbody>${managedEnvRows}</tbody></table>
              <h2 style="margin-top:16px">Vault Credentials</h2>
              <table><thead><tr><th>Service</th><th>Key</th><th>Status</th></tr></thead><tbody>${vaultRows}</tbody></table>
            </div>
          </details>
        </div>
      </div>

      <div class="card">
        <h2>Manual Document QA</h2>
        <div class="grid two">
          <div>
            <label>Document</label>
            <input id="workspace-document" type="file" />
          </div>
          <div>
            <label>Document type</label>
            <input id="workspace-doc-type" value="Executed RPA" placeholder="Executed RPA">
          </div>
          <div>
            <label>Expected property address</label>
            <input id="workspace-doc-address" placeholder="6453 Mahogany Peak Ave, Las Vegas, NV" />
          </div>
        </div>
        <div class="row-actions" style="margin-top:12px">
          <button id="workspace-validate-doc">Validate document</button>
          <button id="workspace-dry-upload" class="ghost">Dry-run upload</button>
          <select id="workspace-validation-transaction">
            <option value="">Select transaction for doc requests</option>
            ${txOptions.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`).join('')}
          </select>
          <button id="workspace-create-doc-requests" class="ghost">Create doc requests</button>
        </div>
        <div id="workspace-validation-results">${renderWorkspaceValidation(lastWorkspaceValidation)}</div>
      </div>

      <div class="card">
        <h2>Dry-Run Intake</h2>
        <div class="grid two">
          <div>
            <label>Target property address</label>
            <input id="workspace-intake-address" placeholder="6453 Mahogany Peak Ave, Las Vegas, NV" />
          </div>
          <div>
            <label>Lookback days</label>
            <input id="workspace-intake-days" type="number" min="1" max="365" value="90" />
          </div>
        </div>
        <div class="row-actions" style="margin-top:12px">
          <button id="workspace-run-intake">Run dry intake</button>
        </div>
        <div id="workspace-intake-results">${renderWorkspaceIntakeRun(lastWorkspaceIntakeRun)}</div>
      </div>

      <div class="card">
        <h2>Photo Package Email</h2>
        <p>Find a matching email, combine photo attachments into one PDF, and send it to the buyer's agent.</p>
        <div class="grid two">
          <div>
            <label>Transaction</label>
            <select id="workspace-photo-transaction">
              <option value="">Optional transaction for logging</option>
              ${txOptions.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label>Lookback days</label>
            <input id="workspace-photo-days" type="number" min="1" max="365" value="14" />
          </div>
          <div>
            <label>Email subject contains</label>
            <input id="workspace-photo-subject-search" placeholder="6453 Mahogany Peak or SRPD" />
          </div>
          <div>
            <label>Email from contains</label>
            <input id="workspace-photo-from-search" placeholder="inspector, listing agent, escrow" />
          </div>
          <div>
            <label>Attachment filename contains</label>
            <input id="workspace-photo-filename-search" placeholder="photo, srpd, inspection" />
          </div>
          <div>
            <label>Buyer agent email</label>
            <input id="workspace-photo-recipient-email" placeholder="buyeragent@example.com" />
          </div>
          <div>
            <label>Buyer agent name</label>
            <input id="workspace-photo-recipient-name" placeholder="Buyer Agent" />
          </div>
          <div>
            <label>Email subject</label>
            <input id="workspace-photo-subject" value="SRPD photo package" />
          </div>
        </div>
        <div style="margin-top:12px">
          <label>Email body</label>
          <textarea id="workspace-photo-body" rows="5">Attached is the combined photo package for the SRPDs. Please confirm receipt.</textarea>
        </div>
        <div class="row-actions" style="margin-top:12px">
          <label style="display:flex;align-items:center;gap:8px"><input id="workspace-photo-attach-originals" type="checkbox"> Attach original files too</label>
          <button id="workspace-photo-srpd-preset" class="ghost">Use SRPD preset</button>
          <button id="workspace-photo-dry-run" class="ghost">Find and preview</button>
          <button id="workspace-photo-send">Combine and send</button>
        </div>
        <div id="workspace-photo-results">${renderPhotoPackageResult(lastPhotoPackageSend)}</div>
      </div>

      <div class="card">
        <h2>Inbox Intake Queue</h2>
        <table><thead><tr><th>Received</th><th>Subject</th><th>Category</th><th>Suggested transaction</th><th>Next step</th><th>Action</th></tr></thead><tbody>${queueRows}</tbody></table>
      </div>

      <div class="card">
        <h2>Active Transactions</h2>
        <p><strong>Red ring</strong> = you (TC) must act (approval, alert, or internal next step). <strong>Yellow</strong> = watch—other party, missing items, or non-blocking follow-ups. <strong>Green</strong> = nothing queued for you. Cards show street number, street name, city line, client and phone on one line, and chips for sign-offs/alerts/missing docs. Hover for the brief; click to open the file on approvals, alerts, or status.</p>
        ${renderTransactionCards(transactions)}
      </div>

      <div class="card">
        <h2>Recent Intake Activity</h2>
        <table><thead><tr><th>When</th><th>Event</th><th>Transaction</th><th>Detail</th></tr></thead><tbody>${activityRows}</tbody></table>
      </div>
    `;

    document.getElementById('save-api-key')?.addEventListener('click', () => {
      setApiKey(document.getElementById('api-key')?.value || '');
      alert('Command key saved.');
    });
    document.getElementById('bootstrap-access')?.addEventListener('click', async () => {
      try {
        await bootstrapAccessFromForm();
        alert('TC access saved.');
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('seed-known-envs')?.addEventListener('click', async () => {
      try {
        await seedKnownEnvDefaultsFromForm();
        alert('Known TC env defaults seeded. Secret values remain for manual entry.');
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('scan-inbox')?.addEventListener('click', async () => {
      try {
        await runInboxScan();
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('search-agreements')?.addEventListener('click', async () => {
      try {
        await runExecutedAgreementSearch();
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('test-glvar')?.addEventListener('click', async () => {
      try {
        await runAccessTest('glvar');
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('test-skyslope')?.addEventListener('click', async () => {
      try {
        await runAccessTest('skyslope');
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-validate-doc')?.addEventListener('click', async () => {
      try {
        await runWorkspaceDocumentAction('validate');
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-dry-upload')?.addEventListener('click', async () => {
      try {
        await runWorkspaceDocumentAction('upload');
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-create-doc-requests')?.addEventListener('click', async () => {
      try {
        const transactionId = document.getElementById('workspace-validation-transaction')?.value || '';
        await createDocRequestsFromValidation(transactionId);
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-run-intake')?.addEventListener('click', async () => {
      try {
        await runWorkspaceIntake();
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-photo-dry-run')?.addEventListener('click', async () => {
      try {
        await runPhotoPackageSend(true);
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-photo-send')?.addEventListener('click', async () => {
      try {
        await runPhotoPackageSend(false);
      } catch (err) {
        alert(err.message);
      }
    });
    document.getElementById('workspace-photo-transaction')?.addEventListener('change', () => {
      const tx = transactionMap[String(document.getElementById('workspace-photo-transaction')?.value || '')];
      if (!tx) return;
      const counterparty = getCounterpartyAgent(tx);
      const recipientEmail = document.getElementById('workspace-photo-recipient-email');
      const recipientName = document.getElementById('workspace-photo-recipient-name');
      const subjectSearch = document.getElementById('workspace-photo-subject-search');
      if (recipientEmail && !recipientEmail.value && counterparty?.email) recipientEmail.value = counterparty.email;
      if (recipientName && !recipientName.value && counterparty?.name) recipientName.value = counterparty.name;
      if (subjectSearch && !subjectSearch.value && tx.address) subjectSearch.value = tx.address;
    });
    document.getElementById('workspace-photo-srpd-preset')?.addEventListener('click', () => {
      const tx = transactionMap[String(document.getElementById('workspace-photo-transaction')?.value || '')];
      const counterparty = getCounterpartyAgent(tx || {});
      const address = tx?.address || '';
      const recipientEmail = document.getElementById('workspace-photo-recipient-email');
      const recipientName = document.getElementById('workspace-photo-recipient-name');
      const subjectSearch = document.getElementById('workspace-photo-subject-search');
      const filenameSearch = document.getElementById('workspace-photo-filename-search');
      const emailSubject = document.getElementById('workspace-photo-subject');
      const emailBody = document.getElementById('workspace-photo-body');
      const fromSearch = document.getElementById('workspace-photo-from-search');

      if (recipientEmail && counterparty?.email) recipientEmail.value = counterparty.email;
      if (recipientName && counterparty?.name) recipientName.value = counterparty.name;
      if (subjectSearch) subjectSearch.value = address || subjectSearch.value;
      if (filenameSearch) filenameSearch.value = 'srpd';
      if (fromSearch && !fromSearch.value && counterparty?.email) fromSearch.value = '';
      if (emailSubject) emailSubject.value = `SRPD package${address ? ` for ${address}` : ''}`;
      if (emailBody) {
        emailBody.value = [
          `Attached is the SRPD photo package${address ? ` for ${address}` : ''}.`,
          '',
          'Please confirm receipt.',
          '',
          'Thank you,',
          'Adam Hopkins',
        ].join('\n');
      }
    });
    root.querySelectorAll('[data-missing-setup]').forEach((button, idx) => {
      button.addEventListener('click', () => {
        const help = document.getElementById(`missing-setup-help-${idx}`);
        if (help) {
          help.style.display = help.style.display === 'none' ? 'block' : 'none';
        }
      });
    });
    root.querySelectorAll('[data-focus-field]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.focusField);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.focus();
        }
      });
    });
    root.querySelectorAll('[data-triage-handle]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (button.textContent === 'Handled') return;
        try {
          await markTriageHandled(button.dataset.triageHandle);
        } catch (err) {
          alert(err.message);
        }
      });
    });
    root.querySelectorAll('[data-triage-create]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await createTransactionFromTriage(button.dataset.triageCreate);
        } catch (err) {
          alert(err.message);
        }
      });
    });
    root.querySelectorAll('[data-triage-link]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const select = root.querySelector(`[data-triage-select="${button.dataset.triageLink}"]`);
          await linkTransactionFromTriage(button.dataset.triageLink, select?.value || '');
        } catch (err) {
          alert(err.message);
        }
      });
    });
    root.querySelectorAll('[data-open-tx]').forEach((card) => {
      const openTransaction = () => {
        const txId = card.dataset.openTx;
        const section = card.dataset.openSection;
        if (!txId) return;
        window.location.href = `/tc/agent-portal.html?tx=${encodeURIComponent(txId)}${section ? `#${encodeURIComponent(section)}` : ''}`;
      };
      card.addEventListener('click', openTransaction);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openTransaction();
        }
      });
    });
    root.querySelectorAll('.tx-contact-phone').forEach((link) => {
      link.addEventListener('click', (event) => event.stopPropagation());
    });
  }

  function derivePortalTodoList(data, approvals, alerts, inspectionStatus) {
    const todos = [];
    const status = data.status || {};
    const documentRequests = data.requested_documents || data.document_requests || [];

    if ((inspectionStatus?.contingency_days_remaining ?? null) != null) {
      const days = inspectionStatus.contingency_days_remaining;
      todos.push({
        id: 'inspection',
        title: 'Inspection contingency clock',
        owner: days <= 0 ? 'You (TC)' : days <= 2 ? 'You (TC) soon' : 'System',
        urgency: days <= 0 ? 'red' : days <= 2 ? 'yellow' : 'green',
        dueLabel: formatDaysRemaining(days),
        summary: days <= 0
          ? 'Inspection contingency is due now or overdue. Review the inspection file immediately.'
          : 'This deadline needs to stay visible until the inspection response path is complete.',
        actionLabel: 'Review inspection deadline',
        jumpSection: 'status',
      });
    }

    approvals.forEach((item) => {
      todos.push({
        id: `approval-${item.id}`,
        title: item.title || 'Approval needed',
        owner: 'You (TC)',
        urgency: 'red',
        dueLabel: item.due_at || 'Needs review',
        summary: item.summary || 'Review, change if needed, then approve or reject.',
        actionLabel: 'Open approvals',
        jumpSection: 'approvals',
      });
    });

    alerts.forEach((item) => {
      todos.push({
        id: `alert-${item.id}`,
        title: item.title || 'Alert',
        owner: item.status === 'snoozed' ? 'Snoozed' : 'Escalation',
        urgency: item.severity === 'critical' || item.severity === 'urgent' ? 'red' : 'yellow',
        dueLabel: item.next_escalation_at || 'Watching now',
        summary: item.summary || 'Acknowledge, resolve, or snooze after you have handled the underlying work.',
        actionLabel: 'Open alerts',
        jumpSection: 'alerts',
      });
    });

    documentRequests
      .filter((item) => item.status !== 'complete')
      .slice(0, 3)
      .forEach((item) => {
        todos.push({
          id: `doc-${item.id}`,
          title: item.title || 'Document needed',
          owner: /buyer|seller|client/i.test(item.requested_from || '') ? 'Client side' : 'TC team',
          urgency: /buyer|seller|client/i.test(item.requested_from || '') ? 'yellow' : 'green',
          dueLabel: item.due_at || 'No due date',
          summary: item.description || 'This document request is still open.',
          actionLabel: 'Open document review',
          jumpSection: 'requested-documents',
        });
      });

    if (!todos.length && status.next_action) {
      const internal = String(status.next_action_owner || '').toLowerCase() === 'internal';
      todos.push({
        id: 'next-action',
        title: 'Next file action',
        owner: internal ? 'You (TC)' : 'Other party / automation',
        urgency: internal ? 'red' : 'yellow',
        dueLabel: status.next_client_update_due_at || 'No hard due date',
        summary: status.next_action,
        actionLabel: 'Open status',
        jumpSection: 'status',
      });
    }

    return todos;
  }

  function renderTodoList(items) {
    if (!items.length) return '<p>No active file todo items right now.</p>';
    return `<div class="todo-list">${items.map((item) => `
      <div class="todo-item" data-urgency="${escapeHtml(item.urgency)}">
        <div class="todo-head">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div style="margin-top:6px;color:#98a5c3">${escapeHtml(item.summary || '')}</div>
          </div>
          <div class="todo-meta">
            <span class="todo-owner">${escapeHtml(item.owner || 'System')}</span>
            <span class="badge ${badgeClass(item.urgency)}">${escapeHtml(item.urgency)}</span>
          </div>
        </div>
        <div class="row-actions">
          <span class="tx-open">${escapeHtml(item.dueLabel || '')}</span>
          <button type="button" class="${item.urgency === 'red' ? '' : 'ghost'}" data-jump-section="${escapeHtml(item.jumpSection || 'status')}">${escapeHtml(item.actionLabel || 'Open')}</button>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderCountdownBanner(status, inspectionStatus) {
    const cards = [];
    if ((inspectionStatus?.contingency_days_remaining ?? null) != null) {
      const days = inspectionStatus.contingency_days_remaining;
      cards.push({
        label: 'Inspection due diligence',
        value: formatDaysRemaining(days),
        detail: inspectionStatus.inspection_contingency_deadline || 'No deadline on file',
        state: days <= 0 ? 'red' : days <= 2 ? 'yellow' : 'green',
      });
    }
    if ((status?.days_to_close ?? null) != null) {
      const days = Number(status.days_to_close);
      cards.push({
        label: 'Close of escrow',
        value: formatDaysRemaining(days),
        detail: days < 0 ? 'Close date has passed' : 'Closing countdown',
        state: days < 0 ? 'red' : days <= 7 ? 'yellow' : 'green',
      });
    }
    if (!cards.length) return '';
    return `<div class="countdown-banner">${cards.map((item) => `
      <div class="countdown-card ${escapeHtml(item.state)}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
        <div>${escapeHtml(item.detail)}</div>
      </div>
    `).join('')}</div>`;
  }

  function getApprovalDraftBody(item) {
    const pa = item?.prepared_action;
    if (pa == null) return '';
    if (typeof pa === 'string') return pa;
    try {
      return (
        pa.body ||
        pa.email_body ||
        pa.text ||
        pa.content ||
        pa.message ||
        JSON.stringify(pa, null, 2)
      );
    } catch {
      return String(pa);
    }
  }

  function renderOverview(data, reports, approvals, interactions, inspectionStatus = null) {
    const root = document.getElementById('app');
    const isClient = data.view === 'client';
    const tx = data.transaction || {};
    const status = data.status || {};
    const recentReports = reports.slice(0, 3);
    const alerts = data.alerts || [];
    const interactionRows = interactions.map((item) => `
      <tr>
        <td>${escapeHtml(item.interaction_type)}</td>
        <td>${escapeHtml(item.contact_name || item.contact_role || '')}</td>
        <td><span class="badge ${badgeClass(item.recording_allowed ? 'healthy' : 'watch')}">${escapeHtml(item.recording_mode || 'notes_only')}</span></td>
        <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status || '')}</span></td>
        <td>${escapeHtml(item.summary || (Array.isArray(item.next_actions) ? item.next_actions[0] : '') || '')}</td>
        <td>${escapeHtml(item.started_at || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="6">No interactions recorded</td></tr>';
    const approvalRows = approvals.map((item) => {
      const draft = getApprovalDraftBody(item);
      return `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="badge ${badgeClass(item.priority)}">${escapeHtml(item.priority)}</span></td>
        <td>${escapeHtml(item.summary || '')}</td>
        <td>${escapeHtml(item.due_at || '')}</td>
        <td>
          <div class="row-actions">
            <button data-approval="${item.id}" data-action="approve">Approve / sign off</button>
            <button data-approval="${item.id}" data-action="snooze">Snooze</button>
            <button data-approval-link="${item.id}" data-action="approve" class="ghost">Copy link</button>
            <button data-approval="${item.id}" data-action="reject" class="ghost">Reject</button>
          </div>
        </td>
      </tr>
      <tr class="approval-expand" data-approval-expand="${item.id}">
        <td colspan="5">
          <details>
            <summary>Review &amp; edit before you sign off</summary>
            <label>Summary (what you are approving)</label>
            <textarea data-field="summary" data-approval-id="${item.id}" rows="3">${escapeHtml(item.summary || '')}</textarea>
            <label>Draft body / notes (stored on the approval record)</label>
            <textarea data-field="body" data-approval-id="${item.id}" rows="8">${escapeHtml(draft)}</textarea>
            <div class="row-actions" style="margin-top:10px">
              <button type="button" class="ghost" data-save-approval="${item.id}">Save edits</button>
            </div>
          </details>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">No pending approvals</td></tr>';
    const alertRows = alerts.map((item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="badge ${badgeClass(item.severity)}">${escapeHtml(item.severity)}</span></td>
        <td>${escapeHtml(item.summary || '')}</td>
        <td>${escapeHtml(item.next_escalation_at || '')}</td>
        <td>
          <div class="row-actions">
            <button data-alert="${item.id}" data-action="acknowledge">Ack</button>
            <button data-alert="${item.id}" data-action="resolve">Resolve</button>
            <button data-alert="${item.id}" data-action="snooze" data-snooze-mode="morning" class="ghost">Deal in morning</button>
            <button data-alert-link="${item.id}" data-action="acknowledge" class="ghost">Link</button>
            <button data-alert="${item.id}" data-action="snooze" class="ghost">Snooze</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5">No active alerts</td></tr>';

    const documentRows = (data.requested_documents || data.document_requests || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.description || '')}</td>
        <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.due_at || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No requested documents</td></tr>';

    const communicationRows = (data.recent_updates || data.communications || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.channel)}</td>
        <td>${escapeHtml(item.subject || item.body || '')}</td>
        <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.sent_at || item.created_at || '')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">No communications recorded</td></tr>';

    const eventRows = (data.recent_events || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.event_type)}</td>
        <td>${escapeHtml(item.created_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="2">No recent events</td></tr>';
    const documentRequests = data.requested_documents || data.document_requests || [];
    const todoItems = derivePortalTodoList(data, approvals, alerts, inspectionStatus);
    const actionCards = isClient ? [] : [
      {
        id: 'approvals',
        label: 'Approvals waiting on you',
        count: approvals.length,
        summary: approvals[0]?.summary || approvals[0]?.title || 'No approvals waiting right now.',
        button: approvals.length ? 'Review approvals' : 'Check approvals',
      },
      {
        id: 'alerts',
        label: 'Active alerts',
        count: alerts.length,
        summary: alerts[0]?.summary || alerts[0]?.title || 'No active alerts right now.',
        button: alerts.length ? 'Open alerts' : 'Check alerts',
      },
      {
        id: 'requested-documents',
        label: 'Documents to review',
        count: documentRequests.filter((item) => item.status !== 'complete').length,
        summary: documentRequests[0]?.description || documentRequests[0]?.title || 'No document review queue right now.',
        button: documentRequests.length ? 'Open document review' : 'Check documents',
      },
    ];

    const reportCards = recentReports.map((report) => {
      const metrics = report.metrics || {};
      return `
        <div class="report-card">
          <div class="report-head">
            <strong>${escapeHtml(report.week_start)} to ${escapeHtml(report.week_end)}</strong>
            <span class="badge ${badgeClass(report.health_status)}">${escapeHtml(report.health_status)}</span>
          </div>
          <p>${escapeHtml(report.summary)}</p>
          <div class="mini-grid">
            <div><span>Showings</span><strong>${escapeHtml(metrics.showings_completed || 0)}</strong></div>
            <div><span>Feedback</span><strong>${escapeHtml(metrics.feedback_received || 0)}</strong></div>
            <div><span>Health</span><strong>${escapeHtml(metrics.health_score || '')}</strong></div>
            <div><span>Pending comps</span><strong>${escapeHtml(metrics.pending_comp_count || 0)}</strong></div>
          </div>
        </div>
      `;
    }).join('') || '<div class="card"><p>No weekly reports yet.</p></div>';

    root.innerHTML = `
      <div class="hero">
        <div>
          <div class="eyebrow">${isClient ? 'Client Portal' : 'Agent Portal'}</div>
          ${renderHeroAddress(tx.address)}
          <p>${escapeHtml(tx.status || '')} ${tx.agent_role ? '· ' + escapeHtml(tx.agent_role) : ''}</p>
        </div>
        <div class="hero-actions">
          <span class="badge ${badgeClass(status.health_status)}">${escapeHtml(status.health_status || 'unknown')}</span>
          <span class="badge ${badgeClass(status.stage)}">${escapeHtml(status.stage || 'unknown')}</span>
        </div>
      </div>

      ${isClient ? '' : renderCountdownBanner(status, inspectionStatus)}

      <div class="grid four">
        <div class="card stat"><span>Next action</span><strong>${escapeHtml(status.next_action || '—')}</strong></div>
        <div class="card stat"><span>Waiting on</span><strong>${escapeHtml(status.waiting_on || '—')}</strong></div>
        <div class="card stat"><span>Missing docs</span><strong>${escapeHtml(status.missing_doc_count || 0)}</strong></div>
        <div class="card stat"><span>Blockers</span><strong>${escapeHtml(status.blocker_count || 0)}</strong></div>
      </div>

      ${isClient ? '' : `
      <div class="card" id="status">
        <h2>What needs to happen</h2>
        <p><strong>Red</strong> = you (TC) must do something now (approval, alert, or internal next step). <strong>Yellow</strong> = watch—other party or automation is driving. <strong>Green</strong> = no TC action required at the moment.</p>
        ${renderTodoList(todoItems)}
      </div>

      <div class="action-board">
        ${actionCards.map((item) => `
          <div class="action-card">
            <span class="eyebrow">${escapeHtml(item.label)}</span>
            <h2 style="margin-top:6px">${escapeHtml(String(item.count))}</h2>
            <p>${escapeHtml(item.summary)}</p>
            <button type="button" class="${item.count ? '' : 'ghost'}" data-jump-section="${escapeHtml(item.id)}">${escapeHtml(item.button)}</button>
          </div>
        `).join('')}
      </div>`}

      <div class="grid two">
        <div class="card">
          <h2>Status</h2>
          <dl class="meta">
            <div><dt>Last update</dt><dd>${escapeHtml(status.last_client_update_at || '—')}</dd></div>
            <div><dt>Next update due</dt><dd>${escapeHtml(status.next_client_update_due_at || '—')}</dd></div>
            <div><dt>Days to close</dt><dd>${escapeHtml(status.days_to_close == null ? '—' : status.days_to_close)}</dd></div>
            <div><dt>Sync</dt><dd>${escapeHtml(JSON.stringify(status.portal_sync_status || {}))}</dd></div>
          </dl>
        </div>
        <div class="card">
          <h2>Recent weekly reports</h2>
          <div class="report-list">${reportCards}</div>
        </div>
      </div>

      <div class="grid two">
        <div class="card" id="requested-documents">
          <h2>Requested Documents</h2>
          <table><thead><tr><th>Title</th><th>Description</th><th>Status</th><th>Due</th></tr></thead><tbody>${documentRows}</tbody></table>
        </div>
        <div class="card" id="communications">
          <h2>${isClient ? 'Recent Updates' : 'Communications'}</h2>
          <table><thead><tr><th>Channel</th><th>Subject</th><th>Status</th><th>When</th></tr></thead><tbody>${communicationRows}</tbody></table>
        </div>
      </div>

      ${isClient ? '' : `
      <div class="card" id="approvals">
        <h2>Approval Cockpit</h2>
        <table><thead><tr><th>Item</th><th>Priority</th><th>Summary</th><th>Due</th><th>Actions</th></tr></thead><tbody>${approvalRows}</tbody></table>
      </div>

      <div class="card" id="alerts">
        <h2>Alerts</h2>
        <table><thead><tr><th>Alert</th><th>Severity</th><th>Summary</th><th>Next</th><th>Actions</th></tr></thead><tbody>${alertRows}</tbody></table>
      </div>

      <div class="card">
        <h2>Interactions</h2>
        <table><thead><tr><th>Type</th><th>Contact</th><th>Mode</th><th>Status</th><th>Summary</th><th>When</th></tr></thead><tbody>${interactionRows}</tbody></table>
      </div>

      <div class="card">
        <h2>Recent Events</h2>
        <table><thead><tr><th>Event</th><th>When</th></tr></thead><tbody>${eventRows}</tbody></table>
      </div>`}
    `;

    root.querySelectorAll('[data-save-approval]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.saveApproval;
        const expand = root.querySelector(`[data-approval-expand="${id}"]`);
        const summaryEl = expand?.querySelector('[data-field="summary"]');
        const bodyEl = expand?.querySelector('[data-field="body"]');
        const base = approvals.find((a) => String(a.id) === String(id));
        const rawPa = base?.prepared_action;
        const prevPa =
          rawPa && typeof rawPa === 'object' && !Array.isArray(rawPa) ? { ...rawPa } : {};
        button.disabled = true;
        try {
          await api(`/api/v1/tc/approvals/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              summary: summaryEl?.value ?? base?.summary ?? '',
              prepared_action: { ...prevPa, body: bodyEl?.value ?? '' },
            }),
          });
          await load();
        } catch (err) {
          alert(err.message);
        } finally {
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-approval]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await runApprovalAction(button.dataset.approval, button.dataset.action);
        } catch (err) {
          alert(err.message);
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-approval-link]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await createMobileLink('approval', button.dataset.approvalLink, button.dataset.action);
        } catch (err) {
          alert(err.message);
        } finally {
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-alert]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const extra = {};
          if (button.dataset.snoozeMode === 'morning') {
            extra.snooze_until = nextMorningIso();
            extra.notes = 'Agent chose to handle this in the morning.';
          }
          await runAlertAction(button.dataset.alert, button.dataset.action, extra);
        } catch (err) {
          alert(err.message);
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-alert-link]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await createMobileLink('alert', button.dataset.alertLink, button.dataset.action);
        } catch (err) {
          alert(err.message);
        } finally {
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-jump-section]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.dataset.jumpSection;
        const target = section ? document.getElementById(section) : null;
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const hashTarget = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
    if (hashTarget) {
      requestAnimationFrame(() => {
        hashTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  window.addEventListener('DOMContentLoaded', load);
})();
