/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-billing.js
 * Operator overlay for ClientCare billing rescue.
 */
(function () {
  let lastAccountReport = null;
  let selectedAccountIndex = 0;
  let lastInsurancePreview = null;
  let lastRepairResult = null;
  let lastReimbursementIntelligence = null;
  let lastPayerPlaybooks = null;
  let lastUnderpayments = null;
  let lastAppeals = null;
  let lastOpsOverview = null;
  let lastBrowserResult = null;
  let lastViewState = null;
  let fullQueueHydrated = false;
  let fullQueueLoading = false;
  let assistantSessionId = localStorage.getItem('clientcare_assistant_session_id') || '';
  let accountFilter = localStorage.getItem('clientcare_account_filter') || 'all';
  let assistantPinned = localStorage.getItem('clientcare_assistant_pinned') !== 'false';
  let assistantOpen = localStorage.getItem('clientcare_assistant_open') !== 'false';

  function getApiKey() {
    return localStorage.getItem('COMMAND_CENTER_KEY') || localStorage.getItem('lifeos_cmd_key') || localStorage.getItem('x_api_key') || '';
  }

  function setApiKey(value) {
    localStorage.setItem('COMMAND_CENTER_KEY', value);
    localStorage.setItem('lifeos_cmd_key', value);
    localStorage.setItem('x_api_key', value);
  }

  function setAssistantSessionId(value) {
    assistantSessionId = value || '';
    if (assistantSessionId) localStorage.setItem('clientcare_assistant_session_id', assistantSessionId);
  }

  function setAccountFilter(value) {
    accountFilter = value || 'all';
    localStorage.setItem('clientcare_account_filter', accountFilter);
  }

  function setAssistantPinned(value) {
    assistantPinned = Boolean(value);
    localStorage.setItem('clientcare_assistant_pinned', String(assistantPinned));
  }

  function setAssistantOpen(value) {
    assistantOpen = Boolean(value);
    localStorage.setItem('clientcare_assistant_open', String(assistantOpen));
  }

  function saveViewState(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals) {
    lastViewState = { root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals };
  }

  function rerender() {
    if (!lastViewState) return;
    render(
      lastViewState.root,
      lastViewState.dashboard,
      lastViewState.readiness,
      lastViewState.templateFields,
      lastViewState.claims,
      lastViewState.actions,
      lastViewState.reconciliation,
      lastViewState.intelligence,
      lastViewState.payerPlaybooks,
      lastViewState.opsOverview,
      lastViewState.underpayments,
      lastViewState.appeals,
    );
    void ensureAssistantSession();
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

  function getFilteredItems() {
    const items = lastAccountReport?.items || [];
    const sorted = [...items].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    switch (accountFilter) {
      case 'strong':
        return sorted.filter((item) => ['strong', 'possible'].includes(String(item.recoveryBand?.band || '')));
      case 'insurance':
        return sorted.filter((item) => String(item.diagnosis?.status || '') === 'insurance_setup_issue');
      case 'missing':
        return sorted.filter((item) => !(item.accountSummary?.insurers || []).length);
      case 'client_match':
        return sorted.filter((item) => String(item.diagnosis?.status || '') === 'client_match_issue');
      case 'oldest':
        return sorted;
      default:
        return items;
    }
  }

  function renderFilterBar() {
    const filters = [
      ['all', 'All'],
      ['strong', 'Strong Chance'],
      ['insurance', 'Insurance Setup'],
      ['missing', 'Missing Insurance'],
      ['client_match', 'Client Match'],
      ['oldest', 'Oldest'],
    ];
    return `
      <div class="filter-bar">
        ${filters.map(([value, label]) => `
          <button class="${accountFilter === value ? '' : 'ghost'}" data-account-filter="${value}">${escapeHtml(label)}</button>
        `).join('')}
      </div>
    `;
  }

  function fieldOptionsFor(item, pattern) {
    return ((item?.billingFields || []).find((field) => pattern.test(String(field.label || '')))?.options || [])
      .filter((option) => option && option.text)
      .map((option) => option.text);
  }

  function renderRepairControl({ id, label, currentValue, options = [], placeholder }) {
    if (options.length) {
      return `
        <label class="stack">
          <span class="muted">${escapeHtml(label)}</span>
          <select id="${escapeHtml(id)}">
            <option value="">Leave unchanged</option>
            ${options.map((option) => `
              <option value="${escapeHtml(option)}" ${String(option) === String(currentValue || '') ? 'selected' : ''}>${escapeHtml(option)}</option>
            `).join('')}
          </select>
        </label>
      `;
    }
    return `
      <label class="stack">
        <span class="muted">${escapeHtml(label)}</span>
        <input id="${escapeHtml(id)}" value="${escapeHtml(currentValue || '')}" placeholder="${escapeHtml(placeholder || '')}">
      </label>
    `;
  }

  function renderRepairResult(item) {
    const billingHref = item.billingHref || item.raw?.billingHref || '';
    if (!lastRepairResult || lastRepairResult.billingHref !== billingHref) {
      return '<p class="muted">Preview or apply a repair to see the exact field changes and save result.</p>';
    }

    const operations = lastRepairResult.operations || [];
    const unsupported = lastRepairResult.repairPlan?.unsupported || [];
    return `
      <div class="stack">
        ${renderKeyValueTable([
          { label: 'Mode', value: lastRepairResult.dryRun ? 'Preview only' : 'Applied' },
          { label: 'Save attempted', value: lastRepairResult.saveResult?.attempted ? `Yes (${lastRepairResult.saveResult?.label || 'save'})` : 'No' },
          { label: 'Reply', value: lastRepairResult.reply || 'No reply' },
        ])}
        <div>
          <strong>Field operations</strong>
          <ul class="detail-list">
            ${operations.length ? operations.map((operation) => `<li>${escapeHtml(`${operation.kind}: ${operation.applied ? `applied (${operation.target || 'updated'})` : `not applied (${operation.reason || 'unknown'})`}`)}</li>`).join('') : '<li>No direct field operations ran.</li>'}
          </ul>
        </div>
        <div>
          <strong>Unsupported items</strong>
          <ul class="detail-list">
            ${unsupported.length ? unsupported.map((entry) => `<li>${escapeHtml(entry.reason || '')}</li>`).join('') : '<li>No unsupported items returned.</li>'}
          </ul>
        </div>
      </div>
    `;
  }

  function renderRepairPanel(item) {
    const billingStatusOptions = fieldOptionsFor(item, /client billing status/i);
    const providerTypeOptions = fieldOptionsFor(item, /bill provider type/i);
    return `
      <div class="stack">
        <div class="grid three">
          ${renderRepairControl({
            id: 'repair-client-billing-status',
            label: 'Client Billing Status',
            currentValue: item.accountSummary?.clientBillingStatus || '',
            options: billingStatusOptions,
            placeholder: 'e.g. Ready to bill',
          })}
          ${renderRepairControl({
            id: 'repair-bill-provider-type',
            label: 'Bill Provider Type',
            currentValue: item.accountSummary?.billProviderType || '',
            options: providerTypeOptions,
            placeholder: 'e.g. Midwife / Provider type',
          })}
          <label class="stack">
            <span class="muted">Payment Status</span>
            <select id="repair-payment-status">
              <option value="">Leave unchanged</option>
              <option value="yes" ${item.accountSummary?.paymentStatus === 'yes' ? 'selected' : ''}>Yes / started</option>
              <option value="no" ${item.accountSummary?.paymentStatus === 'no' ? 'selected' : ''}>No / not started</option>
            </select>
          </label>
        </div>
        <div class="row-actions">
          <button id="repair-preview-run">Preview Repair</button>
          <button id="repair-apply-run" class="ghost">Apply Repair</button>
        </div>
        <div id="repair-result">${renderRepairResult(item)}</div>
      </div>
    `;
  }

  function renderTodaysFocus() {
    const items = [...(lastAccountReport?.items || [])]
      .sort((a, b) => {
        const ar = ['strong', 'possible', 'slim', 'review', 'unlikely'].indexOf(String(a.recoveryBand?.band || 'review'));
        const br = ['strong', 'possible', 'slim', 'review', 'unlikely'].indexOf(String(b.recoveryBand?.band || 'review'));
        if (ar !== br) return ar - br;
        return String(a.date || '').localeCompare(String(b.date || ''));
      })
      .slice(0, 5);
    return items.length ? `
      <table>
        <thead><tr><th>Client</th><th>Recovery</th><th>Next action</th></tr></thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>${escapeHtml(item.client || '')}</td>
              <td>${escapeHtml(item.recoveryBand?.label || 'Needs review')}</td>
              <td>${escapeHtml(item.diagnosis?.needed?.[0] || 'Manual review')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="muted">No focus list yet.</p>';
  }

  function renderAccountBoard() {
    const container = document.getElementById('account-board');
    const detail = document.getElementById('account-detail');
    if (!container || !detail) return;

    const items = getFilteredItems();
    if (!items.length) {
      container.innerHTML = '<p class="muted">Loading live billing accounts…</p>';
      detail.innerHTML = '<p class="muted">Click an account card to inspect the live billing status, blocker, and next actions.</p>';
      return;
    }

    if (selectedAccountIndex >= items.length) selectedAccountIndex = 0;

    container.innerHTML = renderFilterBar() + items.map((item, index) => {
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

    const item = items[selectedAccountIndex];
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
          <strong>Repair account</strong>
          ${renderRepairPanel(item)}
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
      button.addEventListener('click', async () => {
        selectedAccountIndex = Number(button.getAttribute('data-account-index') || 0);
        renderAccountBoard();
        await inspectSelectedAccount();
      });
    });
    container.querySelectorAll('[data-account-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        setAccountFilter(button.getAttribute('data-account-filter'));
        selectedAccountIndex = 0;
        renderAccountBoard();
      });
    });
  }

  async function inspectSelectedAccount() {
    const item = getFilteredItems()?.[selectedAccountIndex];
    if (!item || item._inspected || !item.raw?.billingHref) return;
    try {
      const result = await api('/api/v1/clientcare-billing/browser/inspect-client-account', {
        method: 'POST',
        body: JSON.stringify({
          client_href: item.raw.billingHref,
          page_timeout_ms: 12000,
        }),
      });
      item.insurancePreview = result.insurancePreview || [];
      item.accountSummary = result.accountSummary || item.accountSummary || {};
      item.raw = {
        ...item.raw,
        billingFields: result.billingFields || [],
        insurancePreview: result.insurancePreview || [],
        accountSummary: result.accountSummary || item.accountSummary || {},
      };
      item._inspected = true;
      renderAccountBoard();
    } catch (_) {
      item._inspected = true;
    }
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
    const forecast = intelligence.collection_forecast || {};
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
          <strong>Collection forecast</strong>
          <p class="hint" style="margin:6px 0 10px 0">${escapeHtml(forecast.assumptions || 'No forecast yet.')}</p>
          <table>
            <thead><tr><th>Window</th><th>Projected amount</th><th>Claims</th></tr></thead>
            <tbody>
              ${(forecast.timing_buckets || []).length ? forecast.timing_buckets.map((bucket) => `
                <tr>
                  <td>${escapeHtml(bucket.label || '')}</td>
                  <td>${escapeHtml(money(bucket.amount || 0))}</td>
                  <td>${escapeHtml(bucket.claims || 0)}</td>
                </tr>
              `).join('') : '<tr><td colspan="3">No claim balances imported yet.</td></tr>'}
            </tbody>
          </table>
          <div class="grid four" style="margin-top:10px; margin-bottom:0">
            <div class="card stat"><span>Projected total</span><strong>${escapeHtml(money(forecast.projected_total || 0))}</strong></div>
            <div class="card stat"><span>Forecast confidence</span><strong>${escapeHtml(forecast.confidence || 'low')}</strong></div>
          </div>
        </div>
        <div>
          <strong>Top projected collections</strong>
          <table>
            <thead><tr><th>Patient</th><th>Payer</th><th>Bucket</th><th>Projected date</th><th>Expected amount</th></tr></thead>
            <tbody>
              ${(forecast.top_claims || []).length ? forecast.top_claims.map((claim) => `
                <tr>
                  <td>${escapeHtml(claim.patient_name || '')}</td>
                  <td>${escapeHtml(claim.payer_name || '')}</td>
                  <td>${escapeHtml(claim.timing_bucket || '')}</td>
                  <td>${escapeHtml(claim.projected_date || '')}</td>
                  <td>${escapeHtml(money(claim.expected_amount || 0))}</td>
                </tr>
              `).join('') : '<tr><td colspan="5">No top projected claims yet.</td></tr>'}
            </tbody>
          </table>
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
              <div class="row-actions">
                <span class="badge ${badgeClass(playbook.count > 10 ? 'warn' : 'ok')}">${escapeHtml(`${playbook.count} accounts`)}</span>
                <button class="ghost" data-run-workflow="${escapeHtml(playbook.id || '')}">Run</button>
              </div>
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

  function renderInsuranceIntakeRule(opsOverview) {
    const rule = opsOverview?.insurance_intake_rule || null;
    if (!rule) return '<p class="muted">No insurance intake rule loaded yet.</p>';
    return `
      <div class="stack">
        <p>${escapeHtml(rule.rule || '')}</p>
        <p class="muted">${escapeHtml(rule.note || '')}</p>
        ${renderKeyValueTable([
          { label: 'Target', value: rule.target || 'Not set' },
          { label: 'Required fields', value: (rule.required_fields || []).join(', ') || 'none' },
        ])}
        <div class="card" style="padding:12px; background:#0f1528;">
          <strong>Preview endpoint</strong>
          <p class="muted" style="margin-top:8px">Use `/api/v1/clientcare-billing/insurance/verification-preview` to check take/review/do-not-schedule decisions before accepting insurance clients.</p>
        </div>
        <div class="card" style="padding:12px; background:#0f1528;">
          <strong>Verification preview</strong>
          <div class="grid two" style="margin-top:12px;">
            <input id="insurance-payer-name" placeholder="Payer name">
            <input id="insurance-member-id" placeholder="Member ID">
            <input id="insurance-billed-amount" type="number" min="0" step="0.01" placeholder="Billed amount">
            <input id="insurance-copay" type="number" min="0" step="0.01" placeholder="Copay">
            <input id="insurance-deductible" type="number" min="0" step="0.01" placeholder="Deductible remaining">
            <input id="insurance-coinsurance" type="number" min="0" step="1" placeholder="Coinsurance %">
            <select id="insurance-coverage-active">
              <option value="">Coverage status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select id="insurance-in-network">
              <option value="">Network status</option>
              <option value="true">In network</option>
              <option value="false">Out of network</option>
            </select>
            <select id="insurance-auth-required">
              <option value="">Authorization</option>
              <option value="true">Required</option>
              <option value="false">Not required</option>
            </select>
          </div>
          <div style="margin-top:10px"><button id="insurance-preview-run">Run preview</button></div>
          <div id="insurance-preview-output" style="margin-top:12px;">
            ${lastInsurancePreview ? `
              <div class="stack">
                ${renderKeyValueTable([
                  { label: 'Decision', value: lastInsurancePreview.decision || 'review' },
                  { label: 'Confidence', value: lastInsurancePreview.confidence || 'low' },
                  { label: 'Estimated insurer payment', value: money(lastInsurancePreview.estimated_insurance_payment || 0) },
                  { label: 'Estimated patient responsibility', value: money(lastInsurancePreview.estimated_patient_responsibility || 0) },
                ])}
                <div><strong>Reasons</strong><ul class="detail-list">${(lastInsurancePreview.reasons || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No reasons returned.</li>'}</ul></div>
                <div><strong>Missing</strong><ul class="detail-list">${(lastInsurancePreview.missing || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No missing fields.</li>'}</ul></div>
              </div>
            ` : '<p class="muted">Run a preview to see take/review/do-not-schedule guidance.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  function renderPatientArSummary(opsOverview) {
    const patientAr = opsOverview?.patient_ar || null;
    const summary = patientAr?.summary || {};
    const topAccounts = patientAr?.top_accounts || [];
    return `
      <div class="stack">
        <div class="grid four" style="margin-bottom:0">
          <div class="card stat"><span>Patient AR</span><strong>${escapeHtml(money(summary.total_balance || 0))}</strong></div>
          <div class="card stat"><span>Accounts</span><strong>${escapeHtml(summary.total_accounts || 0)}</strong></div>
          <div class="card stat"><span>61-90</span><strong>${escapeHtml(money(summary.balance_61_90 || 0))}</strong></div>
          <div class="card stat"><span>90+</span><strong>${escapeHtml(money(summary.balance_90_plus || 0))}</strong></div>
        </div>
        <div>
          <strong>Top patient balances</strong>
          <table>
            <thead><tr><th>Patient</th><th>Payer</th><th>Age</th><th>Balance</th></tr></thead>
            <tbody>
              ${topAccounts.length ? topAccounts.map((item) => `
                <tr>
                  <td>${escapeHtml(item.patient_name || '')}</td>
                  <td>${escapeHtml(item.payer_name || '')}</td>
                  <td>${escapeHtml(item.age_bucket || '')}</td>
                  <td>${escapeHtml(money(item.patient_balance || 0))}</td>
                </tr>
              `).join('') : '<tr><td colspan="4">No patient balances imported yet.</td></tr>'}
            </tbody>
          </table>
        </div>
        <div>
          <strong>Recommendations</strong>
          <ul class="detail-list">
            ${(patientAr?.recommendations || ['No patient AR recommendations yet.']).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  function renderCapabilityQueue(opsOverview) {
    const requests = opsOverview?.open_capability_requests || [];
    return `
      <table>
        <thead><tr><th>Request</th><th>Priority</th><th>Status</th><th>Requested by</th></tr></thead>
        <tbody>
          ${requests.length ? requests.map((item) => `
            <tr>
              <td>${escapeHtml(item.request_text || '')}</td>
              <td><span class="badge ${badgeClass(item.priority)}">${escapeHtml(item.priority || 'normal')}</span></td>
              <td>${escapeHtml(item.status || '')}</td>
              <td>${escapeHtml(item.requested_by || '')}</td>
            </tr>
          `).join('') : '<tr><td colspan="4">No queued capability requests.</td></tr>'}
        </tbody>
      </table>
    `;
  }

  function renderUnderpaymentQueue(underpayments) {
    const summary = underpayments?.summary || {};
    const items = underpayments?.items || [];
    return `
      <div class="stack">
        <div class="grid three">
          <div class="card stat"><span>Claims</span><strong>${escapeHtml(summary.total_claims || 0)}</strong></div>
          <div class="card stat"><span>Short-paid total</span><strong>${escapeHtml(money(summary.total_short_paid || 0))}</strong></div>
          <div class="card stat"><span>Avg short-pay</span><strong>${escapeHtml(money(summary.average_short_paid || 0))}</strong></div>
        </div>
        <table>
          <thead><tr><th>Patient</th><th>Payer</th><th>Expected</th><th>Paid</th><th>Short-pay</th><th>Next action</th><th></th></tr></thead>
          <tbody>
            ${items.length ? items.slice(0, 12).map((item) => `
              <tr>
                <td>${escapeHtml(item.patient_name || '')}</td>
                <td>${escapeHtml(item.payer_name || '')}</td>
                <td>${escapeHtml(money(item.expected_insurer_payment || 0))}</td>
                <td>${escapeHtml(money(item.paid_amount || 0))}</td>
                <td>${escapeHtml(money(item.short_paid_amount || 0))}</td>
                <td>${escapeHtml(item.next_action || '')}</td>
                <td><button data-underpayment-queue="${item.id}" class="ghost">Queue review</button></td>
              </tr>
            `).join('') : '<tr><td colspan="7">No underpayment candidates yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAppealsQueue(appeals) {
    const summary = appeals?.summary || {};
    const items = appeals?.items || [];
    return `
      <div class="stack">
        <div class="grid three">
          <div class="card stat"><span>Claims</span><strong>${escapeHtml(summary.total_claims || 0)}</strong></div>
          <div class="card stat"><span>Top playbooks</span><strong>${escapeHtml((summary.by_playbook || []).length || 0)}</strong></div>
          <div class="card stat"><span>Top denial path</span><strong>${escapeHtml(summary.top_denial_reason || '—')}</strong></div>
        </div>
        <table>
          <thead><tr><th>Patient</th><th>Payer</th><th>Playbook</th><th>Outstanding</th><th>Path</th><th></th></tr></thead>
          <tbody>
            ${items.length ? items.slice(0, 12).map((item) => `
              <tr>
                <td>${escapeHtml(item.patient_name || '')}</td>
                <td>${escapeHtml(item.payer_name || '')}</td>
                <td>${escapeHtml(item.playbook?.title || '')}</td>
                <td>${escapeHtml(money(item.outstanding_amount || 0))}</td>
                <td>${escapeHtml(item.playbook?.likely_path || '')}</td>
                <td class="row-actions">
                  <button data-appeal-packet="${item.id}" class="ghost">Packet</button>
                  <button data-appeal-queue="${item.id}" class="ghost">Queue follow-up</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6">No appeals queue yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPayerPlaybooks(playbooks) {
    const summary = playbooks?.summary || {};
    const items = playbooks?.items || [];
    return `
      <div class="stack">
        <div class="grid four">
          <div class="card stat"><span>Payers</span><strong>${escapeHtml(summary.total_payers || 0)}</strong></div>
          <div class="card stat"><span>Commercial</span><strong>${escapeHtml(summary.commercial_payers || 0)}</strong></div>
          <div class="card stat"><span>Govt</span><strong>${escapeHtml((summary.medicare_payers || 0) + (summary.medicaid_payers || 0))}</strong></div>
          <div class="card stat"><span>Tracked unpaid</span><strong>${escapeHtml(money(summary.total_unpaid_balance || 0))}</strong></div>
        </div>
        <table>
          <thead><tr><th>Payer</th><th>Avg days</th><th>Top denial</th><th>Recommendation</th></tr></thead>
          <tbody>
            ${items.length ? items.slice(0, 10).map((item) => `
              <tr>
                <td>${escapeHtml(item.payer_name || '')}</td>
                <td>${escapeHtml(item.avg_days_to_pay ?? '—')}</td>
                <td>${escapeHtml(item.top_denial_category || 'unknown')}</td>
                <td>${escapeHtml(item.recommendations?.[0] || 'Review payer history')}</td>
              </tr>
            `).join('') : '<tr><td colspan="4">No payer playbooks yet.</td></tr>'}
          </tbody>
        </table>
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
    lastBrowserResult = result || null;
    const node = document.getElementById('browser-output');
    if (node) node.innerHTML = renderBrowserOutput(result);
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
      const [dashboard, readiness, template, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals] = await Promise.all([
        api('/api/v1/clientcare-billing/dashboard'),
        api('/api/v1/clientcare-billing/clientcare/readiness'),
        api('/api/v1/clientcare-billing/claims/import-template'),
        api(`/api/v1/clientcare-billing/claims${query ? `?${query}` : ''}`),
        api('/api/v1/clientcare-billing/actions'),
        api('/api/v1/clientcare-billing/reconciliation'),
        api('/api/v1/clientcare-billing/reimbursement-intelligence'),
        api('/api/v1/clientcare-billing/payer-playbooks?limit=25'),
        api('/api/v1/clientcare-billing/ops/overview'),
        api('/api/v1/clientcare-billing/underpayments?limit=100'),
        api('/api/v1/clientcare-billing/appeals/queue?limit=100'),
      ]);
      lastReimbursementIntelligence = intelligence.intelligence || null;
      lastPayerPlaybooks = payerPlaybooks || null;
      lastOpsOverview = opsOverview.overview || null;
      lastUnderpayments = underpayments || null;
      lastAppeals = appeals || null;
      render(root, dashboard.dashboard, readiness.readiness, template.fields || [], claims.claims || [], actions.actions || [], reconciliation.summary || {}, lastReimbursementIntelligence, lastPayerPlaybooks, lastOpsOverview, lastUnderpayments, lastAppeals);
      await ensureAssistantSession();
      if (!options.skipAutoFullQueue && getApiKey() && readiness.readiness?.ready && !fullQueueHydrated && !fullQueueLoading) {
        fullQueueLoading = true;
        browserBacklogSummary({ silent: true }).finally(() => {
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

  async function importPaymentHistoryCsv() {
    const csv = document.getElementById('payment-history-input')?.value || '';
    if (!csv.trim()) return alert('Paste payment history / ERA CSV first.');
    try {
      const result = await api('/api/v1/clientcare-billing/history/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv, source: 'overlay_payment_history_import' }),
      });
      alert(`Imported ${result.imported || 0} payment-history rows.`);
      await loadDashboard({}, { skipAutoFullQueue: true });
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
      rerender();
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
          billingHref: item.billingHref || '',
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
      rerender();
      if (!silent) alert(`Loaded ${result.accounts?.length || 0} accounts from the full billing queue.`);
    } catch (error) {
      if (!silent) alert(error.message);
    }
  }

  async function browserBacklogSummary({ silent = false } = {}) {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/backlog-summary?max_pages=12&page_timeout_ms=12000&account_limit=200');
      lastAccountReport = {
        summary: result.summary || null,
        items: (result.accounts || []).map((item) => ({
          client: item.client,
          billingHref: item.billingHref || '',
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
      setBrowserOutput(result);
      rerender();
      if (!silent) alert(`Loaded ${result.accounts?.length || 0} backlog accounts.`);
    } catch (error) {
      if (!silent) alert(error.message);
    }
  }

  async function ensureAssistantSession() {
    const container = document.getElementById('assistant-history');
    if (!assistantSessionId) {
      const created = await api('/api/v1/clientcare-billing/assistant/session', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setAssistantSessionId(created.session_id);
    }
    const session = await api(`/api/v1/clientcare-billing/assistant/session/${encodeURIComponent(assistantSessionId)}`);
    renderAssistant(session);
  }

  function renderAssistant(session) {
    const historyNode = document.getElementById('assistant-history');
    const metaNode = document.getElementById('assistant-meta');
    if (!historyNode || !metaNode) return;
    metaNode.innerHTML = `
      <span class="badge ${badgeClass('ok')}">${escapeHtml(session.archived_count || 0)} archived</span>
      <span class="muted small">${escapeHtml(session.archive_preview || 'Direct connection to the system assistant')}</span>
    `;
    const messages = session.recent_messages || [];
    historyNode.innerHTML = messages.length ? messages.map((message) => `
      <div class="card" style="padding:12px; background:${message.role === 'assistant' ? '#121a31' : '#0f1528'};">
        <div class="account-card-top">
          <strong>${escapeHtml(String(message.role || '').toUpperCase())}</strong>
          <span class="muted small">${escapeHtml(message.timestamp || '')}</span>
        </div>
        <div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(message.content || '')}</div>
        ${message.metadata?.intent ? `<div class="muted small" style="margin-top:8px;">Intent: ${escapeHtml(message.metadata.intent)} · Scope: ${escapeHtml(message.metadata.scope || 'unclear')}</div>` : ''}
      </div>
    `).join('') : '<p class="muted">Start a conversation.</p>';
  }

  function renderAssistantShell() {
    const pinnedLabel = assistantPinned ? 'Unpin chat' : 'Pin chat';
    const collapseLabel = assistantOpen ? 'Collapse' : 'Open';
    return `
      <div class="assistant-shell ${assistantPinned ? 'pinned' : 'floating'} ${assistantOpen ? 'open' : 'closed'}">
        <div class="card assistant-card">
          <div class="account-card-top">
            <div>
              <h2>Operations Assistant</h2>
              <p class="muted">Direct system connection with running history.</p>
            </div>
            <div class="row-actions">
              <button id="assistant-pin-toggle" class="ghost">${escapeHtml(pinnedLabel)}</button>
              <button id="assistant-open-toggle" class="ghost">${escapeHtml(collapseLabel)}</button>
            </div>
          </div>
          <div id="assistant-panel" style="${assistantOpen ? '' : 'display:none;'}">
            <div id="assistant-meta" class="row-actions" style="margin:10px 0"></div>
            <div id="assistant-history" class="stack assistant-history"></div>
            <textarea id="assistant-input" placeholder="Type a question, command, or requested system change here"></textarea>
            <div style="margin-top:10px"><button id="assistant-send">Send</button></div>
          </div>
        </div>
      </div>
    `;
  }

  async function sendAssistantMessage() {
    const input = document.getElementById('assistant-input');
    const message = String(input?.value || '').trim();
    if (!message) return;
    input.value = '';
    try {
      await api('/api/v1/clientcare-billing/assistant/message', {
        method: 'POST',
        body: JSON.stringify({
          session_id: assistantSessionId,
          message,
        }),
      });
      await ensureAssistantSession();
    } catch (error) {
      alert(error.message);
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

  async function runInsurancePreview() {
    try {
      const parseBool = (value) => value === 'true' ? true : value === 'false' ? false : null;
      const payload = {
        payer_name: document.getElementById('insurance-payer-name')?.value || '',
        member_id: document.getElementById('insurance-member-id')?.value || '',
        billed_amount: Number(document.getElementById('insurance-billed-amount')?.value || 0) || null,
        copay: Number(document.getElementById('insurance-copay')?.value || 0) || null,
        deductible_remaining: Number(document.getElementById('insurance-deductible')?.value || 0) || null,
        coinsurance_pct: Number(document.getElementById('insurance-coinsurance')?.value || 0) || null,
        coverage_active: parseBool(document.getElementById('insurance-coverage-active')?.value || ''),
        in_network: parseBool(document.getElementById('insurance-in-network')?.value || ''),
        auth_required: parseBool(document.getElementById('insurance-auth-required')?.value || ''),
      };
      const result = await api('/api/v1/clientcare-billing/insurance/verification-preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      lastInsurancePreview = result.preview || null;
      rerender();
    } catch (error) {
      alert(error.message);
    }
  }

  async function runWorkflow(workflowId) {
    try {
      const result = await api('/api/v1/clientcare-billing/ops/run-workflow', {
        method: 'POST',
        body: JSON.stringify({ workflow_id: workflowId, requested_by: 'overlay' }),
      });
      const lines = [
        result.reply || 'Workflow loaded.',
        '',
        ...(result.workflow?.steps || []),
      ].filter(Boolean);
      alert(lines.join('\n'));
      await browserBacklogSummary({ silent: true });
    } catch (error) {
      alert(error.message);
    }
  }

  async function runAccountRepair(apply) {
    const item = getFilteredItems()?.[selectedAccountIndex];
    const billingHref = item?.billingHref || item?.raw?.billingHref || '';
    if (!billingHref) {
      alert('No billing account selected.');
      return;
    }

    const updates = {};
    const billingStatus = document.getElementById('repair-client-billing-status')?.value?.trim();
    const providerType = document.getElementById('repair-bill-provider-type')?.value?.trim();
    const paymentStatus = document.getElementById('repair-payment-status')?.value?.trim();
    if (billingStatus) updates.client_billing_status = billingStatus;
    if (providerType) updates.bill_provider_type = providerType;
    if (paymentStatus) updates.payment_status = paymentStatus;

    if (!Object.keys(updates).length) {
      alert('Choose at least one repair field before previewing or applying.');
      return;
    }

    try {
      const result = await api('/api/v1/clientcare-billing/ops/repair-account', {
        method: 'POST',
        body: JSON.stringify({
          billing_href: billingHref,
          account: item,
          updates,
          dry_run: !apply,
          requested_by: 'overlay',
        }),
      });
      lastRepairResult = result;
      if (apply) {
        await browserBacklogSummary({ silent: true });
      } else {
        renderAccountBoard();
      }
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

  async function showAppealPacket(id) {
    try {
      const packet = await api(`/api/v1/clientcare-billing/appeals/${id}/packet`);
      document.getElementById('claim-plan').innerHTML = `
        <h3>${escapeHtml(packet.claim.patient_name || packet.claim.claim_number || `Claim ${id}`)}</h3>
        <p class="muted">${escapeHtml(packet.claim.payer_name || '')} · DOS ${escapeHtml(packet.claim.date_of_service || '')}</p>
        <p style="margin-top:10px"><span class="badge ${badgeClass(packet.playbook?.playbook_id || 'review')}">${escapeHtml(packet.playbook?.title || 'Appeal review')}</span></p>
        <div class="stack" style="margin-top:12px">
          ${renderKeyValueTable([
            { label: 'Outstanding', value: money(packet.outstanding_amount || 0) },
            { label: 'Likely path', value: packet.playbook?.likely_path || 'Review' },
            { label: 'Confidence', value: packet.playbook?.confidence || 'low' },
          ])}
          <div><strong>Evidence checklist</strong><pre>${escapeHtml((packet.playbook?.evidence || []).map((item) => `- ${item}`).join('\n') || 'None')}</pre></div>
          <div><strong>Draft letter</strong><pre>${escapeHtml(packet.draft_letter || 'No draft letter generated.')}</pre></div>
          <div class="row-actions">
            <button data-appeal-packet-queue="${packet.claim.id}">Queue packet prep</button>
            <button data-appeal-followup-queue="${packet.claim.id}" class="ghost">Queue follow-up</button>
          </div>
        </div>
      `;
      document.querySelector('[data-appeal-packet-queue]')?.addEventListener('click', () => queueAppealAction(id, 'appeal_packet'));
      document.querySelector('[data-appeal-followup-queue]')?.addEventListener('click', () => queueAppealAction(id, 'appeal_followup'));
    } catch (error) {
      alert(error.message);
    }
  }

  async function queueAppealAction(id, actionType = 'appeal_followup') {
    try {
      const result = await api(`/api/v1/clientcare-billing/appeals/${id}/queue-action`, {
        method: 'POST',
        body: JSON.stringify({
          owner: 'overlay',
          action_type: actionType,
        }),
      });
      alert(`Queued ${actionType === 'appeal_packet' ? 'appeal packet prep' : 'appeal follow-up'} for claim ${id}.`);
      if (result?.packet) {
        document.getElementById('claim-plan').innerHTML = `
          <h3>${escapeHtml(result.packet.claim.patient_name || result.packet.claim.claim_number || `Claim ${id}`)}</h3>
          <p class="muted">Action queued successfully.</p>
          ${renderKeyValueTable([
            { label: 'Action', value: result.action?.summary || '' },
            { label: 'Priority', value: result.action?.priority || '' },
            { label: 'Status', value: result.action?.status || '' },
          ])}
          <div><strong>Draft letter</strong><pre>${escapeHtml(result.packet.draft_letter || 'No draft letter generated.')}</pre></div>
        `;
      }
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  async function queueUnderpaymentAction(id) {
    try {
      const result = await api(`/api/v1/clientcare-billing/underpayments/${id}/queue-action`, {
        method: 'POST',
        body: JSON.stringify({
          owner: 'overlay',
          action_type: 'underpayment_review',
        }),
      });
      if (result.skipped) {
        alert(result.reason || 'This claim does not need an underpayment action.');
        return;
      }
      document.getElementById('claim-plan').innerHTML = `
        <h3>${escapeHtml(result.claim.patient_name || result.claim.claim_number || `Claim ${id}`)}</h3>
        <p class="muted">Underpayment review queued successfully.</p>
        ${renderKeyValueTable([
          { label: 'Expected insurer payment', value: money(result.expected_insurer_payment || 0) },
          { label: 'Short-paid amount', value: money(result.short_paid_amount || 0) },
          { label: 'Action', value: result.action?.summary || '' },
        ])}
        <div><strong>Next step</strong><pre>${escapeHtml(result.action?.details || 'No details available.')}</pre></div>
      `;
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  function render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals) {
    saveViewState(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals);
    const summary = dashboard.summary || {};
    const liveSummary = lastAccountReport?.summary || null;
    const patientArSummary = opsOverview?.patient_ar?.summary || {};
    const forecastBuckets = intelligence?.collection_forecast?.timing_buckets || [];
    const bucket30 = forecastBuckets.find((b) => b.label === '0-30 days');
    const bucket60 = forecastBuckets.find((b) => b.label === '31-60 days');
    const topCards = [
      { label: 'Live accounts', value: liveSummary ? (liveSummary.totalAccounts || 0) : 'Loading…' },
      { label: 'Billing notes', value: liveSummary ? (liveSummary.totalQueueItems || 0) : 'Loading…' },
      { label: 'Projected 30d', value: liveSummary ? money(bucket30?.amount || 0) : 'Loading…' },
      { label: 'Projected 60d', value: liveSummary ? money(bucket60?.amount || 0) : 'Loading…' },
      { label: 'Strong/possible', value: liveSummary ? ((liveSummary.recoveryBandCounts?.strong || 0) + (liveSummary.recoveryBandCounts?.possible || 0)) : 'Loading…' },
      { label: 'Insurance setup', value: liveSummary ? (liveSummary.diagnosisCounts?.insurance_setup_issue || 0) : 'Loading…' },
      { label: 'Patient AR', value: escapeHtml(money(patientArSummary.total_balance || 0)) },
      { label: '90+ patient AR', value: escapeHtml(money(patientArSummary.balance_90_plus || 0)) },
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
          <h1>Collections Control Center</h1>
          <p class="muted">Live billing backlog, collections forecasting, and operator controls.</p>
        </div>
        <div class="card" style="min-width:320px;">
          <label for="api-key">Command key</label>
          <input id="api-key" type="password" value="${escapeHtml(getApiKey())}" placeholder="x-api-key">
          <div style="margin-top:10px"><button id="save-key">Save key</button></div>
        </div>
      </div>

      <div class="grid four kpi-grid">
        ${topCards.map((card) => `
          <div class="card stat"><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong></div>
        `).join('')}
      </div>

      <div class="workspace ${assistantPinned ? 'assistant-pinned' : 'assistant-floating'}">
        <div class="main-workspace">
          <div class="grid two">
            <div class="card">
              <h2>Today’s Focus</h2>
              <p class="hint" style="margin:10px 0">Start here. Highest-value accounts first.</p>
              ${renderTodaysFocus()}
            </div>
            <div class="card">
              <h2>Batch Workflows</h2>
              <p class="hint" style="margin:10px 0">Work the backlog by blocker instead of one account at a time.</p>
              <div id="workflow-playbooks">${renderWorkflowPlaybooks(lastAccountReport?.summary || {})}</div>
            </div>
          </div>

          <div class="grid two">
            <div class="card">
              <h2>Accounts Needing Action</h2>
              <p class="hint" style="margin:10px 0">Hover for a summary. Click for full detail.</p>
              <div id="account-board" class="account-board"><p class="muted">Loading live billing accounts…</p></div>
            </div>
            <div class="card">
              <h2>Account Recovery Detail</h2>
              <div id="account-detail"><p class="muted">Click an account card to inspect the live billing status, blocker, and next actions.</p></div>
            </div>
          </div>

          <details class="card tools-card">
            <summary>Tools</summary>
            <div class="stack" style="margin-top:16px;">
              <div class="grid two">
                <div class="card">
                  <h2>Browser fallback readiness</h2>
                  <p style="margin:10px 0"><span class="badge ${badgeClass(readiness.ready ? 'ready' : 'warn')}">${readiness.ready ? 'ready' : 'not ready'}</span></p>
                  ${renderReadiness(readiness)}
                </div>
                <div class="card">
                  <h2>Browser automation</h2>
                  <p class="hint" style="margin:10px 0">Diagnostics and extraction tools.</p>
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
              </div>

              <div class="grid two">
                <div class="card">
                  <h2>Imports</h2>
                  <p class="hint" style="margin:10px 0">Paste CSV from ClientCare exports or snapshot text as fallback.</p>
                  ${renderImportTemplate(templateFields)}
                  <textarea id="csv-input" placeholder="Paste claim export CSV here"></textarea>
                  <div style="margin-top:10px"><button id="import-csv">Import CSV</button></div>
                  <hr style="border-color:#27304a; margin:16px 0;">
                  <textarea id="payment-history-input" placeholder="Paste paid claims / ERA / remit CSV here"></textarea>
                  <div style="margin-top:10px"><button id="import-payment-history">Import Payment History</button></div>
                  <hr style="border-color:#27304a; margin:16px 0;">
                  <textarea id="snapshot-input" placeholder="Paste copied table HTML or delimited text here"></textarea>
                  <div style="margin-top:10px"><button id="import-snapshot">Import Snapshot</button></div>
                </div>
                <div class="card">
                  <h2>Browser Output</h2>
                  <div id="browser-output"><p class="muted">No browser run yet.</p></div>
                </div>
              </div>
            </div>
          </details>

          <div class="grid two">
            <div class="card">
              <h2>Collections Forecast</h2>
              <p class="hint" style="margin:10px 0">Projection improves as paid claims, ERAs, and remits are imported.</p>
              <div id="reimbursement-intelligence">${renderReimbursementIntelligence(intelligence)}</div>
              <hr style="border-color:#27304a; margin:16px 0;">
              <h3>Patient AR</h3>
              <div id="patient-ar-summary">${renderPatientArSummary(opsOverview)}</div>
            </div>
            <div class="card">
              <h2>Claims Ledger</h2>
              <div class="stack">
                <div class="card">
                  <h3>Insurance Intake Rule</h3>
                  <div id="insurance-intake-rule">${renderInsuranceIntakeRule(opsOverview)}</div>
                </div>
                <div class="card">
                  <h3>Reconciliation</h3>
                  ${renderReconciliation(reconciliation)}
                </div>
                <div class="card">
                  <h3>Claims</h3>
                  <table>
                    <thead><tr><th>Patient</th><th>Payer</th><th>DOS</th><th>Status</th><th>Bucket</th><th>Priority</th><th>Balance</th><th>Actions</th></tr></thead>
                    <tbody>${claimRows}</tbody>
                  </table>
                </div>
                <div class="card">
                  <h3>Open actions</h3>
                  <table>
                    <thead><tr><th>Patient</th><th>Action</th><th>Priority</th><th>Status</th><th>Evidence</th><th></th></tr></thead>
                    <tbody>${actionRows}</tbody>
                  </table>
                </div>
                <div class="card" id="claim-plan">
                  <h3>Claim plan</h3>
                  <p class="muted">Select a claim to inspect its filing rule, rescue bucket, and recommended actions.</p>
                </div>
                <div class="card">
                  <h3>Capability Queue</h3>
                  <div id="capability-queue">${renderCapabilityQueue(opsOverview)}</div>
                </div>
                <div class="card">
                  <h3>Underpayment Queue</h3>
                  <div id="underpayment-queue">${renderUnderpaymentQueue(underpayments)}</div>
                </div>
                <div class="card">
                  <h3>Appeals Queue</h3>
                  <div id="appeals-queue">${renderAppealsQueue(appeals)}</div>
                </div>
                <div class="card">
                  <h3>Payer Playbooks</h3>
                  <div id="payer-playbooks">${renderPayerPlaybooks(payerPlaybooks)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ${renderAssistantShell()}
      </div>
    `;

    document.getElementById('save-key').addEventListener('click', async () => {
      setApiKey(document.getElementById('api-key').value);
      await loadDashboard();
    });
    document.getElementById('import-csv').addEventListener('click', importCsv);
    document.getElementById('import-payment-history').addEventListener('click', importPaymentHistoryCsv);
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
    document.getElementById('assistant-send').addEventListener('click', sendAssistantMessage);
    document.getElementById('assistant-pin-toggle').addEventListener('click', () => {
      setAssistantPinned(!assistantPinned);
      render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals);
      ensureAssistantSession();
    });
    document.getElementById('assistant-open-toggle').addEventListener('click', () => {
      setAssistantOpen(!assistantOpen);
      render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, opsOverview, underpayments, appeals);
      ensureAssistantSession();
    });
    document.getElementById('assistant-input').addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') sendAssistantMessage();
    });
    const insurancePreviewButton = document.getElementById('insurance-preview-run');
    if (insurancePreviewButton) insurancePreviewButton.addEventListener('click', runInsurancePreview);
    const repairPreviewButton = document.getElementById('repair-preview-run');
    if (repairPreviewButton) repairPreviewButton.addEventListener('click', () => runAccountRepair(false));
    const repairApplyButton = document.getElementById('repair-apply-run');
    if (repairApplyButton) repairApplyButton.addEventListener('click', () => runAccountRepair(true));
    root.querySelectorAll('[data-claim-view]').forEach((button) => button.addEventListener('click', () => showClaim(button.getAttribute('data-claim-view'))));
    root.querySelectorAll('[data-claim-reclassify]').forEach((button) => button.addEventListener('click', () => reclassify(button.getAttribute('data-claim-reclassify'))));
    root.querySelectorAll('[data-action-complete]').forEach((button) => button.addEventListener('click', () => completeAction(button.getAttribute('data-action-complete'))));
    root.querySelectorAll('[data-underpayment-queue]').forEach((button) => button.addEventListener('click', () => queueUnderpaymentAction(button.getAttribute('data-underpayment-queue'))));
    root.querySelectorAll('[data-appeal-packet]').forEach((button) => button.addEventListener('click', () => showAppealPacket(button.getAttribute('data-appeal-packet'))));
    root.querySelectorAll('[data-appeal-queue]').forEach((button) => button.addEventListener('click', () => queueAppealAction(button.getAttribute('data-appeal-queue'), 'appeal_followup')));
    renderAccountBoard();
    if (lastBrowserResult) setBrowserOutput(lastBrowserResult);
    const workflowNode = document.getElementById('workflow-playbooks');
    if (workflowNode) workflowNode.innerHTML = renderWorkflowPlaybooks(lastAccountReport?.summary || {});
    root.querySelectorAll('[data-run-workflow]').forEach((button) => button.addEventListener('click', () => runWorkflow(button.getAttribute('data-run-workflow'))));
  }

  loadDashboard();
})();
