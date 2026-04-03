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
  let lastPayerRules = null;
  let lastEraInsights = null;
  let lastPatientArPolicy = null;
  let lastPatientArEscalation = null;
  let lastUnderpayments = null;
  let lastAppeals = null;
  let lastOpsOverview = null;
  let lastPackagingOverview = null;
  let lastPackagingValidation = null;
  let lastPackagingValidationHistory = null;
  let lastBrowserResult = null;
  let lastViewState = null;
  let lastInsuranceDraft = {
    payer_name: '',
    member_id: '',
    billed_amount: '',
    copay: '',
    deductible_remaining: '',
    coinsurance_pct: '',
    coverage_active: '',
    in_network: '',
    auth_required: '',
    source_label: '',
  };
  const repairSlotByHref = new Map();
  let fullQueueHydrated = false;
  let fullQueueLoading = false;
  let assistantSessionId = localStorage.getItem('clientcare_assistant_session_id') || '';
  let accountFilter = localStorage.getItem('clientcare_account_filter') || 'operator';
  let selectedTenantId = localStorage.getItem('clientcare_selected_tenant_id') || '';
  let assistantPinned = localStorage.getItem('clientcare_assistant_pinned') !== 'false';
  let assistantOpen = localStorage.getItem('clientcare_assistant_open') !== 'false';
  let assistantVoiceController = null;
  let lastAssistantVoiceKey = '';
  let assistantVoiceReady = false;

  function getApiKey() {
    return localStorage.getItem('COMMAND_CENTER_KEY') || localStorage.getItem('lifeos_cmd_key') || localStorage.getItem('x_api_key') || '';
  }

  function setApiKey(value) {
    localStorage.setItem('COMMAND_CENTER_KEY', value);
    localStorage.setItem('lifeos_cmd_key', value);
    localStorage.setItem('x_api_key', value);
  }

  function getOperatorEmail() {
    return localStorage.getItem('clientcare_operator_email') || '';
  }

  function setOperatorEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    if (email) localStorage.setItem('clientcare_operator_email', email);
    else localStorage.removeItem('clientcare_operator_email');
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

  function setSelectedTenantId(value) {
    selectedTenantId = String(value || '');
    if (selectedTenantId) localStorage.setItem('clientcare_selected_tenant_id', selectedTenantId);
    else localStorage.removeItem('clientcare_selected_tenant_id');
  }

  function getRepairKey(item = {}) {
    return item?.billingHref || item?.raw?.billingHref || item?.client || '';
  }

  function getSelectedRepairSlot(item = {}) {
    const key = getRepairKey(item);
    if (!key) return 0;
    const stored = repairSlotByHref.get(key);
    return Number.isFinite(stored) ? stored : 0;
  }

  function setSelectedRepairSlot(item = {}, slot = 0) {
    const key = getRepairKey(item);
    if (!key) return;
    repairSlotByHref.set(key, Math.max(0, Math.floor(Number(slot) || 0)));
  }

  function getSelectedAccountItem() {
    return getFilteredItems()?.[selectedAccountIndex] || null;
  }

  function saveViewState(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, packagingValidation, packagingValidationHistory) {
    lastViewState = { root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, packagingValidation, packagingValidationHistory };
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
      lastViewState.payerRules,
      lastViewState.eraInsights,
      lastViewState.patientArPolicy,
      lastViewState.patientArEscalation,
      lastViewState.opsOverview,
      lastViewState.underpayments,
      lastViewState.appeals,
      lastViewState.packagingOverview,
      lastViewState.packagingValidation,
      lastViewState.packagingValidationHistory,
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
    if (/ready|resolved|submit_now|correct_and_resubmit|proof_of_timely_filing|ok|green|healthy/.test(v)) return 'ok';
    if (/timely_filing_exception|payer_followup|normal|review|warn|yellow|watch/.test(v)) return 'warn';
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

  function normalizeFlagList(item) {
    return (item.accountSummary?.flags || []).map((flag) => String(flag || '').toLowerCase());
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

  function deriveAccountVisualState(item) {
    const status = String(item.diagnosis?.status || 'review').toLowerCase();
    const flags = normalizeFlagList(item);
    const needed = item.diagnosis?.needed || [];
    const wrong = item.diagnosis?.whatWentWrong || [];
    const missingInsurer = !(item.accountSummary?.insurers || []).length;
    const needsOperatorRepair =
      missingInsurer ||
      flags.includes('billing_status_blank') ||
      flags.includes('bill_provider_type_blank') ||
      ['client_match_issue', 'insurance_setup_issue', 'billing_configuration_issue'].includes(status);

    if (needsOperatorRepair) {
      return {
        state: 'red',
        ringLabel: 'You',
        owner: 'You',
        summary: needed[0] || wrong[0] || 'Operator repair is required before this account can move cleanly.',
      };
    }

    const systemWatch =
      status === 'review' ||
      item.accountSummary?.paymentStatus === 'no' ||
      ['strong', 'possible', 'slim'].includes(String(item.recoveryBand?.band || '').toLowerCase());

    if (systemWatch) {
      return {
        state: 'yellow',
        ringLabel: 'Watch',
        owner: 'System',
        summary: needed[0] || wrong[0] || 'The system is tracking this account, but it is not blocked on you right now.',
      };
    }

    return {
      state: 'green',
      ringLabel: 'OK',
      owner: 'Healthy',
      summary: 'No operator action is currently needed on this account.',
    };
  }

  function buildAccountTodoItems(item) {
    const visual = deriveAccountVisualState(item);
    const needed = item.diagnosis?.needed || [];
    const wrong = item.diagnosis?.whatWentWrong || [];
    const items = [];

    if (visual.state === 'red') {
      (needed.length ? needed : [wrong[0] || 'Review the live billing page and apply the repair.'])
        .slice(0, 3)
        .forEach((entry, index) => {
          items.push({
            id: `repair-${index}`,
            owner: 'You',
            urgency: 'red',
            label: entry,
            button: 'Fix now',
            action: 'repair',
          });
        });
      return items;
    }

    if (visual.state === 'yellow') {
      return [{
        id: 'watch',
        owner: 'System',
        urgency: 'yellow',
        label: needed[0] || wrong[0] || 'Keep the account moving and verify the next billing step.',
        button: 'Inspect status',
        action: 'inspect',
      }];
    }

    return [{
      id: 'healthy',
      owner: 'Healthy',
      urgency: 'green',
      label: 'No immediate billing repair is required.',
      button: 'Inspect anyway',
      action: 'inspect',
    }];
  }

  function buildInsuranceDraftFromAccount(item = {}) {
    const selectedInsurance = (item.insurancePreview || [])[getSelectedRepairSlot(item)] || (item.insurancePreview || [])[0] || {};
    return {
      payer_name: selectedInsurance.insuranceName || '',
      member_id: selectedInsurance.memberId || '',
      billed_amount: item.accountSummary?.balance || '',
      copay: '',
      deductible_remaining: '',
      coinsurance_pct: '',
      coverage_active: '',
      in_network: '',
      auth_required: '',
      source_label: item.client || '',
    };
  }

  function ensureInsuranceDraftSeed() {
    const hasManualValue = ['payer_name', 'member_id', 'billed_amount'].some((key) => String(lastInsuranceDraft?.[key] || '').trim());
    if (hasManualValue) return;
    const item = getSelectedAccountItem();
    if (!item) return;
    lastInsuranceDraft = { ...lastInsuranceDraft, ...buildInsuranceDraftFromAccount(item) };
  }

  function syncInsuranceDraftFromDom() {
    const read = (id) => document.getElementById(id)?.value || '';
    if (!document.getElementById('insurance-payer-name')) return lastInsuranceDraft;
    lastInsuranceDraft = {
      payer_name: read('insurance-payer-name').trim(),
      member_id: read('insurance-member-id').trim(),
      billed_amount: read('insurance-billed-amount').trim(),
      copay: read('insurance-copay').trim(),
      deductible_remaining: read('insurance-deductible').trim(),
      coinsurance_pct: read('insurance-coinsurance').trim(),
      coverage_active: read('insurance-coverage-active'),
      in_network: read('insurance-in-network'),
      auth_required: read('insurance-auth-required'),
      source_label: lastInsuranceDraft.source_label || '',
    };
    return lastInsuranceDraft;
  }

  function useSelectedAccountInVob() {
    const item = getSelectedAccountItem();
    if (!item) return;
    lastInsuranceDraft = {
      ...lastInsuranceDraft,
      ...buildInsuranceDraftFromAccount(item),
    };
    rerender();
    document.getElementById('verification-of-benefits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getFilteredItems() {
    const items = lastAccountReport?.items || [];
    const sorted = [...items].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    switch (accountFilter) {
      case 'operator':
        return sorted.filter((item) => deriveAccountVisualState(item).state === 'red');
      case 'watch':
        return sorted.filter((item) => deriveAccountVisualState(item).state === 'yellow');
      case 'healthy':
        return sorted.filter((item) => deriveAccountVisualState(item).state === 'green');
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
        return sorted;
    }
  }

  function renderFilterBar() {
    const filters = [
      ['operator', 'Needs Me'],
      ['watch', 'Watching'],
      ['healthy', 'Healthy'],
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
    const insuranceNameOptions = fieldOptionsFor(item, /insurance name|carrier|payer name/i);
    const insurancePriorityOptions = fieldOptionsFor(item, /insurance priority|priority/i);
    const insuranceOptions = item.insurancePreview || [];
    const selectedInsuranceSlot = Math.max(0, Math.min(getSelectedRepairSlot(item), Math.max(insuranceOptions.length - 1, 0)));
    const selectedInsurance = insuranceOptions[selectedInsuranceSlot] || insuranceOptions[0] || {};
    return `
      <div class="stack">
        ${insuranceOptions.length > 1 ? `
          <label class="stack">
            <span class="muted">Coverage to edit</span>
            <select id="repair-insurance-slot">
              ${insuranceOptions.map((insurance, index) => `<option value="${index}" ${index === selectedInsuranceSlot ? 'selected' : ''}>${escapeHtml(`${index + 1}. ${insurance.insuranceName || 'Coverage'} ${insurance.priority ? `(${insurance.priority})` : ''}`.trim())}</option>`).join('')}
            </select>
          </label>
        ` : ''}
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
        <div class="grid three">
          ${renderRepairControl({
            id: 'repair-insurance-name',
            label: 'Insurance Name',
            currentValue: selectedInsurance.insuranceName || '',
            options: insuranceNameOptions,
            placeholder: 'Carrier / payer name',
          })}
          ${renderRepairControl({
            id: 'repair-member-id',
            label: 'Member ID',
            currentValue: selectedInsurance.memberId || '',
            placeholder: 'Member or subscriber ID',
          })}
          ${renderRepairControl({
            id: 'repair-subscriber-name',
            label: 'Subscriber Name',
            currentValue: selectedInsurance.subscriberName || '',
            placeholder: 'Subscriber name',
          })}
        </div>
        <div class="grid three">
          ${renderRepairControl({
            id: 'repair-payor-id',
            label: 'Payor ID',
            currentValue: selectedInsurance.payorId || '',
            placeholder: 'Payor ID',
          })}
          ${renderRepairControl({
            id: 'repair-insurance-priority',
            label: 'Insurance Priority',
            currentValue: selectedInsurance.priority || '',
            options: insurancePriorityOptions,
            placeholder: 'Primary / secondary',
          })}
          <div class="card" style="padding:12px;background:#0f1528;">
            <div class="muted">Payer order safety</div>
            <div style="margin-top:6px">${escapeHtml((item.insurancePreview || []).length > 1 ? `Editing visible coverage ${selectedInsuranceSlot + 1}. Priority changes remain guarded and are matched against current coverage values before save.` : 'Single visible coverage. Priority can be repaired.')}</div>
          </div>
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
        const av = ['red', 'yellow', 'green'].indexOf(deriveAccountVisualState(a).state);
        const bv = ['red', 'yellow', 'green'].indexOf(deriveAccountVisualState(b).state);
        if (av !== bv) return av - bv;
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
              <td>${escapeHtml(item.client || '')}<div class="small muted">${escapeHtml(deriveAccountVisualState(item).owner)}</div></td>
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
      container.innerHTML = `${renderFilterBar()}<p class="muted">No accounts match this view right now.</p>`;
      detail.innerHTML = '<p class="muted">Choose another filter or wait for live billing data to refresh.</p>';
      return;
    }

    if (selectedAccountIndex >= items.length) selectedAccountIndex = 0;

    container.innerHTML = renderFilterBar() + items.map((item, index) => {
      const stage = deriveAccountStage(item);
      const visual = deriveAccountVisualState(item);
      const todos = buildAccountTodoItems(item);
      const selected = index === selectedAccountIndex;
      return `
        <button
          class="account-card${selected ? ' selected' : ''}"
          data-account-index="${index}"
          data-state="${escapeHtml(visual.state)}"
          title="${escapeHtml(summarizeHoverText(item))}"
        >
          <div class="account-ring ${escapeHtml(visual.state)}">${escapeHtml(visual.ringLabel)}</div>
          <div class="account-card-top">
            <div>
              <strong>${escapeHtml(item.client || 'Unknown client')}</strong>
              <div class="muted small">${escapeHtml(visual.owner)}</div>
            </div>
            <span class="badge ${badgeClass(visual.state)}">${escapeHtml(visual.state)}</span>
          </div>
          <div class="muted small">${escapeHtml(visual.summary)}</div>
          <div class="progress-label">
            <span>${escapeHtml(stage.label)}</span>
            <span>${escapeHtml(`${stage.percent}%`)}</span>
          </div>
          <div class="progress-track"><div class="progress-fill ${badgeClass(visual.state)}" style="width:${stage.percent}%"></div></div>
          <div class="account-meta">
            <span>${escapeHtml((item.accountSummary?.insurers || []).join(', ') || 'No insurer visible')}</span>
          </div>
          <div class="account-actions-inline">
            ${todos.slice(0, 2).map((todo) => `<span class="badge ${badgeClass(todo.urgency)}">${escapeHtml(todo.label)}</span>`).join('')}
          </div>
          <div class="account-hover-card">
            <strong>What needs doing</strong>
            <div>${escapeHtml(visual.summary)}</div>
            <div style="margin-top:8px;color:#98a5c3">${escapeHtml(todos[0]?.label || 'Open the file for detail.')}</div>
          </div>
        </button>
      `;
    }).join('');

    const item = items[selectedAccountIndex];
    const visual = deriveAccountVisualState(item);
    const todoItems = buildAccountTodoItems(item);
    detail.innerHTML = `
      <div class="stack">
        <div class="account-detail-header">
          <div>
            <h3>${escapeHtml(item.client || 'Unknown client')}</h3>
            <p class="muted">${escapeHtml(item.date || '')} · ${escapeHtml(item.notePreview || '')}</p>
          </div>
          <span class="badge ${badgeClass(visual.state)}">${escapeHtml(visual.state)}</span>
        </div>
        <div class="grid three">
          <div class="card stat"><span>Owner</span><strong>${escapeHtml(visual.owner)}</strong></div>
          <div class="card stat"><span>What needs doing</span><strong>${escapeHtml(visual.summary)}</strong></div>
          <div class="card stat"><span>Recovery stage</span><strong>${escapeHtml(deriveAccountStage(item).label)}</strong></div>
        </div>
        <div class="row-actions">
          <button type="button" data-account-action="vob" class="ghost">Use this account in VOB</button>
        </div>
        <div class="card">
          <strong>Action list</strong>
          <div class="stack" style="margin-top:10px">
            ${todoItems.map((todo) => `
              <div class="todo-item" data-urgency="${escapeHtml(todo.urgency)}">
                <div class="todo-head">
                  <div>
                    <strong>${escapeHtml(todo.label)}</strong>
                    <div style="margin-top:6px;color:#98a5c3">${escapeHtml(`Owner: ${todo.owner}`)}</div>
                  </div>
                  <span class="badge ${badgeClass(todo.urgency)}">${escapeHtml(todo.urgency)}</span>
                </div>
                <div class="row-actions">
                  <button type="button" data-account-action="${escapeHtml(todo.action)}">${escapeHtml(todo.button)}</button>
                </div>
              </div>
            `).join('')}
          </div>
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
        <div id="repair-account-panel">
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

    const repairSlotSelect = document.getElementById('repair-insurance-slot');
    if (repairSlotSelect) {
      repairSlotSelect.addEventListener('change', (event) => {
        setSelectedRepairSlot(item, event.target.value || 0);
        renderAccountBoard();
      });
    }
    detail.querySelectorAll('[data-account-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const action = button.getAttribute('data-account-action');
        if (action === 'repair') {
          document.getElementById('repair-account-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const focusTarget =
            document.getElementById('repair-client-billing-status')
            || document.getElementById('repair-bill-provider-type')
            || document.getElementById('repair-insurance-name')
            || document.getElementById('repair-member-id')
            || document.getElementById('repair-payment-status');
          focusTarget?.focus?.();
          return;
        }
        if (action === 'inspect') {
          await inspectSelectedAccount();
          return;
        }
        if (action === 'vob') {
          await inspectSelectedAccount();
          useSelectedAccountInVob();
        }
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
          <p class="muted" style="margin-top:8px">Use <code>/api/v1/clientcare-billing/insurance/verification-preview</code> to check take/review/do-not-schedule decisions before accepting insurance clients.</p>
        </div>
      </div>
    `;
  }

  function renderVerificationOfBenefitsCard() {
    ensureInsuranceDraftSeed();
    const selectedAccount = getSelectedAccountItem();
    const selectedLabel = selectedAccount?.client
      ? `${selectedAccount.client}${selectedAccount.accountSummary?.insurers?.[0] ? ` · ${selectedAccount.accountSummary.insurers[0]}` : ''}`
      : 'No account selected';

    return `
      <div class="card" id="verification-of-benefits">
        <h2>Verification of Benefits (VOB)</h2>
        <p class="hint" style="margin:10px 0">Use this before taking an insurance client or moving a claim forward. It is the operator-facing VOB surface, not just a raw preview endpoint.</p>
        <div class="grid four" style="margin-bottom:12px">
          <div class="card stat"><span>Selected account</span><strong>${escapeHtml(selectedLabel)}</strong></div>
          <div class="card stat"><span>Payer</span><strong>${escapeHtml(lastInsuranceDraft.payer_name || 'Not entered')}</strong></div>
          <div class="card stat"><span>Member ID</span><strong>${escapeHtml(lastInsuranceDraft.member_id || 'Not entered')}</strong></div>
          <div class="card stat"><span>Current decision</span><strong>${escapeHtml(lastInsurancePreview?.decision || 'Not run')}</strong></div>
        </div>
        <div class="row-actions" style="margin-bottom:12px">
          <button id="use-selected-account-vob" class="ghost" data-tip="Pre-fills the insurance fields below using the account you clicked in the Accounts Needing Action board">Use selected account</button>
          <button id="insurance-preview-run" data-tip="Runs the insurance info through the system to get a decision: Take (schedule), Review (check details first), or Do Not Schedule">Run VOB</button>
        </div>
        <div class="grid two" style="margin-top:12px;">
          <input id="insurance-payer-name" value="${escapeHtml(lastInsuranceDraft.payer_name || '')}" placeholder="Payer name">
          <input id="insurance-member-id" value="${escapeHtml(lastInsuranceDraft.member_id || '')}" placeholder="Member ID">
          <input id="insurance-billed-amount" value="${escapeHtml(lastInsuranceDraft.billed_amount || '')}" type="number" min="0" step="0.01" placeholder="Billed amount">
          <input id="insurance-copay" value="${escapeHtml(lastInsuranceDraft.copay || '')}" type="number" min="0" step="0.01" placeholder="Copay">
          <input id="insurance-deductible" value="${escapeHtml(lastInsuranceDraft.deductible_remaining || '')}" type="number" min="0" step="0.01" placeholder="Deductible remaining">
          <input id="insurance-coinsurance" value="${escapeHtml(lastInsuranceDraft.coinsurance_pct || '')}" type="number" min="0" step="1" placeholder="Coinsurance %">
          <select id="insurance-coverage-active">
            <option value="" ${!String(lastInsuranceDraft.coverage_active || '').trim() ? 'selected' : ''}>Coverage status</option>
            <option value="true" ${String(lastInsuranceDraft.coverage_active) === 'true' ? 'selected' : ''}>Active</option>
            <option value="false" ${String(lastInsuranceDraft.coverage_active) === 'false' ? 'selected' : ''}>Inactive</option>
          </select>
          <select id="insurance-in-network">
            <option value="" ${!String(lastInsuranceDraft.in_network || '').trim() ? 'selected' : ''}>Network status</option>
            <option value="true" ${String(lastInsuranceDraft.in_network) === 'true' ? 'selected' : ''}>In network</option>
            <option value="false" ${String(lastInsuranceDraft.in_network) === 'false' ? 'selected' : ''}>Out of network</option>
          </select>
          <select id="insurance-auth-required">
            <option value="" ${!String(lastInsuranceDraft.auth_required || '').trim() ? 'selected' : ''}>Authorization</option>
            <option value="true" ${String(lastInsuranceDraft.auth_required) === 'true' ? 'selected' : ''}>Required</option>
            <option value="false" ${String(lastInsuranceDraft.auth_required) === 'false' ? 'selected' : ''}>Not required</option>
          </select>
        </div>
        <div id="insurance-preview-output" style="margin-top:12px;">
          ${lastInsurancePreview ? `
            <div class="stack">
              ${renderKeyValueTable([
                { label: 'Decision', value: lastInsurancePreview.decision || 'review' },
                { label: 'Confidence', value: lastInsurancePreview.confidence || 'low' },
                { label: 'Estimated insurer payment', value: money(lastInsurancePreview.estimated_insurance_payment || 0) },
                { label: 'Estimated patient responsibility', value: money(lastInsurancePreview.estimated_patient_responsibility || 0) },
                { label: 'Estimation basis', value: lastInsurancePreview.estimation_basis || 'No basis returned' },
              ])}
              <div><strong>Reasons</strong><ul class="detail-list">${(lastInsurancePreview.reasons || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No reasons returned.</li>'}</ul></div>
              <div><strong>Missing</strong><ul class="detail-list">${(lastInsurancePreview.missing || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No missing fields.</li>'}</ul></div>
            </div>
          ` : '<p class="muted">Run VOB to see take/review/do-not-schedule guidance.</p>'}
        </div>
      </div>
    `;
  }

  function renderPatientArSummary(opsOverview, patientArPolicy, patientArEscalation) {
    const patientAr = opsOverview?.patient_ar || null;
    const summary = patientAr?.summary || {};
    const topAccounts = patientAr?.top_accounts || [];
    const policy = patientArPolicy?.policy || patientAr?.policy || {};
    const escalation = patientArEscalation || {};
    const escalationItems = escalation.items || [];
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
        <div>
          <strong>Policy controls</strong>
          <div class="grid three">
            <label class="stack"><span class="muted">Reminder day 1</span><input id="patient-ar-reminder-1" type="number" min="1" value="${escapeHtml(policy.reminder_day_1 || 15)}"></label>
            <label class="stack"><span class="muted">Reminder day 2</span><input id="patient-ar-reminder-2" type="number" min="1" value="${escapeHtml(policy.reminder_day_2 || 30)}"></label>
            <label class="stack"><span class="muted">Provider escalation day</span><input id="patient-ar-provider-escalation" type="number" min="1" value="${escapeHtml(policy.provider_escalation_day || 45)}"></label>
            <label class="stack"><span class="muted">Final notice day</span><input id="patient-ar-final-notice" type="number" min="1" value="${escapeHtml(policy.final_notice_day || 60)}"></label>
            <label class="stack"><span class="muted">Payment-plan grace days</span><input id="patient-ar-plan-grace" type="number" min="1" value="${escapeHtml(policy.payment_plan_grace_days || 7)}"></label>
            <label class="stack"><span class="muted">Autopay retry days</span><input id="patient-ar-autopay-retry" type="number" min="1" value="${escapeHtml(policy.autopay_retry_days || 3)}"></label>
          </div>
          <div class="grid two" style="margin-top:12px;">
            <label class="stack"><span class="muted">Notes</span><textarea id="patient-ar-policy-notes" placeholder="Provider policy notes">${escapeHtml(policy.notes || '')}</textarea></label>
            <div class="stack">
              <label><input id="patient-ar-allow-plans" type="checkbox" ${policy.allow_payment_plans ? 'checked' : ''}> Allow payment plans</label>
              <label><input id="patient-ar-allow-hardship" type="checkbox" ${policy.allow_hardship_review ? 'checked' : ''}> Allow hardship review</label>
              <label><input id="patient-ar-allow-settlements" type="checkbox" ${policy.allow_settlements ? 'checked' : ''}> Allow settlements</label>
              <label><input id="patient-ar-allow-referral-credit" type="checkbox" ${policy.allow_referral_credit ? 'checked' : ''}> Allow referral-credit ideas</label>
              <div class="row-actions" style="margin-top:8px;"><button id="patient-ar-save-policy">Save patient AR policy</button></div>
            </div>
          </div>
        </div>
        <div>
          <strong>Escalation ladder</strong>
          <table>
            <thead><tr><th>Patient</th><th>Age</th><th>Balance</th><th>Stage</th><th>Next action</th><th></th></tr></thead>
            <tbody>
              ${escalationItems.length ? escalationItems.slice(0, 12).map((item) => `
                <tr>
                  <td>${escapeHtml(item.patient_name || '')}</td>
                  <td>${escapeHtml(item.age_bucket || '')}</td>
                  <td>${escapeHtml(money(item.patient_balance || 0))}</td>
                  <td>${escapeHtml(item.stage || '')}</td>
                  <td>${escapeHtml(item.next_action || '')}</td>
                  <td><button data-patient-ar-queue="${item.id}" class="ghost">Queue</button></td>
                </tr>
              `).join('') : '<tr><td colspan="6">No patient AR escalation items yet.</td></tr>'}
            </tbody>
          </table>
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

  function renderPayerRules(rules) {
    const items = rules?.rules || [];
    return `
      <div class="stack">
        <table>
          <thead><tr><th>Payer</th><th>Filing days</th><th>Appeal days</th><th>Cadence</th><th>Expected pay</th><th>Auth review</th><th>Notes</th></tr></thead>
          <tbody>
            ${items.length ? items.map((item) => `
              <tr>
                <td>${escapeHtml(item.payer_name || '')}</td>
                <td>${escapeHtml(item.filing_window_days ?? '—')}</td>
                <td>${escapeHtml(item.appeal_window_days ?? '—')}</td>
                <td>${escapeHtml(item.followup_cadence_days ?? '—')}</td>
                <td>${escapeHtml(item.expected_days_to_pay != null ? `${item.expected_days_to_pay}d / ${((Number(item.expected_paid_to_allowed_rate || 0)) * 100).toFixed(0)}%` : '—')}</td>
                <td>${escapeHtml(item.requires_auth_review ? 'Yes' : 'No')}</td>
                <td>${escapeHtml(item.followup_notes || item.notes || '')}</td>
              </tr>
            `).join('') : '<tr><td colspan="7">No payer overrides yet.</td></tr>'}
          </tbody>
        </table>
        <div class="grid three">
          <input id="payer-rule-name" placeholder="Payer name">
          <input id="payer-rule-filing" type="number" min="0" placeholder="Filing days">
          <input id="payer-rule-appeal" type="number" min="0" placeholder="Appeal days">
        </div>
        <div class="grid three">
          <input id="payer-rule-followup-cadence" type="number" min="0" placeholder="Follow-up cadence days">
          <input id="payer-rule-escalation" type="number" min="0" placeholder="Escalate after days">
          <input id="payer-rule-expected-days" type="number" min="0" placeholder="Expected days to pay">
        </div>
        <div class="grid three">
          <input id="payer-rule-expected-rate" type="number" min="0" max="100" step="0.1" placeholder="Expected paid-to-allowed %">
          <select id="payer-rule-category">
            <option value="">Dominant denial category</option>
            <option value="timely_filing">Timely filing</option>
            <option value="authorization">Authorization</option>
            <option value="medical_necessity">Medical necessity</option>
            <option value="eligibility">Eligibility</option>
            <option value="provider_enrollment">Provider enrollment</option>
            <option value="coding">Coding</option>
            <option value="other">Other</option>
          </select>
          <label><input id="payer-rule-auth" type="checkbox"> Requires auth review</label>
        </div>
        <div class="grid two">
          <input id="payer-rule-source" placeholder="Rule source or contract note">
          <input id="payer-rule-followup" placeholder="Follow-up note">
        </div>
        <label class="stack"><span class="muted">Notes</span><textarea id="payer-rule-notes" placeholder="Operational notes"></textarea></label>
        <div class="row-actions"><button id="payer-rule-save">Save payer rule</button></div>
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
          <thead><tr><th>Payer</th><th>Avg / target days</th><th>Top denial</th><th>Recommendation</th></tr></thead>
          <tbody>
            ${items.length ? items.slice(0, 10).map((item) => `
              <tr>
                <td>${escapeHtml(item.payer_name || '')}</td>
                <td>${escapeHtml(item.expected_days_to_pay != null ? `${item.avg_days_to_pay ?? '—'} / ${item.expected_days_to_pay}` : (item.avg_days_to_pay ?? '—'))}</td>
                <td>${escapeHtml(item.top_denial_category || 'unknown')}</td>
                <td>${escapeHtml(item.recommendations?.[0] || 'Review payer history')}</td>
              </tr>
            `).join('') : '<tr><td colspan="4">No payer playbooks yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderEraInsights(insights) {
    const summary = insights?.summary || {};
    const carcCodes = insights?.carc_codes || [];
    const rarcCodes = insights?.rarc_codes || [];
    const paymentMethods = insights?.payment_methods || [];
    return `
      <div class="stack">
        <div class="grid four">
          <div class="card stat"><span>Trace refs</span><strong>${escapeHtml(summary.traced_payments || 0)}</strong></div>
          <div class="card stat"><span>CARC tagged</span><strong>${escapeHtml(summary.carc_tagged_claims || 0)}</strong></div>
          <div class="card stat"><span>RARC tagged</span><strong>${escapeHtml(summary.rarc_tagged_claims || 0)}</strong></div>
          <div class="card stat"><span>Payment method tagged</span><strong>${escapeHtml(summary.payment_method_tagged || 0)}</strong></div>
        </div>
        <div class="grid two">
          <div>
            <strong>Top CARC codes</strong>
            <table>
              <thead><tr><th>Code</th><th>Count</th></tr></thead>
              <tbody>
                ${carcCodes.length ? carcCodes.slice(0, 8).map((item) => `<tr><td>${escapeHtml(item.code || '')}</td><td>${escapeHtml(item.count || 0)}</td></tr>`).join('') : '<tr><td colspan="2">No CARC data yet.</td></tr>'}
              </tbody>
            </table>
          </div>
          <div>
            <strong>Top RARC codes</strong>
            <table>
              <thead><tr><th>Code</th><th>Count</th></tr></thead>
              <tbody>
                ${rarcCodes.length ? rarcCodes.slice(0, 8).map((item) => `<tr><td>${escapeHtml(item.code || '')}</td><td>${escapeHtml(item.count || 0)}</td></tr>`).join('') : '<tr><td colspan="2">No RARC data yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <strong>Payment methods</strong>
          <table>
            <thead><tr><th>Method</th><th>Claims</th><th>Total paid</th></tr></thead>
            <tbody>
              ${paymentMethods.length ? paymentMethods.map((item) => `<tr><td>${escapeHtml(item.payment_method || '')}</td><td>${escapeHtml(item.count || 0)}</td><td>${escapeHtml(money(item.total_paid || 0))}</td></tr>`).join('') : '<tr><td colspan="3">No payment-method data yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderPackagingOverview(packagingOverview) {
    const overview = packagingOverview?.overview || packagingOverview || null;
    const summary = overview?.summary || {};
    const tenants = overview?.tenants || [];
    const activeTenant = overview?.active_tenant || {};
    const onboarding = overview?.onboarding || {};
    const operators = overview?.operators || [];
    const audit = overview?.audit || [];
    const readiness = overview?.readiness || {};
    const checks = readiness.checks || [];

    return `
      <div class="stack">
        <div class="grid four">
          <div class="card stat"><span>Tenants</span><strong>${escapeHtml(summary.tenants || 0)}</strong></div>
          <div class="card stat"><span>Active tenant</span><strong>${escapeHtml(summary.active_tenant || 'Default Practice')}</strong></div>
          <div class="card stat"><span>Fee %</span><strong>${escapeHtml(`${Number(summary.collections_fee_pct || 0).toFixed(2)}%`)}</strong></div>
          <div class="card stat"><span>Operators</span><strong>${escapeHtml(summary.operators || 0)}</strong></div>
        </div>
        <div class="grid three">
          <div class="card stat"><span>Readiness score</span><strong>${escapeHtml(`${Number(summary.readiness_score || 0)}%`)}</strong></div>
          <div class="card stat"><span>Status</span><strong>${escapeHtml(String(summary.readiness_status || 'not_ready').replace(/_/g, ' '))}</strong></div>
          <div class="card stat"><span>Open blockers</span><strong>${escapeHtml((readiness.blockers || []).length)}</strong></div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Tenant profile</h3>
            <div class="grid two">
              <label class="stack"><span class="muted">Tenant</span>
                <select id="tenant-select">
                  ${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id || '')}" ${String(tenant.id || '') === String(selectedTenantId || summary.active_tenant_id || '') ? 'selected' : ''}>${escapeHtml(tenant.name || tenant.slug || '')}</option>`).join('')}
                </select>
              </label>
              <label class="stack"><span class="muted">Status</span><input id="tenant-status" value="${escapeHtml(activeTenant.status || 'internal')}" placeholder="internal"></label>
              <label class="stack"><span class="muted">Name</span><input id="tenant-name" value="${escapeHtml(activeTenant.name || '')}" placeholder="Practice name"></label>
              <label class="stack"><span class="muted">Slug</span><input id="tenant-slug" value="${escapeHtml(activeTenant.slug || '')}" placeholder="practice-slug"></label>
              <label class="stack"><span class="muted">Collections fee %</span><input id="tenant-fee" type="number" min="0" max="100" step="0.01" value="${escapeHtml(activeTenant.collections_fee_pct || 5)}"></label>
              <label class="stack"><span class="muted">Contact email</span><input id="tenant-contact-email" value="${escapeHtml(activeTenant.contact_email || '')}" placeholder="billing@practice.com"></label>
              <label class="stack"><span class="muted">Contact name</span><input id="tenant-contact-name" value="${escapeHtml(activeTenant.contact_name || '')}" placeholder="Owner or manager"></label>
            </div>
            <div class="row-actions" style="margin-top:10px"><button id="tenant-save">Save tenant</button></div>
          </div>
          <div class="card">
            <h3>Onboarding</h3>
            <p class="muted">Go-live readiness is scored from setup completeness, operator access, history import, and audit receipts.</p>
            <div class="grid two">
              <label><input id="onboarding-browser-ready" type="checkbox" ${onboarding.browser_ready ? 'checked' : ''}> Browser ready</label>
              <label><input id="onboarding-history-imported" type="checkbox" ${onboarding.payment_history_imported ? 'checked' : ''}> Payment history imported</label>
              <label><input id="onboarding-backlog-loaded" type="checkbox" ${onboarding.backlog_loaded ? 'checked' : ''}> Backlog loaded</label>
              <label><input id="onboarding-policy-configured" type="checkbox" ${onboarding.policy_configured ? 'checked' : ''}> Policy configured</label>
              <label><input id="onboarding-operator-access" type="checkbox" ${onboarding.operator_access_configured ? 'checked' : ''}> Operator access configured</label>
              <label><input id="onboarding-review-completed" type="checkbox" ${onboarding.review_completed ? 'checked' : ''}> Review completed</label>
            </div>
            <label class="stack" style="margin-top:10px"><span class="muted">Notes</span><textarea id="onboarding-notes" placeholder="Setup notes">${escapeHtml(onboarding.notes || '')}</textarea></label>
            <div class="row-actions" style="margin-top:10px">
              <button id="onboarding-save">Save onboarding</button>
              <button id="readiness-export" class="ghost">Export readiness</button>
            </div>
            <div style="margin-top:12px">
              <strong>Readiness checklist</strong>
              <table>
                <thead><tr><th>Check</th><th>Status</th></tr></thead>
                <tbody>
                  ${checks.length ? checks.map((check) => `<tr><td>${escapeHtml(check.label || '')}</td><td>${escapeHtml(check.done ? 'Done' : 'Open')}</td></tr>`).join('') : '<tr><td colspan="2">No readiness checks yet.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div style="margin-top:12px">
              <strong>Next actions</strong>
              <ul class="detail-list">
                ${(readiness.next_actions || []).length ? readiness.next_actions.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No open readiness actions.</li>'}
              </ul>
            </div>
          </div>
        </div>
        <div class="grid two">
          <div class="card">
            <h3>Operator access</h3>
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Active</th></tr></thead>
              <tbody>
                ${operators.length ? operators.map((operator) => `<tr><td>${escapeHtml(operator.operator_email || '')}</td><td>${escapeHtml(operator.role || '')}</td><td>${escapeHtml(operator.active ? 'Yes' : 'No')}</td></tr>`).join('') : '<tr><td colspan="3">No operators configured yet.</td></tr>'}
              </tbody>
            </table>
            <div class="grid three" style="margin-top:10px;">
              <input id="operator-email" placeholder="operator@practice.com">
              <select id="operator-role">
                <option value="operator">Operator</option>
                <option value="manager">Manager</option>
                <option value="reviewer">Reviewer</option>
              </select>
              <label><input id="operator-active" type="checkbox" checked> Active</label>
            </div>
            <div class="row-actions" style="margin-top:10px"><button id="operator-save">Save operator</button></div>
          </div>
          <div class="card">
            <h3>Audit log</h3>
            <div class="row-actions" style="margin-bottom:10px"><button id="audit-export" class="ghost">Export audit CSV</button></div>
            <table>
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
              <tbody>
                ${audit.length ? audit.map((entry) => `<tr><td>${escapeHtml(entry.created_at || '')}</td><td>${escapeHtml(entry.actor || '')}</td><td>${escapeHtml(entry.action_type || '')}</td><td>${escapeHtml(`${entry.entity_type || ''} ${entry.entity_id || ''}`.trim())}</td></tr>`).join('') : '<tr><td colspan="4">No audit events yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderPackagingValidation(validation) {
    const report = validation?.report || validation || null;
    if (!report) return '<p class="muted">No live validation run yet.</p>';
    const summary = report.summary || {};
    const checks = report.checks || [];
    return `
      <div class="stack">
        <div class="grid three">
          <div class="card stat"><span>Validation score</span><strong>${escapeHtml(`${Number(summary.score || 0)}%`)}</strong></div>
          <div class="card stat"><span>Status</span><strong>${escapeHtml(String(summary.status || 'blocked').replace(/_/g, ' '))}</strong></div>
          <div class="card stat"><span>Blockers</span><strong>${escapeHtml((summary.blockers || []).length)}</strong></div>
        </div>
        <table>
          <thead><tr><th>Check</th><th>Status</th></tr></thead>
          <tbody>
            ${checks.length ? checks.map((check) => `<tr><td>${escapeHtml(check.label || '')}</td><td>${escapeHtml(check.pass ? 'Pass' : 'Open')}</td></tr>`).join('') : '<tr><td colspan="2">No validation checks yet.</td></tr>'}
          </tbody>
        </table>
        <div>
          <strong>Next actions</strong>
          <ul class="detail-list">
            ${(report.next_actions || []).length ? report.next_actions.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No open rollout blockers.</li>'}
          </ul>
        </div>
      </div>
    `;
  }

  function renderPackagingValidationHistory(history) {
    const data = history?.history || history || null;
    const summary = data?.summary || {};
    const runs = Array.isArray(data?.validations) ? data.validations : [];
    if (!data) return '<p class="muted">No validation history yet.</p>';
    return `
      <div class="stack">
        <div class="grid four">
          <div class="card stat"><span>Runs</span><strong>${escapeHtml(summary.runs ?? 0)}</strong></div>
          <div class="card stat"><span>Latest score</span><strong>${escapeHtml(summary.latest_score ?? '—')}</strong></div>
          <div class="card stat"><span>Average score</span><strong>${escapeHtml(summary.average_score ?? '—')}</strong></div>
          <div class="card stat"><span>Validated runs</span><strong>${escapeHtml(summary.validated_runs ?? 0)}</strong></div>
        </div>
        <div class="grid two">
          <div>
            <strong>Common blockers</strong>
            <table>
              <thead><tr><th>Blocker</th><th>Count</th></tr></thead>
              <tbody>
                ${(summary.common_blockers || []).length
                  ? summary.common_blockers.map((item) => `<tr><td>${escapeHtml(item.label || '')}</td><td>${escapeHtml(item.count || 0)}</td></tr>`).join('')
                  : '<tr><td colspan="2">No recurring blockers yet.</td></tr>'}
              </tbody>
            </table>
          </div>
          <div>
            <strong>Recent validation runs</strong>
            <table>
              <thead><tr><th>When</th><th>Status</th><th>Score</th></tr></thead>
              <tbody>
                ${runs.length
                  ? runs.slice(0, 6).map((item) => `<tr><td>${escapeHtml(item.created_at || '')}</td><td>${escapeHtml(item.status || '')}</td><td>${escapeHtml(item.score ?? 0)}</td></tr>`).join('')
                  : '<tr><td colspan="3">No validation runs yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
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
        ...(getOperatorEmail() ? { 'x-operator-email': getOperatorEmail() } : {}),
        ...(selectedTenantId ? { 'x-clientcare-tenant-id': selectedTenantId } : {}),
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
      const hasApiKey = Boolean(getApiKey().trim());
      if (!hasApiKey) {
        lastReimbursementIntelligence = null;
        lastPayerPlaybooks = null;
        lastPayerRules = null;
        lastEraInsights = null;
        lastPatientArPolicy = null;
        lastPatientArEscalation = null;
        lastOpsOverview = null;
        lastUnderpayments = null;
        lastAppeals = null;
        lastPackagingOverview = null;
        lastPackagingValidationHistory = null;
        render(root, {}, { ready: false, checks: [], missing: ['COMMAND_CENTER_KEY'] }, [], [], [], {}, null, null, null, null, null, null, null, null, null, null, null, null);
        return;
      }

      const query = new URLSearchParams(filters).toString();
      const packagingPath = `/api/v1/clientcare-billing/packaging/overview${selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : ''}`;
      const validationHistoryPath = `/api/v1/clientcare-billing/packaging/validation-history${selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : ''}`;

      const endpointNames = ['dashboard','readiness','template','claims','actions','reconciliation','intelligence','payerPlaybooks','payerRules','eraInsights','patientArPolicy','patientArEscalation','opsOverview','underpayments','appeals','packagingOverview','packagingValidationHistory'];
      const settled = await Promise.allSettled([
        api('/api/v1/clientcare-billing/dashboard'),
        api('/api/v1/clientcare-billing/clientcare/readiness'),
        api('/api/v1/clientcare-billing/claims/import-template'),
        api(`/api/v1/clientcare-billing/claims${query ? `?${query}` : ''}`),
        api('/api/v1/clientcare-billing/actions'),
        api('/api/v1/clientcare-billing/reconciliation'),
        api('/api/v1/clientcare-billing/reimbursement-intelligence'),
        api('/api/v1/clientcare-billing/payer-playbooks?limit=25'),
        api('/api/v1/clientcare-billing/payer-rules'),
        api('/api/v1/clientcare-billing/era-insights?limit=25'),
        api('/api/v1/clientcare-billing/patient-ar/policy'),
        api('/api/v1/clientcare-billing/patient-ar/escalation-queue?limit=50'),
        api('/api/v1/clientcare-billing/ops/overview'),
        api('/api/v1/clientcare-billing/underpayments?limit=100'),
        api('/api/v1/clientcare-billing/appeals/queue?limit=100'),
        api(packagingPath),
        api(validationHistoryPath),
      ]);

      const failures = settled.map((r, i) => r.status === 'rejected' ? `${endpointNames[i]}: ${r.reason?.message}` : null).filter(Boolean);
      if (failures.length) console.warn('[ClientCare] Partial load — failed endpoints:', failures);

      const val = (i, fallback = {}) => settled[i].status === 'fulfilled' ? settled[i].value : fallback;
      const dashboard = val(0);
      const readiness = val(1);
      const template = val(2);
      const claims = val(3);
      const actions = val(4);
      const reconciliation = val(5);
      const intelligence = val(6);
      const payerPlaybooks = val(7, null);
      const payerRules = val(8, null);
      const eraInsights = val(9, null);
      const patientArPolicy = val(10, null);
      const patientArEscalation = val(11, null);
      const opsOverview = val(12);
      const underpayments = val(13, null);
      const appeals = val(14, null);
      const packagingOverview = val(15, null);
      const packagingValidationHistory = val(16, null);

      lastReimbursementIntelligence = intelligence?.intelligence || null;
      lastPayerPlaybooks = payerPlaybooks || null;
      lastPayerRules = payerRules || null;
      lastEraInsights = eraInsights || null;
      lastPatientArPolicy = patientArPolicy || null;
      lastPatientArEscalation = patientArEscalation || null;
      lastOpsOverview = opsOverview?.overview || null;
      lastUnderpayments = underpayments || null;
      lastAppeals = appeals || null;
      lastPackagingOverview = packagingOverview || null;
      lastPackagingValidationHistory = packagingValidationHistory || null;
      if (!selectedTenantId && packagingOverview?.overview?.summary?.active_tenant_id) setSelectedTenantId(packagingOverview.overview.summary.active_tenant_id);
      render(root, dashboard?.dashboard, readiness?.readiness, template?.fields || [], claims?.claims || [], actions?.actions || [], reconciliation?.summary || {}, lastReimbursementIntelligence, lastPayerPlaybooks, lastPayerRules, lastEraInsights, lastPatientArPolicy, lastPatientArEscalation, lastOpsOverview, lastUnderpayments, lastAppeals, lastPackagingOverview, lastPackagingValidation, lastPackagingValidationHistory);
      if (failures.length) {
        const banner = document.createElement('div');
        banner.className = 'card';
        banner.style.cssText = 'background:#4a1f28;border-color:#ef476f;margin-bottom:16px';
        banner.innerHTML = `<strong style="color:#ff9db0">⚠ ${failures.length} endpoint(s) failed to load</strong><ul style="margin:8px 0 0 18px;font-size:12px;color:#ff9db0">${failures.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`;
        root.insertBefore(banner, root.firstChild);
      }
      await ensureAssistantSession().catch((err) => console.warn('[ClientCare] assistant session init failed:', err.message));
      if (!options.skipAutoFullQueue && getApiKey() && readiness?.readiness?.ready && !fullQueueHydrated && !fullQueueLoading) {
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

  async function savePatientArPolicy() {
    try {
      const payload = {
        reminder_day_1: Number(document.getElementById('patient-ar-reminder-1')?.value || 15),
        reminder_day_2: Number(document.getElementById('patient-ar-reminder-2')?.value || 30),
        provider_escalation_day: Number(document.getElementById('patient-ar-provider-escalation')?.value || 45),
        final_notice_day: Number(document.getElementById('patient-ar-final-notice')?.value || 60),
        payment_plan_grace_days: Number(document.getElementById('patient-ar-plan-grace')?.value || 7),
        autopay_retry_days: Number(document.getElementById('patient-ar-autopay-retry')?.value || 3),
        allow_payment_plans: Boolean(document.getElementById('patient-ar-allow-plans')?.checked),
        allow_hardship_review: Boolean(document.getElementById('patient-ar-allow-hardship')?.checked),
        allow_settlements: Boolean(document.getElementById('patient-ar-allow-settlements')?.checked),
        allow_referral_credit: Boolean(document.getElementById('patient-ar-allow-referral-credit')?.checked),
        notes: document.getElementById('patient-ar-policy-notes')?.value || '',
        updated_by: 'overlay',
      };
      const result = await api('/api/v1/clientcare-billing/patient-ar/policy', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      lastPatientArPolicy = result;
      await loadDashboard({}, { skipAutoFullQueue: true });
    } catch (error) {
      alert(error.message);
    }
  }

  async function queuePatientArAction(id) {
    try {
      const result = await api(`/api/v1/clientcare-billing/patient-ar/${id}/queue-action`, {
        method: 'POST',
        body: JSON.stringify({
          owner: 'overlay',
          action_type: 'patient_ar_followup',
        }),
      });
      document.getElementById('claim-plan').innerHTML = `
        <h3>${escapeHtml(result.claim.patient_name || `Claim ${id}`)}</h3>
        <p class="muted">Patient AR action queued successfully.</p>
        ${renderKeyValueTable([
          { label: 'Stage', value: result.stage?.stage || '' },
          { label: 'Balance', value: money(result.claim.patient_balance || 0) },
          { label: 'Action', value: result.action?.summary || '' },
        ])}
        <div><strong>Next step</strong><pre>${escapeHtml(result.action?.details || 'No details available.')}</pre></div>
      `;
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
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant' && message.content);
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
    const latestAssistantKey = latestAssistantMessage ? `${latestAssistantMessage.timestamp || ''}:${latestAssistantMessage.content || ''}` : '';
    if (latestAssistantKey) {
      if (!assistantVoiceReady) {
        assistantVoiceReady = true;
        lastAssistantVoiceKey = latestAssistantKey;
      } else if (latestAssistantKey !== lastAssistantVoiceKey) {
        lastAssistantVoiceKey = latestAssistantKey;
        if (assistantVoiceController) assistantVoiceController.speak(latestAssistantMessage.content || '');
      }
    }
  }

  function initAssistantVoice() {
    if (assistantVoiceController && typeof assistantVoiceController.destroy === 'function') {
      assistantVoiceController.destroy();
    }
    if (!window.LifeOSVoiceChat) return;
    assistantVoiceController = window.LifeOSVoiceChat.attach({
      inputId: 'assistant-input',
      buttonId: 'assistant-voice-toggle',
      statusId: 'assistant-voice-status',
      speakToggleId: 'assistant-speak-replies',
      storageKey: 'clientcare_assistant',
      idleText: 'Voice ready for Operations Assistant',
    });
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
            <div class="row-actions" style="margin-top:10px">
              <button id="assistant-voice-toggle" class="ghost" type="button">Start voice</button>
              <label class="muted small" style="display:inline-flex; gap:6px; align-items:center;"><input id="assistant-speak-replies" type="checkbox"> Speak replies</label>
              <span id="assistant-voice-status" class="muted small">Voice ready</span>
            </div>
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

  async function refreshPackagingOverview({ silent = true } = {}) {
    try {
      const path = `/api/v1/clientcare-billing/packaging/overview${selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : ''}`;
      lastPackagingOverview = await api(path);
      if (!selectedTenantId && lastPackagingOverview?.overview?.summary?.active_tenant_id) {
        setSelectedTenantId(lastPackagingOverview.overview.summary.active_tenant_id);
      }
      rerender();
    } catch (error) {
      if (!silent) alert(error.message);
    }
  }

  async function saveTenantProfile() {
    try {
      const payload = {
        actor: 'overlay',
        slug: document.getElementById('tenant-slug')?.value || '',
        name: document.getElementById('tenant-name')?.value || '',
        status: document.getElementById('tenant-status')?.value || 'internal',
        collections_fee_pct: Number(document.getElementById('tenant-fee')?.value || 5),
        contact_name: document.getElementById('tenant-contact-name')?.value || '',
        contact_email: document.getElementById('tenant-contact-email')?.value || '',
      };
      const result = await api('/api/v1/clientcare-billing/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSelectedTenantId(result.tenant?.id || selectedTenantId);
      await loadDashboard({}, { skipAutoFullQueue: true });
    } catch (error) {
      alert(error.message);
    }
  }

  async function saveTenantOnboarding() {
    if (!selectedTenantId) {
      alert('Save a tenant first.');
      return;
    }
    try {
      await api(`/api/v1/clientcare-billing/tenants/${encodeURIComponent(selectedTenantId)}/onboarding`, {
        method: 'POST',
        body: JSON.stringify({
          actor: 'overlay',
          browser_ready: Boolean(document.getElementById('onboarding-browser-ready')?.checked),
          payment_history_imported: Boolean(document.getElementById('onboarding-history-imported')?.checked),
          backlog_loaded: Boolean(document.getElementById('onboarding-backlog-loaded')?.checked),
          policy_configured: Boolean(document.getElementById('onboarding-policy-configured')?.checked),
          operator_access_configured: Boolean(document.getElementById('onboarding-operator-access')?.checked),
          review_completed: Boolean(document.getElementById('onboarding-review-completed')?.checked),
          notes: document.getElementById('onboarding-notes')?.value || '',
        }),
      });
      await refreshPackagingOverview({ silent: false });
    } catch (error) {
      alert(error.message);
    }
  }

  async function saveOperatorAccess() {
    if (!selectedTenantId) {
      alert('Save a tenant first.');
      return;
    }
    const operatorEmail = String(document.getElementById('operator-email')?.value || '').trim();
    if (!operatorEmail) {
      alert('Operator email required.');
      return;
    }
    try {
      await api(`/api/v1/clientcare-billing/tenants/${encodeURIComponent(selectedTenantId)}/operators`, {
        method: 'POST',
        body: JSON.stringify({
          actor: 'overlay',
          operator_email: operatorEmail,
          role: document.getElementById('operator-role')?.value || 'operator',
          active: Boolean(document.getElementById('operator-active')?.checked),
        }),
      });
      document.getElementById('operator-email').value = '';
      await refreshPackagingOverview({ silent: false });
    } catch (error) {
      alert(error.message);
    }
  }

  async function savePayerRuleOverride() {
    const payerName = String(document.getElementById('payer-rule-name')?.value || '').trim();
    if (!payerName) {
      alert('Payer name required.');
      return;
    }
    try {
      await api('/api/v1/clientcare-billing/payer-rules', {
        method: 'POST',
        body: JSON.stringify({
          updated_by: 'overlay',
          payer_name: payerName,
          filing_window_days: Number(document.getElementById('payer-rule-filing')?.value || 0) || null,
          appeal_window_days: Number(document.getElementById('payer-rule-appeal')?.value || 0) || null,
          followup_cadence_days: Number(document.getElementById('payer-rule-followup-cadence')?.value || 0) || null,
          escalation_after_days: Number(document.getElementById('payer-rule-escalation')?.value || 0) || null,
          expected_days_to_pay: Number(document.getElementById('payer-rule-expected-days')?.value || 0) || null,
          expected_paid_to_allowed_rate: (() => {
            const raw = Number(document.getElementById('payer-rule-expected-rate')?.value || 0);
            return raw ? raw / 100 : null;
          })(),
          denial_category_override: document.getElementById('payer-rule-category')?.value || '',
          timely_filing_source: document.getElementById('payer-rule-source')?.value || '',
          followup_notes: document.getElementById('payer-rule-followup')?.value || '',
          notes: document.getElementById('payer-rule-notes')?.value || '',
          requires_auth_review: Boolean(document.getElementById('payer-rule-auth')?.checked),
        }),
      });
      ['payer-rule-name','payer-rule-filing','payer-rule-appeal','payer-rule-followup-cadence','payer-rule-escalation','payer-rule-expected-days','payer-rule-expected-rate','payer-rule-source','payer-rule-followup','payer-rule-notes'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const authEl = document.getElementById('payer-rule-auth');
      if (authEl) authEl.checked = false;
      const categoryEl = document.getElementById('payer-rule-category');
      if (categoryEl) categoryEl.value = '';
      await loadDashboard({}, { skipAutoFullQueue: true });
    } catch (error) {
      alert(error.message);
    }
  }

  function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportReadinessReport() {
    try {
      const path = `/api/v1/clientcare-billing/packaging/readiness-report${selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : ''}`;
      const result = await api(path);
      downloadText(`clientcare-readiness-${selectedTenantId || 'default'}.json`, JSON.stringify(result.report || result, null, 2), 'application/json;charset=utf-8');
    } catch (error) {
      alert(error.message);
    }
  }

  async function exportAuditCsv() {
    try {
      const path = `/api/v1/clientcare-billing/audit-log/export${selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : ''}`;
      const response = await fetch(path, {
        headers: {
          ...(window.commandKey ? { 'x-api-key': window.commandKey } : {}),
          ...(getOperatorEmail() ? { 'x-operator-email': getOperatorEmail() } : {}),
          ...(selectedTenantId ? { 'x-clientcare-tenant-id': selectedTenantId } : {}),
        },
      });
      if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
      downloadText(`clientcare-audit-${selectedTenantId || 'default'}.csv`, await response.text(), 'text/csv;charset=utf-8');
    } catch (error) {
      alert(error.message);
    }
  }

  async function runPackagingValidation() {
    try {
      lastPackagingValidation = await api('/api/v1/clientcare-billing/packaging/validate', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: selectedTenantId || null,
          actor: 'overlay',
        }),
      });
      const historyPath = `/api/v1/clientcare-billing/packaging/validation-history${selectedTenantId ? `?tenant_id=${encodeURIComponent(selectedTenantId)}` : ''}`;
      lastPackagingValidationHistory = await api(historyPath);
      rerender();
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
      const draft = syncInsuranceDraftFromDom();
      const payload = {
        payer_name: draft.payer_name || '',
        member_id: draft.member_id || '',
        billed_amount: Number(draft.billed_amount || 0) || null,
        copay: Number(draft.copay || 0) || null,
        deductible_remaining: Number(draft.deductible_remaining || 0) || null,
        coinsurance_pct: Number(draft.coinsurance_pct || 0) || null,
        coverage_active: parseBool(draft.coverage_active || ''),
        in_network: parseBool(draft.in_network || ''),
        auth_required: parseBool(draft.auth_required || ''),
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
    const insuranceSlot = Number(document.getElementById('repair-insurance-slot')?.value || getSelectedRepairSlot(item));
    const selectedInsurance = (item.insurancePreview || [])[Math.max(0, insuranceSlot)] || {};
    const insuranceName = document.getElementById('repair-insurance-name')?.value?.trim();
    const memberId = document.getElementById('repair-member-id')?.value?.trim();
    const subscriberName = document.getElementById('repair-subscriber-name')?.value?.trim();
    const payorId = document.getElementById('repair-payor-id')?.value?.trim();
    const insurancePriority = document.getElementById('repair-insurance-priority')?.value?.trim();
    if (billingStatus) updates.client_billing_status = billingStatus;
    if (providerType) updates.bill_provider_type = providerType;
    if (paymentStatus) updates.payment_status = paymentStatus;
    if (Number.isFinite(insuranceSlot) && (item.insurancePreview || []).length > 1) updates.insurance_slot = insuranceSlot;
    if (insuranceName) updates.insurance_name = insuranceName;
    if (memberId) updates.member_id = memberId;
    if (subscriberName) updates.subscriber_name = subscriberName;
    if (payorId) updates.payor_id = payorId;
    if (insurancePriority) updates.insurance_priority = insurancePriority;
    if ((item.insurancePreview || []).length > 1) {
      updates.insurance_match_hints = {
        insurance_name: selectedInsurance.insuranceName || '',
        member_id: selectedInsurance.memberId || '',
        subscriber_name: selectedInsurance.subscriberName || '',
        payor_id: selectedInsurance.payorId || '',
        insurance_priority: selectedInsurance.priority || '',
      };
    }

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
          <div><strong>Follow-up guidance</strong><pre>${escapeHtml((packet.followup_guidance || []).map((item) => `- ${item}`).join('\n') || 'None')}</pre></div>
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
          <div><strong>Follow-up guidance</strong><pre>${escapeHtml((result.packet.followup_guidance || []).map((item) => `- ${item}`).join('\n') || 'None')}</pre></div>
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

  function render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, packagingValidation, packagingValidationHistory) {
    dashboard = dashboard || {};
    readiness = readiness || { ready: false, checks: [], missing: [] };
    templateFields = Array.isArray(templateFields) ? templateFields : [];
    claims = Array.isArray(claims) ? claims : [];
    actions = Array.isArray(actions) ? actions : [];
    reconciliation = reconciliation || {};
    packagingOverview = packagingOverview || null;
    packagingValidation = packagingValidation || null;
    packagingValidationHistory = packagingValidationHistory || null;
    saveViewState(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, packagingValidation, packagingValidationHistory);
    const summary = dashboard?.summary || {};
    const liveSummary = lastAccountReport?.summary || null;
    const patientArSummary = opsOverview?.patient_ar?.summary || {};
    const forecastBuckets = intelligence?.collection_forecast?.timing_buckets || [];
    const bucket30 = forecastBuckets.find((b) => b.label === '0-30 days');
    const bucket60 = forecastBuckets.find((b) => b.label === '31-60 days');
    const topCards = [
      { label: 'Live accounts', value: liveSummary ? (liveSummary.totalAccounts || 0) : 'Loading…', tip: 'Total patient accounts currently in ClientCare with open billing activity' },
      { label: 'Billing notes', value: liveSummary ? (liveSummary.totalQueueItems || 0) : 'Loading…', tip: 'Open billing notes or action items that need to be worked — your daily task count' },
      { label: 'Projected 30d', value: liveSummary ? money(bucket30?.amount || 0) : 'Loading…', tip: 'Expected insurance payments collectible in the next 30 days based on current claim status' },
      { label: 'Projected 60d', value: liveSummary ? money(bucket60?.amount || 0) : 'Loading…', tip: 'Expected collections in the 31–60 day window — claims that need follow-up now to hit this' },
      { label: 'Strong/possible', value: liveSummary ? ((liveSummary.recoveryBandCounts?.strong || 0) + (liveSummary.recoveryBandCounts?.possible || 0)) : 'Loading…', tip: 'Accounts classified as strong or possible recovery — these are your best ROI targets' },
      { label: 'Insurance setup', value: liveSummary ? (liveSummary.diagnosisCounts?.insurance_setup_issue || 0) : 'Loading…', tip: 'Accounts with insurance configuration problems — wrong payer, missing auth, bad member ID — these block all billing until fixed' },
      { label: 'Patient AR', value: escapeHtml(money(patientArSummary.total_balance || 0)), tip: 'Total patient-responsibility balance owed across all accounts — money patients owe after insurance pays' },
      { label: '90+ patient AR', value: escapeHtml(money(patientArSummary.balance_90_plus || 0)), tip: 'Patient balances over 90 days old — highest risk of going uncollected, needs outreach or write-off decision now' },
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
          ${getApiKey().trim() ? '' : '<div class="card" style="margin-top:14px;background:#4a1f28;border-color:#ef476f;"><strong style="color:#ffb4c1">Access needed</strong><p class="muted" style="margin-top:8px;color:#ffd5dd">Save the command key below to unlock live billing data. The overlay now opens safely without crashing when protected endpoints return 401.</p></div>'}
        </div>
        <div class="card" style="min-width:320px;">
          <label for="api-key">Command key</label>
          <input id="api-key" type="password" value="${escapeHtml(getApiKey())}" placeholder="x-api-key">
          <label for="operator-email" style="margin-top:10px">Operator email</label>
          <input id="operator-email-header" type="email" value="${escapeHtml(getOperatorEmail())}" placeholder="operator@practice.com">
          <div style="margin-top:10px"><button id="save-key">Save access</button></div>
        </div>
      </div>

      <div class="grid four kpi-grid">
        ${topCards.map((card) => `
          <div class="card stat" ${card.tip ? `data-tip="${escapeHtml(card.tip)}"` : ''}><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.value)}</strong></div>
        `).join('')}
      </div>

      <div class="workspace ${assistantPinned ? 'assistant-pinned' : 'assistant-floating'}">
        <div class="main-workspace">
          ${renderVerificationOfBenefitsCard()}

          <div class="grid two">
            <div class="card">
              <h2 data-tip="Your highest-priority accounts right now — ranked by dollar value and urgency. Work top to bottom.">Today's Focus</h2>
              <p class="hint" style="margin:10px 0">Start here. Highest-value accounts first.</p>
              ${renderTodaysFocus()}
            </div>
            <div class="card">
              <h2 data-tip="Instead of opening accounts one by one, these workflows let you fix the same type of problem across many accounts at once — much faster.">Batch Workflows</h2>
              <p class="hint" style="margin:10px 0">Work the backlog by blocker instead of one account at a time.</p>
              <div id="workflow-playbooks">${renderWorkflowPlaybooks(lastAccountReport?.summary || {})}</div>
            </div>
          </div>

          <div class="grid two">
            <div class="card">
              <h2 data-tip="All accounts with open billing issues pulled from ClientCare. Color ring = urgency (red = critical, yellow = needs attention, green = on track). Hover an account for a quick summary, click to open the full recovery detail.">Accounts Needing Action</h2>
              <p class="hint" style="margin:10px 0">Hover for a summary. Click for full detail.</p>
              <div id="account-board" class="account-board"><p class="muted">Loading live billing accounts…</p></div>
            </div>
            <div class="card">
              <h2 data-tip="Full breakdown for the account you clicked — what is blocking the claim, what the system recommends doing next, and any repair options.">Account Recovery Detail</h2>
              <div id="account-detail"><p class="muted">Click an account card to inspect the live billing status, blocker, and next actions.</p></div>
            </div>
          </div>

          <div class="card">
            <h2>Sellable Packaging</h2>
            <p class="hint" style="margin:10px 0">Tenant setup, onboarding, operator access, and audit trail.</p>
            <div id="packaging-overview">${renderPackagingOverview(packagingOverview)}</div>
          </div>

          <div class="card">
            <h2>Live Rollout Validation</h2>
            <p class="hint" style="margin:10px 0">Cross-check actual browser readiness, claim history, operator access, and audit receipts before go-live.</p>
            <div class="row-actions" style="margin-bottom:10px"><button id="packaging-validate">Run validation</button></div>
            <div id="packaging-validation">${renderPackagingValidation(packagingValidation)}</div>
          </div>

          <div class="card">
            <h2>Validation Trends</h2>
            <p class="hint" style="margin:10px 0">See repeated rollout blockers and whether readiness is improving across runs.</p>
            <div id="packaging-validation-history">${renderPackagingValidationHistory(packagingValidationHistory)}</div>
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
                    <button id="browser-login-test" data-tip="Tests whether your ClientCare credentials (CC_USER / CC_PASS env vars) are configured correctly and can log in. Run this first.">Login Test</button>
                    <button id="browser-overview" class="ghost" data-tip="Pulls the top-level billing dashboard summary from ClientCare — totals, outstanding balances, claim counts.">Billing Overview</button>
                    <button id="browser-scan-billing-notes" class="ghost" data-tip="Scans the most recent billing notes in ClientCare and extracts action items. Use the limit field to control how many to scan.">Scan Billing Notes</button>
                    <button id="browser-discover" class="ghost" data-tip="Explores what billing pages and data are accessible in your ClientCare account — run this once to map out what is available.">Discover</button>
                    <button id="browser-extract" class="ghost" data-tip="Downloads account data from ClientCare and shows a preview — does NOT save to the system yet. Use this to verify the data looks right before importing.">Extract Preview</button>
                    <button id="browser-extract-import" data-tip="Downloads account data from ClientCare AND saves it to the system immediately. This populates the Accounts board and queues.">Extract + Import</button>
                  </div>
                  <div class="row-actions" style="margin-top:10px">
                    <input id="browser-scan-limit" type="number" min="1" max="25" value="5" style="max-width:90px" data-tip="How many accounts to scan at once (1–25). Start with 5.">
                    <input id="browser-scan-offset" type="number" min="0" value="0" style="max-width:90px" data-tip="Skip this many accounts before starting the scan — use to page through the full list (e.g. 0, 5, 10…)">
                    <button id="browser-scan-accounts" class="ghost" data-tip="Scans the specified number of accounts from ClientCare and shows their billing status, blockers, and recovery band.">Scan Accounts</button>
                    <button id="browser-account-report" class="ghost" data-tip="Generates a full report for all scanned accounts — priority ranking, recovery forecast, and next actions per account.">Account Report</button>
                    <button id="browser-full-account-report" class="ghost" data-tip="Runs the complete queue — scans all accounts and builds the full prioritized work list. This is the main button to populate the dashboard.">Full Queue Report</button>
                  </div>
                </div>
              </div>

              <div class="grid two">
                <div class="card">
                  <h2>Imports</h2>
                  <p class="hint" style="margin:10px 0">Paste CSV from ClientCare exports or snapshot text as fallback.</p>
                  ${renderImportTemplate(templateFields)}
                  <textarea id="csv-input" placeholder="Paste claim export CSV here" data-tip="In ClientCare: go to Reports → Claims → export to CSV, then paste the entire CSV here and click Import CSV"></textarea>
                  <div style="margin-top:10px"><button id="import-csv" data-tip="Imports the pasted claims CSV — classifies each claim by rescue bucket (submit now, correct and resubmit, appeal, etc.) and adds them to the claims ledger">Import CSV</button></div>
                  <hr style="border-color:#27304a; margin:16px 0;">
                  <textarea id="payment-history-input" placeholder="Paste paid claims / ERA / remit CSV here" data-tip="Paste your ERA (Explanation of Remittance) or paid claims export here — this teaches the system what each payer actually pays so the collections forecast gets more accurate"></textarea>
                  <div style="margin-top:10px"><button id="import-payment-history" data-tip="Imports paid claims and ERA data — improves the collections forecast and identifies underpayments where the payer paid less than they should have">Import Payment History</button></div>
                  <hr style="border-color:#27304a; margin:16px 0;">
                  <textarea id="snapshot-input" placeholder="Paste copied table HTML or delimited text here" data-tip="If you can not export a CSV, just select and copy the table directly from ClientCare and paste here — the system will parse whatever format it can"></textarea>
                  <div style="margin-top:10px"><button id="import-snapshot" data-tip="Parses a raw copied table or any delimited text — a fallback when no CSV export is available">Import Snapshot</button></div>
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
              <h2 data-tip="Predicted cash inflow from insurance over the next 30, 60, and 90 days — based on claim status and historical payer payment patterns. More accurate the more paid claims you import.">Collections Forecast</h2>
              <p class="hint" style="margin:10px 0">Projection improves as paid claims, ERAs, and remits are imported.</p>
              <div id="reimbursement-intelligence">${renderReimbursementIntelligence(intelligence)}</div>
              <hr style="border-color:#27304a; margin:16px 0;">
              <h3>Patient AR</h3>
              <div id="patient-ar-summary">${renderPatientArSummary(opsOverview, patientArPolicy, patientArEscalation)}</div>
            </div>
            <div class="card">
              <h2>Claims Ledger</h2>
              <div class="stack">
                <div class="card">
                  <h3 data-tip="The current rule the system uses to decide whether to accept a new insurance patient — based on payer history, auth requirements, and collection rates">Insurance Intake Rule</h3>
                  <div id="insurance-intake-rule">${renderInsuranceIntakeRule(opsOverview)}</div>
                </div>
                <div class="card">
                  <h3 data-tip="Matches what was submitted vs what was paid vs what is still outstanding — shows where money is leaking">Reconciliation</h3>
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
                  <h3 data-tip="Claims where the insurance paid less than the contracted rate — these can be disputed and recovered. Review and appeal each one.">Underpayment Queue</h3>
                  <div id="underpayment-queue">${renderUnderpaymentQueue(underpayments)}</div>
                </div>
                <div class="card">
                  <h3 data-tip="Denied claims that have been flagged for appeal — each one shows the denial reason and the recommended argument to use when resubmitting">Appeals Queue</h3>
                  <div id="appeals-queue">${renderAppealsQueue(appeals)}</div>
                </div>
                <div class="card">
                  <h3 data-tip="Payer-specific rules and tactics — what each insurance company requires, how long they take, what they deny most, and how to get paid faster">Payer Playbooks</h3>
                  <div id="payer-playbooks">${renderPayerPlaybooks(payerPlaybooks)}</div>
                </div>
                <div class="card">
                  <h3>Payer Rule Overrides</h3>
                  <div id="payer-rules">${renderPayerRules(payerRules)}</div>
                </div>
                <div class="card">
                  <h3 data-tip="Patterns found in your Explanation of Remittance files — which denial codes appear most, which payers are slowest to pay, and where to focus appeal effort">ERA / Remit Insights</h3>
                  <div id="era-insights">${renderEraInsights(eraInsights)}</div>
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
      setOperatorEmail(document.getElementById('operator-email-header').value);
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
      render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, lastPackagingValidation, lastPackagingValidationHistory);
      ensureAssistantSession();
    });
    document.getElementById('assistant-open-toggle').addEventListener('click', () => {
      setAssistantOpen(!assistantOpen);
      render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, lastPackagingValidation, lastPackagingValidationHistory);
      ensureAssistantSession();
    });
    document.getElementById('assistant-input').addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') sendAssistantMessage();
    });
    initAssistantVoice();
    const useSelectedAccountVobButton = document.getElementById('use-selected-account-vob');
    if (useSelectedAccountVobButton) {
      useSelectedAccountVobButton.addEventListener('click', async () => {
        await inspectSelectedAccount();
        useSelectedAccountInVob();
      });
    }
    const insurancePreviewButton = document.getElementById('insurance-preview-run');
    if (insurancePreviewButton) insurancePreviewButton.addEventListener('click', runInsurancePreview);
    const repairPreviewButton = document.getElementById('repair-preview-run');
    if (repairPreviewButton) repairPreviewButton.addEventListener('click', () => runAccountRepair(false));
    const repairApplyButton = document.getElementById('repair-apply-run');
    if (repairApplyButton) repairApplyButton.addEventListener('click', () => runAccountRepair(true));
    const patientArSaveButton = document.getElementById('patient-ar-save-policy');
    if (patientArSaveButton) patientArSaveButton.addEventListener('click', savePatientArPolicy);
    const tenantSelect = document.getElementById('tenant-select');
    if (tenantSelect) tenantSelect.addEventListener('change', async (event) => {
      setSelectedTenantId(event.target.value || '');
      await loadDashboard({}, { skipAutoFullQueue: true });
    });
    const tenantSaveButton = document.getElementById('tenant-save');
    if (tenantSaveButton) tenantSaveButton.addEventListener('click', saveTenantProfile);
    const onboardingSaveButton = document.getElementById('onboarding-save');
    if (onboardingSaveButton) onboardingSaveButton.addEventListener('click', saveTenantOnboarding);
    const readinessExportButton = document.getElementById('readiness-export');
    if (readinessExportButton) readinessExportButton.addEventListener('click', exportReadinessReport);
    const packagingValidateButton = document.getElementById('packaging-validate');
    if (packagingValidateButton) packagingValidateButton.addEventListener('click', runPackagingValidation);
    const operatorSaveButton = document.getElementById('operator-save');
    if (operatorSaveButton) operatorSaveButton.addEventListener('click', saveOperatorAccess);
    const auditExportButton = document.getElementById('audit-export');
    if (auditExportButton) auditExportButton.addEventListener('click', exportAuditCsv);
    const payerRuleSaveButton = document.getElementById('payer-rule-save');
    if (payerRuleSaveButton) payerRuleSaveButton.addEventListener('click', savePayerRuleOverride);
    root.querySelectorAll('[data-claim-view]').forEach((button) => button.addEventListener('click', () => showClaim(button.getAttribute('data-claim-view'))));
    root.querySelectorAll('[data-claim-reclassify]').forEach((button) => button.addEventListener('click', () => reclassify(button.getAttribute('data-claim-reclassify'))));
    root.querySelectorAll('[data-action-complete]').forEach((button) => button.addEventListener('click', () => completeAction(button.getAttribute('data-action-complete'))));
    root.querySelectorAll('[data-patient-ar-queue]').forEach((button) => button.addEventListener('click', () => queuePatientArAction(button.getAttribute('data-patient-ar-queue'))));
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
