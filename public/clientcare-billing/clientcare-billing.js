/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-billing.js
 * Operator overlay for ClientCare billing rescue.
 */
(function () {
  let lastAccountReport = null;
  let selectedAccountIndex = 0;
  let lastReimbursementIntelligence = null;
  let fullQueueHydrated = false;
  let fullQueueLoading = false;

  function getApiKey() {
    return localStorage.getItem('COMMAND_CENTER_KEY') || localStorage.getItem('lifeos_cmd_key') || localStorage.getItem('x_api_key') || '';
  }

  function setApiKey(value) {
    localStorage.setItem('COMMAND_CENTER_KEY', value);
    localStorage.setItem('lifeos_cmd_key', value);
    localStorage.setItem('x_api_key', value);
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
    if (/ready|resolved|submit_now|correct_and_resubmit|proof_of_timely_filing|ok/.test(v)) return 'ok';
    if (/timely_filing_exception|payer_followup|normal|review|warn/.test(v)) return 'warn';
    return 'bad';
  }

  function money(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '$0.00';
  }

  function summarizeHoverText(item) {
    const lines = [
      item.client || 'Unknown client',
      `Status: ${item.diagnosis?.status || 'review'}`,
      `Note: ${item.notePreview || 'No note preview'}`,
    ];
    const wrong = item.diagnosis?.whatWentWrong || [];
    const needed = item.diagnosis?.needed || [];
    if (wrong.length) lines.push(`Issue: ${wrong[0]}`);
    if (needed.length) lines.push(`Next: ${needed[0]}`);
    return lines.join('\n');
  }

  function deriveAccountStage(item) {
    const status = String(item.diagnosis?.status || '').toLowerCase();
    const flags = item.accountSummary?.flags || [];
    if (status === 'client_match_issue') {
      return { label: 'Match client record', percent: 20 };
    }
    if (flags.includes('billing_status_blank') || flags.includes('bill_provider_type_blank')) {
      return { label: 'Complete billing setup', percent: 45 };
    }
    if (status === 'insurance_setup_issue') {
      return { label: 'Verify insurance/effective date', percent: 35 };
    }
    if (status === 'billing_configuration_issue') {
      return { label: 'Resolve billing configuration', percent: 50 };
    }
    if (item.accountSummary?.paymentStatus === 'no') {
      return { label: 'Start claim work', percent: 65 };
    }
    return { label: 'Ready for submission review', percent: 85 };
  }

  function renderAccountBoard() {
    const container = document.getElementById('account-board');
    const detail = document.getElementById('account-detail');
    if (!container || !detail) return;

    const report = lastAccountReport;
    if (!report || !Array.isArray(report.items) || !report.items.length) {
      container.innerHTML = '<p class="muted">Run Account Report to load live billing accounts.</p>';
      detail.innerHTML = '<p class="muted">Click an account card to inspect the live billing status, blocker, and next actions.</p>';
      return;
    }

    if (selectedAccountIndex >= report.items.length) selectedAccountIndex = 0;

    container.innerHTML = report.items.map((item, index) => {
      const stage = deriveAccountStage(item);
      const selected = index === selectedAccountIndex;
      return `
        <button
          class="account-card${selected ? ' selected' : ''}"
          data-account-index="${index}"
          title="${escapeHtml(summarizeHoverText(item))}"
        >
          <div class="account-card-top">
            <strong>${escapeHtml(item.client || 'Unknown client')}</strong>
            <span class="badge ${badgeClass(item.diagnosis?.status || 'review')}">${escapeHtml(item.diagnosis?.status || 'review')}</span>
          </div>
          <div class="muted small">${escapeHtml(item.notePreview || 'No note preview')}</div>
          <div class="progress-label">
            <span>${escapeHtml(stage.label)}</span>
            <span>${escapeHtml(`${stage.percent}%`)}</span>
          </div>
          <div class="progress-track"><div class="progress-fill ${badgeClass(item.diagnosis?.status || 'review')}" style="width:${stage.percent}%"></div></div>
          <div class="account-meta">
            <span>${escapeHtml((item.accountSummary?.insurers || []).join(', ') || 'No insurer visible')}</span>
          </div>
        </button>
      `;
    }).join('');

    const item = report.items[selectedAccountIndex];
    detail.innerHTML = `
      <div class="stack">
        <div class="account-detail-header">
          <div>
            <h3>${escapeHtml(item.client || 'Unknown client')}</h3>
            <p class="muted">${escapeHtml(item.date || '')} · ${escapeHtml(item.notePreview || '')}</p>
          </div>
          <span class="badge ${badgeClass(item.diagnosis?.status || 'review')}">${escapeHtml(item.diagnosis?.status || 'review')}</span>
        </div>
        ${renderKeyValueTable([
          { label: 'Recovery chance', value: item.recoveryBand?.label || 'Needs review' },
          { label: 'Payment status', value: item.accountSummary?.paymentStatus || 'unknown' },
          { label: 'Client billing status', value: item.accountSummary?.clientBillingStatus || 'blank' },
          { label: 'Bill provider type', value: item.accountSummary?.billProviderType || 'blank' },
          { label: 'Billing notes', value: item.raw?.noteCount || 1 },
          { label: 'Insurers', value: (item.accountSummary?.insurers || []).join(', ') || 'none visible' },
          { label: 'Flags', value: (item.accountSummary?.flags || []).join(', ') || 'none' },
        ])}
        <div>
          <strong>What went wrong</strong>
          <ul class="detail-list">
            ${(item.diagnosis?.whatWentWrong || ['Needs review']).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <strong>What is needed</strong>
          <ul class="detail-list">
            ${(item.diagnosis?.needed || ['Review billing page']).map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <strong>Insurance preview</strong>
          ${(item.insurancePreview || []).length ? `
            <table>
              <thead><tr><th>Carrier</th><th>Member ID</th><th>Priority</th><th>Subscriber</th><th>Payor ID</th></tr></thead>
              <tbody>
                ${(item.insurancePreview || []).map((insurance) => `
                  <tr>
                    <td>${escapeHtml(insurance.insuranceName || '')}</td>
                    <td>${escapeHtml(insurance.memberId || '')}</td>
                    <td>${escapeHtml(insurance.priority || '')}</td>
                    <td>${escapeHtml(insurance.subscriberName || '')}</td>
                    <td>${escapeHtml(insurance.payorId || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p class="muted">No insurer details visible on this page.</p>'}
        </div>
        <details><summary>Raw account details</summary><pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre></details>
      </div>
    `;

    container.querySelectorAll('[data-account-index]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedAccountIndex = Number(button.getAttribute('data-account-index') || 0);
        renderAccountBoard();
      });
    });
  }

  function renderKeyValueTable(rows) {
    if (!rows.length) return '<p class="muted">No data.</p>';
    return `
      <table>
        <tbody>
          ${rows.map((row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function renderReadiness(readiness) {
    const workflowTitles = (readiness.workflowTemplates || []).map((item) => item.title);
    return `
      <div class="stack">
        <div><span class="badge ${badgeClass(readiness.ready ? 'ready' : 'warn')}">${readiness.ready ? 'Ready' : 'Missing secrets'}</span></div>
        ${renderKeyValueTable([
          { label: 'Mode', value: readiness.mode || 'unknown' },
          { label: 'Configured base URL', value: readiness.configuredBaseUrl || 'Not set' },
          { label: 'Configured username', value: readiness.configuredUsername || 'Not set' },
          { label: 'Required secrets', value: (readiness.requiredSecrets || []).join(', ') || 'None' },
          { label: 'Missing secrets', value: (readiness.missingSecrets || []).join(', ') || 'None' },
          { label: 'Optional configured', value: (readiness.optionalConfigured || []).join(', ') || 'None' },
          { label: 'Workflow templates', value: workflowTitles.join(', ') || 'None' },
        ])}
      </div>
    `;
  }

  function renderImportTemplate(templateFields) {
    return `
      <div class="stack">
        <p class="hint">Expected columns for claim import.</p>
        <div class="card" style="padding:12px; background:#0f1528;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:6px 12px;">
            ${templateFields.map((field) => `<div class="muted">${escapeHtml(field)}</div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderReimbursementIntelligence(intelligence) {
    if (!intelligence) {
      return '<p class="muted">Load reimbursement intelligence after importing paid claims or remits.</p>';
    }
    const summary = intelligence.summary || {};
    const recommendations = intelligence.recommendations || [];
    const payers = intelligence.payers || [];
    const denials = intelligence.denials || [];
    return `
      <div class="stack">
        <div class="grid four" style="margin-bottom:0">
          <div class="card stat"><span>Paid claims</span><strong>${escapeHtml(summary.paid_claims || 0)}</strong></div>
          <div class="card stat"><span>Recoverable claims</span><strong>${escapeHtml(summary.recoverable_claims || 0)}</strong></div>
          <div class="card stat"><span>Total paid</span><strong>${escapeHtml(money(summary.total_paid || 0))}</strong></div>
          <div class="card stat"><span>Unpaid balance</span><strong>${escapeHtml(money(summary.total_unpaid_balance || 0))}</strong></div>
        </div>
        ${renderKeyValueTable([
          { label: 'Collection rate', value: summary.collection_rate != null ? `${(summary.collection_rate * 100).toFixed(1)}%` : 'No history yet' },
          { label: 'Allowed vs billed', value: summary.allowed_rate != null ? `${(summary.allowed_rate * 100).toFixed(1)}%` : 'No history yet' },
          { label: 'Paid vs allowed', value: summary.paid_to_allowed_rate != null ? `${(summary.paid_to_allowed_rate * 100).toFixed(1)}%` : 'No history yet' },
        ])}
        <div>
          <strong>What improves payout</strong>
          <ul class="detail-list">
            ${recommendations.length ? recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No recommendations yet.</li>'}
          </ul>
        </div>
        <div>
          <strong>Top payers by paid history</strong>
          <table>
            <thead><tr><th>Payer</th><th>Paid claims</th><th>Avg paid</th><th>Avg allowed</th><th>Unpaid balance</th></tr></thead>
            <tbody>
              ${payers.length ? payers.map((payer) => `
                <tr>
                  <td>${escapeHtml(payer.payer_name || '')}</td>
                  <td>${escapeHtml(payer.paid_claims || 0)}</td>
                  <td>${escapeHtml(money(payer.avg_paid || 0))}</td>
                  <td>${escapeHtml(money(payer.avg_allowed || 0))}</td>
                  <td>${escapeHtml(money(payer.unpaid_balance || 0))}</td>
                </tr>
              `).join('') : '<tr><td colspan="5">No paid history imported yet.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div>
          <strong>Top denial patterns</strong>
          <table>
            <thead><tr><th>Reason</th><th>Count</th></tr></thead>
            <tbody>
              ${denials.length ? denials.map((item) => `<tr><td>${escapeHtml(item.reason || '')}</td><td>${escapeHtml(item.count || 0)}</td></tr>`).join('') : '<tr><td colspan="2">No denial history imported yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderReconciliation(reconciliation) {
    return `
      <div class="grid four" style="margin-bottom:0">
        <div class="card stat"><span>Total</span><strong>${escapeHtml(reconciliation.total || 0)}</strong></div>
        <div class="card stat"><span>Unbilled</span><strong>${escapeHtml(reconciliation.unbilled || 0)}</strong></div>
        <div class="card stat"><span>Rejected</span><strong>${escapeHtml(reconciliation.rejected || 0)}</strong></div>
        <div class="card stat"><span>Denied</span><strong>${escapeHtml(reconciliation.denied || 0)}</strong></div>
        <div class="card stat"><span>Submitted</span><strong>${escapeHtml(reconciliation.submitted || 0)}</strong></div>
        <div class="card stat"><span>Paid</span><strong>${escapeHtml(reconciliation.paid || 0)}</strong></div>
        <div class="card stat"><span>Missing submit date</span><strong>${escapeHtml(reconciliation.missing_submission_date || 0)}</strong></div>
        <div class="card stat"><span>High priority</span><strong>${escapeHtml(reconciliation.high_priority || 0)}</strong></div>
      </div>
    `;
  }

  function renderSummaryBadges(summary = {}) {
    const diagnosis = summary.diagnosisCounts || {};
    const recovery = summary.recoveryBandCounts || {};
    return `
      <div class="grid four" style="margin-bottom:0">
        <div class="card stat"><span>Total queue notes</span><strong>${escapeHtml(summary.totalQueueItems || 0)}</strong></div>
        <div class="card stat"><span>Unique accounts</span><strong>${escapeHtml(summary.totalAccounts || 0)}</strong></div>
        <div class="card stat"><span>Strong/possible</span><strong>${escapeHtml((recovery.strong || 0) + (recovery.possible || 0))}</strong></div>
        <div class="card stat"><span>Unlikely</span><strong>${escapeHtml(recovery.unlikely || 0)}</strong></div>
        <div class="card stat"><span>Insurance setup</span><strong>${escapeHtml(diagnosis.insurance_setup_issue || 0)}</strong></div>
        <div class="card stat"><span>Config issues</span><strong>${escapeHtml(diagnosis.billing_configuration_issue || 0)}</strong></div>
        <div class="card stat"><span>Missing insurer</span><strong>${escapeHtml(summary.missingInsurer || 0)}</strong></div>
        <div class="card stat"><span>Payment not started</span><strong>${escapeHtml(summary.paymentNotStarted || 0)}</strong></div>
      </div>
    `;
  }

  function renderActionSummary(summary = {}) {
    const actions = summary.topActions || [];
    return `
      <div class="stack">
        <strong>Most common next actions</strong>
        <table>
          <thead><tr><th>Action</th><th>Accounts</th><th>Examples</th></tr></thead>
          <tbody>
            ${actions.length ? actions.map((action) => `
              <tr>
                <td>${escapeHtml(action.action || '')}</td>
                <td>${escapeHtml(action.count || 0)}</td>
                <td>${escapeHtml((action.clients || []).join(', ') || '')}</td>
              </tr>
            `).join('') : '<tr><td colspan="3">No action summary yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderWorkflowPlaybooks(summary = {}) {
    const playbooks = summary.workflowPlaybooks || [];
    return `
      <div class="stack">
        ${playbooks.length ? playbooks.map((playbook) => `
          <div class="card" style="padding:12px; background:#0f1528;">
            <div class="account-card-top">
              <strong>${escapeHtml(playbook.title || '')}</strong>
              <span class="badge ${badgeClass(playbook.count > 10 ? 'warn' : 'ok')}">${escapeHtml(`${playbook.count} accounts`)}</span>
            </div>
            <ol class="detail-list" style="margin-left:18px;">
              ${(playbook.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
            <table>
              <thead><tr><th>Client</th><th>Oldest note</th><th>Status</th><th>Recovery</th><th>Insurer</th></tr></thead>
              <tbody>
                ${(playbook.accounts || []).map((account) => `
                  <tr>
                    <td>${escapeHtml(account.client || '')}</td>
                    <td>${escapeHtml(account.oldestNoteDate || '')}</td>
                    <td>${escapeHtml(account.status || '')}</td>
                    <td>${escapeHtml(account.recoveryBand || '')}</td>
                    <td>${escapeHtml((account.insurers || []).join(', ') || 'none visible')}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5">No accounts in this workflow.</td></tr>'}
              </tbody>
            </table>
          </div>
        `).join('') : '<p class="muted">Run Full Queue Report to build workflow groups.</p>'}
      </div>
    `;
  }

  function renderBrowserOutput(result) {
    if (!result) return '<p class="muted">No browser run yet.</p>';

    if (Array.isArray(result.accounts) && result.summary) {
      const summary = result.summary || {};
      const oldestAccounts = summary.oldestAccounts || [];
      return `
        <div class="stack">
          ${renderSummaryBadges(summary)}
          ${renderKeyValueTable([
            { label: 'Billing notes visible in ClientCare', value: result.dashboardCounts?.newBillingNotes || 0 },
            { label: 'Billing status blank', value: summary.billingStatusBlank || 0 },
            { label: 'Provider type blank', value: summary.providerTypeBlank || 0 },
            { label: 'Generated', value: summary.generatedAt || '' },
          ])}
          ${renderActionSummary(summary)}
          ${renderWorkflowPlaybooks(summary)}
          <div>
            <strong>Oldest accounts to work first</strong>
            <table>
              <thead><tr><th>Client</th><th>Oldest note</th><th>Status</th><th>Recovery</th><th>Insurer</th><th>Next action</th></tr></thead>
              <tbody>
                ${oldestAccounts.length ? oldestAccounts.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.client || '')}</td>
                    <td>${escapeHtml(item.oldestNoteDate || '')}</td>
                    <td><span class="badge ${badgeClass(item.status || 'review')}">${escapeHtml(item.status || 'review')}</span></td>
                    <td>${escapeHtml(item.recoveryBand || '')}</td>
                    <td>${escapeHtml((item.insurers || []).join(', ') || 'none visible')}</td>
                    <td>${escapeHtml(item.nextAction || '')}</td>
                  </tr>
                `).join('') : '<tr><td colspan="6">No oldest-account summary yet.</td></tr>'}
              </tbody>
            </table>
          </div>
          <details><summary>Raw details</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>
        </div>
      `;
    }

    if (Array.isArray(result.items)) {
      return `
        <div class="stack">
          <div class="grid four" style="margin-bottom:0">
            <div class="card stat"><span>Visible queue items</span><strong>${escapeHtml(result.totalVisibleQueueItems || 0)}</strong></div>
            <div class="card stat"><span>Returned</span><strong>${escapeHtml((result.items || []).length)}</strong></div>
            <div class="card stat"><span>Offset</span><strong>${escapeHtml(result.offset || 0)}</strong></div>
            <div class="card stat"><span>Billing notes</span><strong>${escapeHtml(result.dashboardCounts?.newBillingNotes || 0)}</strong></div>
          </div>
          <table>
            <thead><tr><th>Client</th><th>Note</th><th>Status</th><th>What went wrong</th><th>Needed now</th><th>Insurance</th></tr></thead>
            <tbody>
              ${(result.items || []).map((item) => `
                <tr>
                  <td>${escapeHtml(item.client || '')}</td>
                  <td>${escapeHtml(item.notePreview || '')}</td>
                  <td><span class="badge ${badgeClass(item.diagnosis?.status || 'review')}">${escapeHtml(item.diagnosis?.status || 'review')}</span></td>
                  <td>${escapeHtml((item.diagnosis?.whatWentWrong || []).join(' | ') || 'Needs review')}</td>
                  <td>${escapeHtml((item.diagnosis?.needed || []).join(' | ') || 'Review billing page')}</td>
                  <td>${escapeHtml((item.accountSummary?.insurers || []).join(', ') || 'none visible')}</td>
                </tr>
              `).join('') || '<tr><td colspan="6">No account items returned.</td></tr>'}
            </tbody>
          </table>
          <details><summary>Raw details</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>
        </div>
      `;
    }

    if (result.dashboardCounts && result.notes) {
      const notes = (result.notes.billingNotes || []).slice(0, 10);
      const followUps = (result.notes.followUpReminders || []).slice(0, 10);
      return `
        <div class="stack">
          <div class="grid four" style="margin-bottom:0">
            <div class="card stat"><span>Billing notes</span><strong>${escapeHtml(result.dashboardCounts.newBillingNotes || 0)}</strong></div>
            <div class="card stat"><span>Labs</span><strong>${escapeHtml(result.dashboardCounts.newLabs || 0)}</strong></div>
            <div class="card stat"><span>Ultrasounds</span><strong>${escapeHtml(result.dashboardCounts.newUltrasounds || 0)}</strong></div>
            <div class="card stat"><span>Follow-up rows</span><strong>${escapeHtml(followUps.length)}</strong></div>
          </div>
          <div>
            <h3 style="margin-bottom:8px">Top billing notes</h3>
            <table>
              <thead><tr><th>Date</th><th>Client</th><th>Preview</th><th>By</th><th>For</th></tr></thead>
              <tbody>
                ${notes.map((note) => `<tr><td>${escapeHtml(note.Date || '')}</td><td>${escapeHtml(note.Client || '')}</td><td>${escapeHtml(note['Note Preview'] || '')}</td><td>${escapeHtml(note.By || '')}</td><td>${escapeHtml(note.For || '')}</td></tr>`).join('') || '<tr><td colspan="5">No note rows parsed.</td></tr>'}
              </tbody>
            </table>
          </div>
          <details><summary>Raw details</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>
        </div>
      `;
    }

    if (Array.isArray(result.accounts)) {
      return `
        <div class="stack">
          <div class="grid four" style="margin-bottom:0">
            <div class="card stat"><span>Scanned</span><strong>${escapeHtml(result.totalScanned || 0)}</strong></div>
            <div class="card stat"><span>Offset</span><strong>${escapeHtml(result.offset || 0)}</strong></div>
          </div>
          <table>
            <thead><tr><th>Client</th><th>Source</th><th>Payment</th><th>Billing status</th><th>Insurers</th><th>Flags</th></tr></thead>
            <tbody>
              ${result.accounts.map((account) => `
                <tr>
                  <td>${escapeHtml(account.name || '')}</td>
                  <td>${escapeHtml(account.source || '')}</td>
                  <td>${escapeHtml(account.accountSummary?.paymentStatus || '')}</td>
                  <td>${escapeHtml(account.accountSummary?.clientBillingStatus || 'blank')}</td>
                  <td>${escapeHtml((account.accountSummary?.insurers || []).join(', ') || 'none')}</td>
                  <td>${escapeHtml((account.accountSummary?.flags || []).join(', ') || 'none')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <details><summary>Raw details</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>
        </div>
      `;
    }

    if (Array.isArray(result.pages)) {
      return `
        <div class="stack">
          <div class="grid four" style="margin-bottom:0">
            <div class="card stat"><span>Billing notes</span><strong>${escapeHtml(result.dashboardCounts?.newBillingNotes || 0)}</strong></div>
            <div class="card stat"><span>Labs</span><strong>${escapeHtml(result.dashboardCounts?.newLabs || 0)}</strong></div>
            <div class="card stat"><span>Ultrasounds</span><strong>${escapeHtml(result.dashboardCounts?.newUltrasounds || 0)}</strong></div>
          </div>
          <table>
            <thead><tr><th>Page</th><th>Status</th><th>Signals</th><th>Notes</th></tr></thead>
            <tbody>
              ${result.pages.map((page) => `
                <tr>
                  <td>${escapeHtml(page.label || page.id || '')}</td>
                  <td>${page.ok ? '<span class="badge ok">ok</span>' : '<span class="badge bad">failed</span>'}</td>
                  <td>${escapeHtml(Object.entries(page.state || {}).filter(([,v]) => v).map(([k]) => k).join(', ') || 'none')}</td>
                  <td>${escapeHtml(page.error || ((page.page || {}).textPreview || '').slice(0, 180))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <details><summary>Raw details</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>
        </div>
      `;
    }

    if (result.page) {
      return `
        <div class="stack">
          ${renderKeyValueTable([
            { label: 'Title', value: result.page.title || 'Untitled' },
            { label: 'URL', value: result.page.url || '' },
            { label: 'Signals', value: Object.entries(result.state || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none' },
          ])}
          <details><summary>Raw details</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>
        </div>
      `;
    }

    return `<details open><summary>Raw result</summary><pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre></details>`;
  }

  function setBrowserOutput(result) {
    document.getElementById('browser-output').innerHTML = renderBrowserOutput(result);
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
    if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function loadDashboard(filters = {}, options = {}) {
    const root = document.getElementById('app');
    try {
      const query = new URLSearchParams(filters).toString();
      const [dashboard, readiness, template, claims, actions, reconciliation, intelligence] = await Promise.all([
        api('/api/v1/clientcare-billing/dashboard'),
        api('/api/v1/clientcare-billing/clientcare/readiness'),
        api('/api/v1/clientcare-billing/claims/import-template'),
        api(`/api/v1/clientcare-billing/claims${query ? `?${query}` : ''}`),
        api('/api/v1/clientcare-billing/actions'),
        api('/api/v1/clientcare-billing/reconciliation'),
        api('/api/v1/clientcare-billing/reimbursement-intelligence'),
      ]);
      lastReimbursementIntelligence = intelligence.intelligence || null;
      render(root, dashboard.dashboard, readiness.readiness, template.fields || [], claims.claims || [], actions.actions || [], reconciliation.summary || {}, lastReimbursementIntelligence);
      if (!options.skipAutoFullQueue && getApiKey() && readiness.readiness?.ready && !fullQueueHydrated && !fullQueueLoading) {
        fullQueueLoading = true;
        browserFullAccountReport({ silent: true, refreshDashboard: true }).finally(() => {
          fullQueueLoading = false;
        });
      }
    } catch (error) {
      root.innerHTML = `<div class="card"><h2>Load failed</h2><p>${escapeHtml(error.message)}</p></div>`;
    }
  }

  async function importCsv() {
    const csv = document.getElementById('csv-input').value;
    if (!csv.trim()) return alert('Paste CSV first.');
    try {
      await api('/api/v1/clientcare-billing/claims/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv, source: 'overlay_csv_import' }),
      });
      alert('CSV imported.');
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function importSnapshot() {
    const text = document.getElementById('snapshot-input').value;
    if (!text.trim()) return alert('Paste snapshot text or HTML first.');
    const payload = {
      source: 'overlay_snapshot_import',
      html: /<table|<tr|<td|<th/i.test(text) ? text : '',
      text: /<table|<tr|<td|<th/i.test(text) ? '' : text,
    };
    try {
      const preview = await api('/api/v1/clientcare-billing/snapshots/parse', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!preview.parsed) return alert('No rows parsed from snapshot.');
      await api('/api/v1/clientcare-billing/snapshots/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert(`Imported ${preview.parsed} rows from snapshot.`);
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserLoginTest() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/login-test', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setBrowserOutput(result);
      alert('Browser login test completed.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserDiscover() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/discover', {
        method: 'POST',
        body: JSON.stringify({
          max_candidates: 2,
          include_screenshots: false,
          page_timeout_ms: 15000,
        }),
      });
      setBrowserOutput(result);
      alert('Browser discovery completed.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserOverview() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/billing-overview?page_timeout_ms=12000');
      setBrowserOutput(result);
      alert('Billing overview loaded.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserScanBillingNotes() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/scan-billing-notes?page_timeout_ms=12000');
      setBrowserOutput(result);
      alert('Billing notes scan completed.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserScanAccounts() {
    try {
      const limit = Number(document.getElementById('browser-scan-limit')?.value || 5);
      const offset = Number(document.getElementById('browser-scan-offset')?.value || 0);
      const result = await api('/api/v1/clientcare-billing/browser/scan-client-accounts', {
        method: 'POST',
        body: JSON.stringify({
          limit: Math.max(1, Math.min(limit, 25)),
          offset: Math.max(0, offset),
          page_timeout_ms: 8000,
        }),
      });
      setBrowserOutput(result);
      alert(`Scanned ${result.totalScanned || 0} client billing accounts.`);
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserAccountReport() {
    try {
      const limit = Number(document.getElementById('browser-scan-limit')?.value || 5);
      const offset = Number(document.getElementById('browser-scan-offset')?.value || 0);
      const params = new URLSearchParams({
        limit: String(Math.max(1, Math.min(limit, 25))),
        offset: String(Math.max(0, offset)),
        page_timeout_ms: '12000',
      });
      const result = await api(`/api/v1/clientcare-billing/browser/account-report?${params.toString()}`);
      lastAccountReport = result;
      selectedAccountIndex = 0;
      setBrowserOutput(result);
      renderAccountBoard();
      alert(`Loaded ${result.items?.length || 0} account rescue rows.`);
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserFullAccountReport({ silent = false, refreshDashboard = false } = {}) {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/full-account-report?max_pages=12&page_timeout_ms=12000&account_limit=200');
      lastAccountReport = {
        summary: result.summary || null,
        items: (result.accounts || []).map((item) => ({
          client: item.client,
          notePreview: (item.notePreviews || [])[0] || '',
          date: item.oldestNoteDate || (item.noteDates || [])[0] || '',
          insurancePreview: item.insurancePreview || [],
          accountSummary: item.accountSummary || {},
          diagnosis: item.diagnosis || {},
          recoveryBand: item.recoveryBand || {},
          raw: item,
        })),
      };
      fullQueueHydrated = true;
      if (refreshDashboard) {
        await loadDashboard({}, { skipAutoFullQueue: true });
        return;
      }
      selectedAccountIndex = 0;
      setBrowserOutput(result);
      renderAccountBoard();
      const workflowNode = document.getElementById('workflow-playbooks');
      if (workflowNode) workflowNode.innerHTML = renderWorkflowPlaybooks(lastAccountReport?.summary || {});
      if (!silent) alert(`Loaded ${result.accounts?.length || 0} accounts from the full billing queue.`);
    } catch (error) {
      if (!silent) alert(error.message);
    }
  }

  async function browserExtract(importIntoQueue = false) {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/extract-claims', {
        method: 'POST',
        body: JSON.stringify({
          import_into_queue: importIntoQueue,
          max_candidates: 2,
          include_screenshots: false,
          page_timeout_ms: 15000,
        }),
      });
      setBrowserOutput(result);
      alert(importIntoQueue ? 'Browser extraction and import completed.' : 'Browser extraction preview completed.');
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function reclassify(id) {
    try {
      await api(`/api/v1/clientcare-billing/claims/${id}/reclassify`, { method: 'POST', body: JSON.stringify({ actor: 'overlay' }) });
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function completeAction(id) {
    try {
      await api(`/api/v1/clientcare-billing/actions/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) });
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function showClaim(id) {
    try {
      const plan = await api(`/api/v1/clientcare-billing/claims/${id}`);
      document.getElementById('claim-plan').innerHTML = `
        <h3>${escapeHtml(plan.claim.patient_name || plan.claim.claim_number || `Claim ${id}`)}</h3>
        <p class="muted">${escapeHtml(plan.claim.payer_name || '')} · DOS ${escapeHtml(plan.claim.date_of_service || '')}</p>
        <p style="margin-top:10px"><span class="badge ${badgeClass(plan.classification.rescueBucket)}">${escapeHtml(plan.classification.rescueBucket)}</span></p>
        <div class="stack" style="margin-top:12px">
          <div><strong>Timely filing</strong><pre>${escapeHtml(plan.classification.timelyFilingSource || 'Unknown')}</pre></div>
          <div><strong>Notes</strong><pre>${escapeHtml((plan.classification.notes || []).join('\n') || 'None')}</pre></div>
          <div><strong>Recommended actions</strong><pre>${escapeHtml((plan.classification.actions || []).map((a) => `- [${a.priority}] ${a.summary}: ${a.details}`).join('\n') || 'None')}</pre></div>
        </div>
      `;
    } catch (error) {
      alert(error.message);
    }
  }

  function render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence) {
    const summary = dashboard.summary || {};
    const liveSummary = lastAccountReport?.summary || null;
    const topCards = liveSummary ? [
      { label: 'Live accounts', value: liveSummary.totalAccounts || 0 },
      { label: 'Billing notes', value: liveSummary.totalQueueItems || 0 },
      { label: 'Strong/possible', value: (liveSummary.recoveryBandCounts?.strong || 0) + (liveSummary.recoveryBandCounts?.possible || 0) },
      { label: 'Unlikely', value: liveSummary.recoveryBandCounts?.unlikely || 0 },
    ] : [
      { label: 'Total claims', value: summary.total_claims || 0 },
      { label: 'Outstanding total', value: summary.outstanding_total || 0 },
      { label: 'Submit now', value: summary.submit_now_count || 0 },
      { label: 'Correct/resubmit', value: summary.correct_and_resubmit_count || 0 },
    ];
    const claimRows = claims.map((claim) => `
      <tr>
        <td>${escapeHtml(claim.patient_name || '')}</td>
        <td>${escapeHtml(claim.payer_name || '')}</td>
        <td>${escapeHtml(claim.date_of_service || '')}</td>
        <td>${escapeHtml(claim.claim_status || '')}</td>
        <td><span class="badge ${badgeClass(claim.rescue_bucket)}">${escapeHtml(claim.rescue_bucket || '')}</span></td>
        <td>${escapeHtml(claim.priority_score || '')}</td>
        <td>${escapeHtml(claim.insurance_balance || claim.billed_amount || '')}</td>
        <td>
          <button data-claim-view="${claim.id}" class="ghost">View</button>
          <button data-claim-reclassify="${claim.id}">Reclassify</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8">No claims imported yet.</td></tr>';

    const actionRows = actions.map((action) => `
      <tr>
        <td>${escapeHtml(action.patient_name || '')}</td>
        <td>${escapeHtml(action.summary || '')}</td>
        <td><span class="badge ${badgeClass(action.priority)}">${escapeHtml(action.priority || '')}</span></td>
        <td>${escapeHtml(action.status || '')}</td>
        <td>${escapeHtml(action.evidence_required ? JSON.stringify(action.evidence_required) : '')}</td>
        <td><button data-action-complete="${action.id}">Complete</button></td>
      </tr>
    `).join('') || '<tr><td colspan="6">No open actions.</td></tr>';

    root.innerHTML = `
      <div class="hero">
        <div>
          <div class="eyebrow">ClientCare West</div>
          <h1>Billing Rescue Overlay</h1>
          <p class="muted">Claims rescue queue, browser fallback readiness, and claim action tracking.</p>
        </div>
        <div class="card" style="min-width:320px;">
          <label for="api-key">Command key</label>
          <input id="api-key" type="password" value="${escapeHtml(getApiKey())}" placeholder="x-api-key">
          <div style="margin-top:10px"><button id="save-key">Save key</button></div>
        </div>
      </div>

      <div class="grid four">
        ${topCards.map((card) => `
          <div class="card stat"><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong></div>
        `).join('')}
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Browser fallback readiness</h2>
          <p style="margin:10px 0"><span class="badge ${badgeClass(readiness.ready ? 'ready' : 'warn')}">${readiness.ready ? 'ready' : 'not ready'}</span></p>
          ${renderReadiness(readiness)}
        </div>
        <div class="card">
          <h2>Import backlog</h2>
          <p class="hint" style="margin:10px 0">Paste CSV from ClientCare exports. Required/expected fields are listed below.</p>
          ${renderImportTemplate(templateFields)}
          <textarea id="csv-input" placeholder="Paste claim export CSV here"></textarea>
          <div style="margin-top:10px"><button id="import-csv">Import CSV</button></div>
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Snapshot import</h2>
          <p class="hint" style="margin:10px 0">Paste copied ClientCare table HTML or tab/comma-delimited text. This is the no-export fallback.</p>
          <textarea id="snapshot-input" placeholder="Paste copied table HTML or delimited text here"></textarea>
          <div style="margin-top:10px"><button id="import-snapshot">Import Snapshot</button></div>
        </div>
        <div class="card">
          <h2>Reconciliation</h2>
          ${renderReconciliation(reconciliation)}
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Reimbursement intelligence</h2>
          <p class="hint" style="margin:10px 0">This gets better as paid claims, ERAs, and remits are imported. It shows what payers actually paid, where leakage exists, and where to tighten workflow.</p>
          <div id="reimbursement-intelligence">${renderReimbursementIntelligence(intelligence)}</div>
        </div>
        <div class="card">
          <h2>Insurance intake rule</h2>
          <p class="muted">Use benefits verification to decide whether to take the client, then use payout history to estimate what should be collectible. Exact reimbursement is not assumed without actual remit history.</p>
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Browser automation</h2>
          <p class="hint" style="margin:10px 0">Uses the Railway ClientCare credentials to log in, inspect billing pages, and preview claim tables.</p>
          <div class="row-actions">
            <button id="browser-login-test">Login Test</button>
            <button id="browser-overview" class="ghost">Billing Overview</button>
            <button id="browser-scan-billing-notes" class="ghost">Scan Billing Notes</button>
            <button id="browser-discover" class="ghost">Discover</button>
            <button id="browser-extract" class="ghost">Extract Preview</button>
            <button id="browser-extract-import">Extract + Import</button>
          </div>
          <div class="row-actions" style="margin-top:10px">
            <input id="browser-scan-limit" type="number" min="1" max="25" value="5" style="max-width:90px">
            <input id="browser-scan-offset" type="number" min="0" value="0" style="max-width:90px">
            <button id="browser-scan-accounts" class="ghost">Scan Accounts</button>
            <button id="browser-account-report" class="ghost">Account Report</button>
            <button id="browser-full-account-report" class="ghost">Full Queue Report</button>
          </div>
        </div>
        <div class="card">
          <h2>Browser output</h2>
          <div id="browser-output"><p class="muted">No browser run yet.</p></div>
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Account status board</h2>
          <p class="hint" style="margin:10px 0">Each account shows where it is stuck. Hover for a quick overview. Click for full details.</p>
          <div id="account-board" class="account-board"><p class="muted">Run Account Report to load live billing accounts.</p></div>
        </div>
        <div class="card">
          <h2>Account details</h2>
          <div id="account-detail"><p class="muted">Click an account card to inspect the live billing status, blocker, and next actions.</p></div>
        </div>
      </div>

      <div class="card">
        <h2>Batch workflows</h2>
        <p class="hint" style="margin:10px 0">Work the backlog by common blocker instead of one account at a time.</p>
        <div id="workflow-playbooks">${renderWorkflowPlaybooks(lastAccountReport?.summary || {})}</div>
      </div>

      <div class="split">
        <div class="stack">
          <div class="card">
            <h2>Claims</h2>
            <table>
              <thead><tr><th>Patient</th><th>Payer</th><th>DOS</th><th>Status</th><th>Bucket</th><th>Priority</th><th>Balance</th><th>Actions</th></tr></thead>
              <tbody>${claimRows}</tbody>
            </table>
          </div>

          <div class="card">
            <h2>Open actions</h2>
            <table>
              <thead><tr><th>Patient</th><th>Action</th><th>Priority</th><th>Status</th><th>Evidence</th><th></th></tr></thead>
              <tbody>${actionRows}</tbody>
            </table>
          </div>
        </div>

        <div class="card" id="claim-plan">
          <h2>Claim plan</h2>
          <p class="muted">Select a claim to inspect its filing rule, rescue bucket, and recommended actions.</p>
        </div>
      </div>
    `;

    document.getElementById('save-key').addEventListener('click', async () => {
      setApiKey(document.getElementById('api-key').value);
      await loadDashboard();
    });
    document.getElementById('import-csv').addEventListener('click', importCsv);
    document.getElementById('import-snapshot').addEventListener('click', importSnapshot);
    document.getElementById('browser-login-test').addEventListener('click', browserLoginTest);
    document.getElementById('browser-overview').addEventListener('click', browserOverview);
    document.getElementById('browser-scan-billing-notes').addEventListener('click', browserScanBillingNotes);
    document.getElementById('browser-discover').addEventListener('click', browserDiscover);
    document.getElementById('browser-extract').addEventListener('click', () => browserExtract(false));
    document.getElementById('browser-extract-import').addEventListener('click', () => browserExtract(true));
    document.getElementById('browser-scan-accounts').addEventListener('click', browserScanAccounts);
    document.getElementById('browser-account-report').addEventListener('click', browserAccountReport);
    document.getElementById('browser-full-account-report').addEventListener('click', browserFullAccountReport);
    root.querySelectorAll('[data-claim-view]').forEach((button) => button.addEventListener('click', () => showClaim(button.getAttribute('data-claim-view'))));
    root.querySelectorAll('[data-claim-reclassify]').forEach((button) => button.addEventListener('click', () => reclassify(button.getAttribute('data-claim-reclassify'))));
    root.querySelectorAll('[data-action-complete]').forEach((button) => button.addEventListener('click', () => completeAction(button.getAttribute('data-action-complete'))));
    renderAccountBoard();
    const workflowNode = document.getElementById('workflow-playbooks');
    if (workflowNode) workflowNode.innerHTML = renderWorkflowPlaybooks(lastAccountReport?.summary || {});
  }

  loadDashboard();
})();
