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
  let lastSavedVobProspects = [];
  let lastBrowserResult = null;
  let lastViewState = null;
  let lastVobSearch = localStorage.getItem('clientcare_vob_search') || '';
  let lastAccountSearch = localStorage.getItem('clientcare_account_search') || '';
  let vobMode = localStorage.getItem('clientcare_vob_mode') || 'existing';
  let utilitySidebarCollapsed = localStorage.getItem('clientcare_utility_sidebar_collapsed') === 'true';
  const savedUtilityDock = localStorage.getItem('clientcare_utility_sidebar_docked_bottom');
  let utilitySidebarDockedBottom = savedUtilityDock == null
    ? (typeof window !== 'undefined' && window.innerWidth < 1700)
    : savedUtilityDock === 'true';
  let lastProspectDraft = {
    full_name: '',
    phone: '',
    email: '',
  };
  let lastVobCardFile = null;
  let lastVobCardFiles = [];
  let lastVobCardState = 'idle';
  let lastVobCardSummary = null;
  let lastVobCardError = '';
  let lastVobClientHref = '';
  let lastClientcarePipelineState = 'idle';
  let lastClientcarePipelineResult = null;
  let lastClientcarePipelineError = '';
  let lastClientcarePipelineDryRun = false;
  /** Blue Shield / Blue Cross = in-network. Everything else = out of network (default). */
  function inferNetworkStatus(payerName = '') {
    return /blue\s*(shield|cross)/i.test(String(payerName || '')) ? 'true' : 'false';
  }

  let lastInsuranceDraft = {
    payer_name: '',
    member_id: '',
    group_number: '',
    subscriber_name: '',
    billed_amount: '',
    copay: '',
    deductible_remaining: '',
    coinsurance_pct: '',
    coverage_active: '',
    in_network: 'false', // default out of network
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

  // ── Toast notifications (replaces alert()) ──────────────────────────────
  let toastContainer = null;
  function toast(message, type = 'info') {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:grid;gap:10px;max-width:360px;';
      document.body.appendChild(toastContainer);
    }
    const el = document.createElement('div');
    const colors = { info: '#1e3a5f', success: '#113b2d', warn: '#4a3a12', error: '#4a1f28' };
    const borders = { info: '#3a5f8f', success: '#26c281', warn: '#f0b429', error: '#ef476f' };
    el.style.cssText = `background:${colors[type]||colors.info};border:1px solid ${borders[type]||borders.info};border-radius:12px;padding:12px 16px;color:#edf2f7;font-size:14px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,.4);cursor:pointer;`;
    el.textContent = message;
    el.addEventListener('click', () => el.remove());
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 8000 : 5000);
  }

  // ── Setup status helpers ─────────────────────────────────────────────────
  function getSetupSteps() {
    const hasKey = Boolean(getApiKey().trim());
    const hasData = Boolean(lastAccountReport?.items?.length);
    const browserReady = Boolean(window._ccBrowserReady);
    return [
      { id: 'key', done: hasKey, label: 'API key saved', action: 'Enter your Command key in the field above and click Save access', actionLabel: null },
      { id: 'browser', done: browserReady, label: 'ClientCare connected', action: 'Open Tools below → click Login Test. If it fails, set CLIENTCARE_BASE_URL, CLIENTCARE_USERNAME, and CLIENTCARE_PASSWORD in Railway env vars first.', actionLabel: 'Open Tools' },
      { id: 'data', done: hasData, label: 'Account data loaded', action: 'Open Tools below → click Full Queue Report to pull all accounts from ClientCare into the dashboard.', actionLabel: 'Open Tools' },
    ];
  }

  function renderSetupStrip() {
    const steps = getSetupSteps();
    const allDone = steps.every((s) => s.done);
    if (allDone) return '';
    return `
      <div style="background:#131a2e;border:1px solid #3a4f7a;border-radius:14px;padding:16px;margin-bottom:4px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <strong style="color:#8aa4ff;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Setup checklist</strong>
          <span class="muted small">Complete these 3 steps to populate the dashboard</span>
        </div>
        <div style="display:grid;gap:10px;">
          ${steps.map((step, i) => `
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <div style="width:24px;height:24px;border-radius:999px;border:2px solid ${step.done ? '#26c281' : '#3a4f7a'};background:${step.done ? '#113b2d' : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:${step.done ? '#7ef0b8' : '#98a5c3'};">${step.done ? '✓' : i + 1}</div>
              <div>
                <div style="font-weight:600;color:${step.done ? '#7ef0b8' : '#edf2f7'}">${escapeHtml(step.label)}${step.done ? '' : ''}</div>
                ${!step.done ? `<div class="muted small" style="margin-top:4px;">${escapeHtml(step.action)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

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

  /** All card files for uploads — keeps working after OCR (in-memory) when the hidden file input is empty. */
  function getVobCardFilesForUpload() {
    if (lastVobCardFiles?.length) return [...lastVobCardFiles];
    if (lastVobCardFile) return [lastVobCardFile];
    const inline = document.getElementById('vob-inline-file')?.files;
    if (inline?.length) return Array.from(inline);
    const rec = document.getElementById('reconcile-card-file')?.files?.[0];
    return rec ? [rec] : [];
  }

  /** Card files for the real ClientCare VOB path — prefer the VOB panel files, then any extra files in the real-flow panel. */
  function getReconcileCardFiles() {
    const vobFiles = getVobCardFilesForUpload();
    if (vobFiles.length) return vobFiles;
    const reconcileFiles = document.getElementById('reconcile-card-file')?.files;
    if (reconcileFiles?.length) return Array.from(reconcileFiles);
    return [];
  }

  function hasReadableCardDraft() {
    return lastVobCardState === 'ready'
      && Boolean(String(lastInsuranceDraft.payer_name || '').trim())
      && Boolean(String(lastInsuranceDraft.member_id || '').trim());
  }

  /** Normalize a name for fuzzy comparison — lowercase, letters/numbers only. */
  function normalizeName(s = '') {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Match subscriber name from card against loaded backlog clients.
   * Returns {item, score} sorted best-first. Score 2 = strong, 1 = partial.
   */
  function findSubscriberCandidates(subscriberName = '') {
    if (!subscriberName || !lastAccountReport?.items?.length) return [];
    const needle = normalizeName(subscriberName);
    if (needle.length < 3) return [];
    const needleParts = subscriberName.trim().toLowerCase().split(/\s+/).filter((p) => p.length > 1);
    const significantParts = needleParts.filter((p) => p.length >= 3);
    const results = [];
    for (const item of lastAccountReport.items) {
      const hay = normalizeName(item.client || item.name || '');
      if (!hay) continue;
      // Exact normalized match
      if (hay === needle) { results.push({ item, score: 3 }); continue; }
      // Needle contained in hay or hay contained in needle
      if (hay.includes(needle) || needle.includes(hay)) { results.push({ item, score: 2 }); continue; }
      // Count how many name parts match
      const hayRaw = String(item.client || '').toLowerCase();
      const matched = needleParts.filter((p) => hayRaw.includes(p)).length;
      if (matched >= 2 || (matched === 1 && needleParts.length === 1)) {
        results.push({ item, score: matched });
        continue;
      }
      // Last, first ordering: e.g. "Leyva, Yanhari" vs "Yanhari Leyva Pedraza"
      if (significantParts.length >= 2 && significantParts.every((p) => hayRaw.includes(p))) {
        results.push({ item, score: 2 });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Find accounts in the loaded backlog that share the same payer as the card.
   * Used as fallback when no subscriber name match found.
   */
  function findPayerCandidates(payerName = '') {
    if (!payerName || !lastAccountReport?.items?.length) return [];
    const needle = normalizeName(payerName);
    return lastAccountReport.items
      .filter((item) => {
        const hay = normalizeName(item.payer_name || item.payer || '');
        return hay && (hay.includes(needle) || needle.includes(hay));
      })
      .slice(0, 5);
  }

  function buildVobCandidatePickerHtml(rawCandidates, subscriberLabelHtml, subscriberPlain = '') {
    return rawCandidates.length
      ? `
          <div style="margin-top:8px;padding:10px;background:#0f1a30;border:1px solid #2d3b5f;border-radius:8px;">
            <div style="font-size:11px;font-weight:700;color:#8aa4ff;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">
              Who does this card belong to?${subscriberLabelHtml}
            </div>
            <div style="display:grid;gap:6px;">
              ${rawCandidates.map((item) => `
                <button type="button" data-card-candidate-href="${escapeHtml(item.billingHref || item.href || '')}"
                  style="text-align:left;background:#131a2e;border:1px solid #27304a;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px;">
                  <strong style="color:#edf2f7;">${escapeHtml(item.client || item.name || 'Unknown')}</strong>
                  <span style="color:#98a5c3;font-size:11px;margin-left:8px;">${escapeHtml(item.payer_name || item.payer || '')}</span>
                </button>
              `).join('')}
            </div>
            <div style="font-size:11px;color:#98a5c3;margin-top:8px;">
              Not listed? Clear the account search box on the left if someone is hidden by a text filter.
            </div>
          </div>
        `
      : `<div style="margin-top:6px;padding:8px;background:#0f1a30;border:1px solid #2d3b5f;border-radius:8px;font-size:12px;color:#98a5c3;">
            ${subscriberPlain ? `Subscriber on card: <strong style="color:#edf2f7;">${escapeHtml(subscriberPlain)}</strong><br>` : ''}
            No match found in loaded backlog. Pick the client from the billing board or run Full Queue Report.
           </div>`;
  }

  async function searchClientCareDirectoryCandidates(subscriberName = '') {
    const query = String(subscriberName || '').trim();
    if (!query || !getApiKey()) return [];
    try {
      const params = new URLSearchParams({
        query,
        limit: '5',
        page_timeout_ms: '12000',
        max_directory_items: '250',
      });
      const result = await api(`/api/v1/clientcare-billing/browser/client-directory-search?${params.toString()}`);
      return Array.isArray(result?.candidates) ? result.candidates : [];
    } catch (error) {
      console.warn('[ClientCare] client directory search failed:', error.message);
      return [];
    }
  }

  function applyCardMatchedClient(target = {}, options = {}) {
    const billingHref = String(target.billingHref || target.href || '').trim();
    const cachedMatch = lastAccountReport?.items?.find((item) =>
      (item.billingHref || item.href || '') === billingHref,
    );
    if (cachedMatch) {
      selectAccountForVob(cachedMatch);
    } else if (billingHref) {
      lastVobClientHref = billingHref;
      setVobMode('existing');
      setVobSearch(target.client || target.name || '');
      lastInsuranceDraft = {
        ...lastInsuranceDraft,
        payer_name: lastVobCardSummary?.payer_name || lastInsuranceDraft.payer_name,
        member_id: lastVobCardSummary?.member_id || lastInsuranceDraft.member_id,
        group_number: lastVobCardSummary?.group_number || lastInsuranceDraft.group_number,
        subscriber_name: lastVobCardSummary?.subscriber_name || lastInsuranceDraft.subscriber_name,
        source_label: target.client || target.name || lastInsuranceDraft.source_label,
      };
    }
    rerender();
    document.getElementById('verification-of-benefits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!options.silent) {
      toast(`Selected ${escapeHtml(target.client || target.name || 'client')} from ClientCare.`, 'success');
    }
  }

  function renderVobCardStatus() {
    if (lastVobCardState === 'reading' && lastVobCardFile?.name) {
      return `<span style="color:#8aa4ff;">Reading card… <em>${escapeHtml(lastVobCardFile.name)}</em></span>`;
    }
    if (lastVobCardState === 'error' && lastVobCardError) {
      return `<span style="color:#ff9db0;">Card read failed: ${escapeHtml(lastVobCardError)}</span>`;
    }
    if (lastVobCardSummary) {
      const payer = lastVobCardSummary.payer_name
        ? `<strong>${escapeHtml(lastVobCardSummary.payer_name)}</strong>`
        : '<span class="muted">payer unknown</span>';
      const mid = lastVobCardSummary.member_id
        ? ` · ID <code style="background:#1a2540;padding:1px 5px;border-radius:4px;">${escapeHtml(lastVobCardSummary.member_id)}</code>`
        : '';
      const grp = lastVobCardSummary.group_number
        ? ` · Grp <code style="background:#1a2540;padding:1px 5px;border-radius:4px;">${escapeHtml(lastVobCardSummary.group_number)}</code>`
        : '';

      const clearBtn = `&nbsp;<button type="button" id="vob-inline-clear"
            style="background:none;border:none;color:#98a5c3;cursor:pointer;font-size:12px;padding:0 0 0 6px;text-decoration:underline;">clear</button>`;

      const headLine = `
        <span style="color:#7ef0b8;font-weight:700;">✓ Card read</span>
        &nbsp;—&nbsp;${payer}${mid}${grp}
        ${clearBtn}`;

      const subscriberLabel = lastVobCardSummary.subscriber_name
        ? ` for subscriber <strong>${escapeHtml(lastVobCardSummary.subscriber_name)}</strong>` : '';

      // Billing-board matches from OCR subscriber name beat portal API "matched_client" (often wrong patient).
      const subBoard = lastVobCardSummary.boardCandidates || [];
      if (subBoard.length > 0) {
        const rawCandidates = subBoard.map((c) => c.item);
        const plainSub = String(lastVobCardSummary.subscriber_name || '').trim();
        return headLine + buildVobCandidatePickerHtml(rawCandidates, subscriberLabel, plainSub);
      }

      if (lastVobCardSummary.directorySearchState === 'searching') {
        return `${headLine}
          <div style="margin-top:8px;padding:10px;background:#0f1a30;border:1px solid #2d3b5f;border-radius:8px;font-size:12px;color:#98a5c3;">
            Searching ClientCare for subscriber <strong style="color:#edf2f7;">${escapeHtml(String(lastVobCardSummary.subscriber_name || '').trim())}</strong>…
          </div>`;
      }

      const dirCandidates = lastVobCardSummary.directoryCandidates || [];
      if (dirCandidates.length > 0) {
        const plainSub = String(lastVobCardSummary.subscriber_name || '').trim();
        return headLine + buildVobCandidatePickerHtml(dirCandidates, subscriberLabel, plainSub);
      }

      if (lastVobCardSummary.matchedClientName && lastVobCardSummary.matchConfirmed) {
        return `
        <span style="color:#7ef0b8;font-weight:700;">✓ Card read</span>
        &nbsp;—&nbsp;${payer}${mid}${grp}
        &nbsp;·&nbsp;matched: <strong>${escapeHtml(lastVobCardSummary.matchedClientName)}</strong>
        ${clearBtn}`;
      }

      if (lastVobCardSummary.matchedClientName && !lastVobCardSummary.matchConfirmed) {
        return `
          ${headLine}
          <div style="margin-top:8px;padding:10px;background:#1a2a10;border:1px solid #4a7a20;border-radius:8px;">
            <div style="font-size:12px;color:#ffd666;font-weight:600;margin-bottom:6px;">
              ⚠ Portal suggested a client — confirm before trusting
            </div>
            <div style="font-size:13px;color:#edf2f7;margin-bottom:8px;">
              Found <strong>${escapeHtml(lastVobCardSummary.matchedClientName)}</strong> — insurance is often under a different household member.
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" id="vob-match-confirm"
                style="background:#26c281;border:none;border-radius:6px;padding:6px 14px;color:#000;font-weight:700;cursor:pointer;font-size:12px;">
                Yes, that's the right client
              </button>
              <button type="button" id="vob-match-reject"
                style="background:#27304a;border:none;border-radius:6px;padding:6px 14px;color:#edf2f7;cursor:pointer;font-size:12px;">
                No, different person
              </button>
            </div>
          </div>
        `;
      }

      const rawCandidates = findPayerCandidates(lastVobCardSummary.payer_name);
      const plainSub = String(lastVobCardSummary.subscriber_name || '').trim();
      if (lastVobCardSummary.directorySearchState === 'done' && !rawCandidates.length) {
        return `${headLine}
          <div style="margin-top:8px;padding:10px;background:#0f1a30;border:1px solid #2d3b5f;border-radius:8px;font-size:12px;color:#98a5c3;">
            Searched ClientCare and the loaded billing backlog for subscriber <strong style="color:#edf2f7;">${escapeHtml(plainSub || 'unknown')}</strong> but did not find a reliable match yet. Save the card to history and run a broader ClientCare search from the tools panel if needed.
          </div>`;
      }
      return headLine + buildVobCandidatePickerHtml(rawCandidates, subscriberLabel, plainSub);
    }
    return '';
  }

  /** When card OCR subscriber does not match the account row selected on the board, prompt one-click switch. */
  function renderVobCardAccountMismatchBanner() {
    if (vobMode !== 'existing' || !lastVobCardSummary?.subscriber_name) return '';
    const sub = String(lastVobCardSummary.subscriber_name || '').trim();
    if (!sub) return '';
    const sel = getSelectedAccountItem();
    if (!sel) return '';
    const cands = findSubscriberCandidates(sub);
    if (!cands.length) return '';
    const best = cands[0].item;
    if (getRepairKey(best) === getRepairKey(sel)) return '';
    return `
        <div class="card" style="margin-bottom:12px;background:#3b1520;border:1px solid #ef476f;">
          <strong style="color:#ffb4c1">Account mismatch</strong>
          <p class="small" style="margin:8px 0 10px;color:#ffd5dd;line-height:1.45;">
            Selected: <strong>${escapeHtml(sel.client || '')}</strong>.
            Card subscriber: <strong>${escapeHtml(sub)}</strong>.
            Best match in your queue: <strong>${escapeHtml(best.client || '')}</strong>.
            Data completeness on the left is for the <em>selected</em> account — switch below so the card lines up with the file you are working.
          </p>
          <button type="button" data-card-candidate-href="${escapeHtml(best.billingHref || best.href || '')}"
            style="background:#26c281;border:none;border-radius:8px;padding:8px 14px;color:#000;font-weight:700;cursor:pointer;font-size:13px;">
            Switch to ${escapeHtml(best.client || 'matched client')}
          </button>
        </div>`;
  }

  function getVobCardZoneStyle() {
    if (lastVobCardState === 'ready' && lastVobCardFile) {
      return 'border:2px dashed #7ef0b8;border-radius:10px;padding:14px 16px;text-align:center;background:#0d2e1f22;cursor:pointer;margin-bottom:6px;';
    }
    if (lastVobCardState === 'error') {
      return 'border:2px dashed #ef476f;border-radius:10px;padding:14px 16px;text-align:center;background:#2a0f1522;cursor:pointer;margin-bottom:6px;';
    }
    return 'border:2px dashed #5b8fd4;border-radius:10px;padding:14px 16px;text-align:center;background:#0a0f1a;cursor:pointer;margin-bottom:6px;';
  }

  function getVobCardZoneLabel() {
    const count = lastVobCardFiles.length;
    if (count >= 2 && lastVobCardState === 'ready') return `✓ ${count} files — front + back merged`;
    if (count >= 2 && lastVobCardState === 'reading') return `Reading ${count} files…`;
    if (lastVobCardFile?.name && lastVobCardState === 'ready') return `✓ ${lastVobCardFile.name}`;
    if (lastVobCardFile?.name && lastVobCardState === 'reading') return `Reading ${lastVobCardFile.name}…`;
    if (lastVobCardFile?.name) return lastVobCardFile.name;
    return 'Drop front + back here — or click to browse';
  }

  /**
   * Wire the inline card drop zone that lives inside the VOB panel.
   * Called after every render() since the VOB panel HTML is recreated on rerender.
   */
  function wireVobCardZone() {
    const zone = document.getElementById('vob-inline-dropzone');
    const input = document.getElementById('vob-inline-file');
    if (!zone || !input) return;

    const resetBorder = () => {
      zone.style.borderColor = lastVobCardState === 'ready' ? '#7ef0b8' : lastVobCardState === 'error' ? '#ef476f' : '#5b8fd4';
      zone.style.background = lastVobCardState === 'ready' ? '#0d2e1f22' : lastVobCardState === 'error' ? '#2a0f1522' : '#0a0f1a';
    };

    async function autoOcrCard(fileOrList) {
      const raw = fileOrList instanceof FileList
        ? Array.from(fileOrList)
        : (Array.isArray(fileOrList) ? fileOrList : (fileOrList ? [fileOrList] : []));
      if (!raw.length) return;
      // Clone into fresh File objects — live FileList / input.files can be cleared when we rerender()
      // and replace the whole #app DOM (browser-dependent). Keeps "Read card + save" working.
      let fileList = raw;
      try {
        fileList = await Promise.all(raw.map(async (f) => {
          const buf = await f.arrayBuffer();
          return new File([buf], f.name || 'insurance-card', { type: f.type || 'application/octet-stream' });
        }));
      } catch {
        fileList = raw;
      }
      lastVobCardFile = fileList[0];
      lastVobCardFiles = fileList;
      lastVobCardState = 'reading';
      lastVobCardSummary = null;
      lastVobCardError = '';
      rerender();
      try {
        const form = new FormData();
        fileList.forEach((f) => form.append('card', f));
        form.append('full_name', lastProspectDraft.full_name || '');
        form.append('phone', lastProspectDraft.phone || '');
        form.append('email', lastProspectDraft.email || '');
        form.append('billed_amount', String(lastInsuranceDraft.billed_amount || ''));
        form.append('requested_by', 'overlay_auto');
        const result = await api('/api/v1/clientcare-billing/insurance/card-intake', {
          method: 'POST',
          body: form,
        });
        if (result.extracted) {
          const newPayer = result.extracted.payer_name || lastInsuranceDraft.payer_name;
          lastInsuranceDraft = {
            ...lastInsuranceDraft,
            payer_name: newPayer,
            member_id: result.extracted.member_id || lastInsuranceDraft.member_id,
            group_number: result.extracted.group_number || lastInsuranceDraft.group_number,
            subscriber_name: result.extracted.subscriber_name || lastInsuranceDraft.subscriber_name,
            in_network: inferNetworkStatus(newPayer),
            coverage_active: '',
            auth_required: '',
            source_label: lastProspectDraft.full_name || '',
          };
        }
        lastInsurancePreview = result.preview || null;
        if (result.saved) {
          lastSavedVobProspects = [result.saved, ...lastSavedVobProspects.filter((e) => e.id !== result.saved.id)];
        }
        const ex = result.extracted || {};
        const matchedClient = result.matched_client || null;
        const subscriberName = ex.subscriber_name || '';
        let boardCandidates = findSubscriberCandidates(subscriberName);

        let pickedItem = null;
        if (boardCandidates.length === 1 && boardCandidates[0].score >= 2) {
          pickedItem = boardCandidates[0].item;
          boardCandidates = [];
        } else if (boardCandidates.length && boardCandidates[0].score >= 3) {
          pickedItem = boardCandidates[0].item;
          boardCandidates = [];
        }

        lastVobCardSummary = {
          ...ex,
          matchedClientName: matchedClient?.patient_name || '',
          matchConfirmed: matchedClient?.confirmed === true,
          boardCandidates,
          directoryCandidates: [],
          directorySearchState: !pickedItem && subscriberName ? 'searching' : 'idle',
        };
        lastVobCardState = 'ready';
        lastVobCardError = '';

        if (pickedItem) {
          applyCardMatchedClient(pickedItem, { silent: true });
          toast(`Selected ${escapeHtml(pickedItem.client)} — subscriber name on card matched this account.`, 'success');
        } else {
          rerender();
          const directoryCandidates = subscriberName
            ? await searchClientCareDirectoryCandidates(subscriberName)
            : [];
          const exactDirectory = directoryCandidates.find((item) => Number(item.score || 0) >= 100)
            || (directoryCandidates.length === 1 && Number(directoryCandidates[0].score || 0) >= 70 ? directoryCandidates[0] : null);
          if (exactDirectory) {
            lastVobCardSummary = {
              ...(lastVobCardSummary || ex),
              ...ex,
              directoryCandidates: [],
              directorySearchState: 'done',
            };
            applyCardMatchedClient(exactDirectory, { silent: true });
            toast(`Selected ${escapeHtml(exactDirectory.client || 'client')} from ClientCare using the card subscriber name.`, 'success');
            return;
          }
          lastVobCardSummary = {
            ...(lastVobCardSummary || ex),
            ...ex,
            directoryCandidates,
            directorySearchState: 'done',
          };
          rerender();
        }
      } catch (err) {
        lastVobCardState = 'error';
        lastVobCardError = err.message || 'Unknown OCR error';
        toast(`Card OCR failed: ${err.message}`, 'error');
        rerender();
      }
    }

    zone.addEventListener('click', (e) => {
      if (e.target === input || e.target.closest('button')) return;
      e.preventDefault();
      input.click();
    });
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.style.borderColor = '#7ef0b8';
      zone.style.background = '#0d2e1f44';
    });
    zone.addEventListener('dragleave', resetBorder);
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      resetBorder();
      if (e.dataTransfer?.files?.length) {
        autoOcrCard(e.dataTransfer.files);
      }
    });
    input.addEventListener('change', () => {
      if (input.files?.length) autoOcrCard(input.files);
    });

    // Confirm/reject buttons for name-only matches
    const confirmBtn = document.getElementById('vob-match-confirm');
    const rejectBtn = document.getElementById('vob-match-reject');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (lastVobCardSummary) {
          lastVobCardSummary = { ...lastVobCardSummary, matchConfirmed: true };
          rerender();
        }
      });
    }
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        if (lastVobCardSummary) {
          // Clear the suggested match — user will pick manually from the board
          lastVobCardSummary = { ...lastVobCardSummary, matchedClientName: '', matchConfirmed: false };
          rerender();
        }
      });
    }
  }

  // No-op kept for backward compat — wiring is now done inline inside render().
  function wireOverlayCardStripOnce() {}

  function wireInsuranceCardDropzones(_container) {}

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

  function setAccountSearch(value) {
    lastAccountSearch = String(value || '');
    if (lastAccountSearch) localStorage.setItem('clientcare_account_search', lastAccountSearch);
    else localStorage.removeItem('clientcare_account_search');
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

  function setVobMode(value) {
    vobMode = value === 'prospect' ? 'prospect' : 'existing';
    localStorage.setItem('clientcare_vob_mode', vobMode);
  }

  function setVobSearch(value) {
    lastVobSearch = String(value || '');
    localStorage.setItem('clientcare_vob_search', lastVobSearch);
  }

  function setUtilitySidebarCollapsed(value) {
    utilitySidebarCollapsed = Boolean(value);
    localStorage.setItem('clientcare_utility_sidebar_collapsed', String(utilitySidebarCollapsed));
  }

  function setUtilitySidebarDockedBottom(value) {
    utilitySidebarDockedBottom = Boolean(value);
    localStorage.setItem('clientcare_utility_sidebar_docked_bottom', String(utilitySidebarDockedBottom));
  }

  function triStateToSelect(value) {
    if (value === true || value === 'true') return 'true';
    if (value === false || value === 'false') return 'false';
    return '';
  }

  function hydrateVobFromSavedProspect(entry) {
    if (!entry) return;
    setVobMode('prospect');
    lastProspectDraft = {
      full_name: entry.full_name || '',
      phone: entry.phone || '',
      email: entry.email || '',
    };
    const snap = entry.preview_result && typeof entry.preview_result === 'object' ? entry.preview_result._form_snapshot : null;
    lastInsuranceDraft = {
      ...lastInsuranceDraft,
      payer_name: entry.payer_name || '',
      member_id: entry.member_id || '',
      billed_amount: snap && snap.billed_amount != null && snap.billed_amount !== '' ? String(snap.billed_amount) : '',
      copay: snap && snap.copay != null && snap.copay !== '' ? String(snap.copay) : '',
      deductible_remaining: snap && snap.deductible_remaining != null && snap.deductible_remaining !== '' ? String(snap.deductible_remaining) : '',
      coinsurance_pct: snap && snap.coinsurance_pct != null && snap.coinsurance_pct !== '' ? String(snap.coinsurance_pct) : '',
      coverage_active: snap ? triStateToSelect(snap.coverage_active) : '',
      in_network: snap ? triStateToSelect(snap.in_network) : '',
      auth_required: snap ? triStateToSelect(snap.auth_required) : '',
      source_label: entry.full_name || '',
    };
    lastInsurancePreview = entry.preview_result || null;
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

  function getAllAccountItems() {
    return [...(lastAccountReport?.items || [])].sort((a, b) => String(a.client || '').localeCompare(String(b.client || '')));
  }

  function getVobMatches() {
    const query = String(lastVobSearch || '').trim().toLowerCase();
    if (!query) return [];
    return getAllAccountItems()
      .filter((item) => {
        const payer = item.accountSummary?.insurers?.[0] || item.insurancePreview?.[0]?.insuranceName || '';
        const memberId = item.insurancePreview?.[0]?.memberId || '';
        return [item.client, payer, memberId].some((value) => String(value || '').toLowerCase().includes(query));
      })
      .slice(0, 8);
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
    const execution = buildExecutionSummary(item);
    const lines = [
      item.client || 'Unknown client',
      `Status: ${item.diagnosis?.status || 'review'}`,
      `Note: ${item.notePreview || 'No note preview'}`,
    ];
    const wrong = item.diagnosis?.whatWentWrong || [];
    const needed = item.diagnosis?.needed || [];
    if (wrong.length) lines.push(`Issue: ${wrong[0]}`);
    if (needed.length) lines.push(`Next: ${needed[0]}`);
    if (execution.systemNext) lines.push(`System: ${execution.systemNext}`);
    if (execution.youNext) lines.push(`You: ${execution.youNext}`);
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

  function buildExecutionSummary(item) {
    const visual = deriveAccountVisualState(item);
    const status = String(item.diagnosis?.status || '').toLowerCase();
    const flags = normalizeFlagList(item);
    const missingInsurer = !(item.accountSummary?.insurers || []).length;
    const needed = item.diagnosis?.needed || [];
    const wrong = item.diagnosis?.whatWentWrong || [];

    let systemNext = 'Keep monitoring the account and update the queue when status changes.';
    let youNext = 'No operator action is required right now.';

    if (missingInsurer) {
      systemNext = 'Recheck ClientCare for insurance, then request it from the client if it is still missing.';
      youNext = 'Review the request only if the system still cannot find insurance after outreach.';
    } else if (status === 'client_match_issue') {
      systemNext = 'Keep the account parked until the patient and insurance record match.';
      youNext = needed[0] || 'Confirm the correct client record before billing continues.';
    } else if (status === 'insurance_setup_issue') {
      systemNext = 'Pull the latest insurance data, then prepare VOB and client outreach if fields are still missing.';
      youNext = needed[0] || 'Review the insurance setup and confirm benefits before claim work continues.';
    } else if (status === 'billing_configuration_issue' || flags.includes('billing_status_blank') || flags.includes('bill_provider_type_blank')) {
      systemNext = 'Hold billing submission until the account setup fields are corrected.';
      youNext = needed[0] || 'Repair the missing billing configuration fields.';
    } else if (visual.state === 'yellow') {
      systemNext = needed[0] || wrong[0] || 'Track the claim and keep the next billing step moving.';
      youNext = 'Only step in if the account turns red or a payer/client reply needs judgment.';
    } else if (visual.state === 'green') {
      systemNext = 'Keep the file healthy and surface any new blocker automatically.';
      youNext = 'No action unless the system escalates the file back to you.';
    }

    return {
      systemNext,
      youNext,
      blocker: wrong[0] || needed[0] || visual.summary,
    };
  }

  function buildAccountOutreachPrompt(item, channel) {
    const selectedInsurance = (item.insurancePreview || [])[0] || {};
    const missing = [
      !(item.accountSummary?.insurers || []).length && 'insurance carrier',
      !String(selectedInsurance.memberId || '').trim() && 'member ID',
      !String(selectedInsurance.subscriberName || '').trim() && 'subscriber name',
      String(item.diagnosis?.status || '') === 'client_match_issue' && 'client identity match details',
      String(item.diagnosis?.status || '') === 'insurance_setup_issue' && 'coverage effective/benefit details',
    ].filter(Boolean);

    return [
      `Prepare and queue a ${channel} outreach for ${item.client || 'this client'}.`,
      `Goal: unblock billing work for the selected ClientCare account.`,
      `Current blocker: ${buildExecutionSummary(item).blocker}.`,
      `Missing or unverified information: ${missing.length ? missing.join(', ') : 'confirm current insurance and billing details already on file'}.`,
      `Use the client contact information already stored in ClientCare if available, then return a short outreach draft and the next system action after the reply.`,
    ].join(' ');
  }

  function renderDataCompletenessCard(item) {
    const selectedInsurance = (item.insurancePreview || [])[0] || {};
    const boardSel = getSelectedAccountItem();
    const sameAccount = boardSel && item && getRepairKey(boardSel) === getRepairKey(item);
    const subOnCard = String(lastVobCardSummary?.subscriber_name || lastInsuranceDraft.subscriber_name || '').trim();
    let ocrMerge = false;
    if (sameAccount && lastVobCardState === 'ready' && String(lastInsuranceDraft.payer_name || '').trim()) {
      if (!subOnCard) ocrMerge = true;
      else {
        const cands = findSubscriberCandidates(subOnCard);
        const best = cands[0]?.item;
        ocrMerge = !best || getRepairKey(best) === getRepairKey(item);
      }
    }
    const ccPayer = (item.accountSummary?.insurers || [])[0] || selectedInsurance.insuranceName || '';
    const ccMember = selectedInsurance.memberId || '';
    const ccSub = selectedInsurance.subscriberName || '';
    const payerVal = ccPayer || (ocrMerge ? String(lastInsuranceDraft.payer_name || '').trim() : '');
    const memberVal = ccMember || (ocrMerge ? String(lastInsuranceDraft.member_id || '').trim() : '');
    const subVal = ccSub || (ocrMerge ? subOnCard : '');
    const rows = [
      { label: 'Client name', value: item.client || '', state: item.client ? 'ok' : 'bad' },
      { label: 'Payer', value: payerVal + (!ccPayer && payerVal && ocrMerge ? ' (card OCR)' : ''), state: payerVal ? 'ok' : 'bad' },
      { label: 'Member ID', value: memberVal + (!ccMember && memberVal && ocrMerge ? ' (card OCR)' : ''), state: memberVal ? 'ok' : 'bad' },
      { label: 'Subscriber', value: subVal, state: subVal ? 'ok' : 'warn' },
      { label: 'Billing status', value: item.accountSummary?.clientBillingStatus || '', state: item.accountSummary?.clientBillingStatus ? 'ok' : 'bad' },
      { label: 'Provider type', value: item.accountSummary?.billProviderType || '', state: item.accountSummary?.billProviderType ? 'ok' : 'bad' },
      { label: 'Payment status', value: item.accountSummary?.paymentStatus || '', state: item.accountSummary?.paymentStatus ? 'ok' : 'warn' },
    ];
    return `
      <div class="card">
        <strong>Data completeness</strong>
        <div class="small muted" style="margin:8px 0 12px;">System pull first. Only request or type what could not be found in ClientCare.${ocrMerge ? ' Card OCR is merged here when it matches this client.' : ''}</div>
        <table>
          <thead><tr><th>Field</th><th>Current value</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.label)}</td>
                <td>${escapeHtml(row.value || 'Missing')}</td>
                <td><span class="badge ${badgeClass(row.state)}">${escapeHtml(row.value ? 'found' : (row.state === 'warn' ? 'review' : 'missing'))}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function buildInsuranceDraftFromAccount(item = {}) {
    const selectedInsurance = (item.insurancePreview || [])[getSelectedRepairSlot(item)] || (item.insurancePreview || [])[0] || {};
    return {
      payer_name: selectedInsurance.insuranceName || '',
      member_id: selectedInsurance.memberId || '',
      group_number: selectedInsurance.groupNumber || selectedInsurance.group_number || '',
      subscriber_name: selectedInsurance.subscriberName || selectedInsurance.subscriber_name || '',
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

  function selectAccountForVob(item) {
    if (!item) return;
    setAccountFilter('all');
    setAccountSearch('');
    const prev = { ...lastInsuranceDraft };
    const acct = buildInsuranceDraftFromAccount(item);
    const allItems = getFilteredItems();
    const nextIndex = allItems.findIndex((entry) => entry === item || getRepairKey(entry) === getRepairKey(item));
    if (nextIndex >= 0) selectedAccountIndex = nextIndex;
    else toast('Could not focus that account in the current board — try clearing filters or account search.', 'warn');
    setVobMode('existing');
    setVobSearch(item.client || '');
    lastInsuranceDraft = {
      ...prev,
      ...acct,
      payer_name: String(acct.payer_name || '').trim() || prev.payer_name,
      member_id: String(acct.member_id || '').trim() || prev.member_id,
      group_number: String(acct.group_number || '').trim() || prev.group_number,
      subscriber_name: String(acct.subscriber_name || '').trim() || prev.subscriber_name,
      billed_amount: String(acct.billed_amount || '').trim() || prev.billed_amount,
      copay: String(acct.copay || '').trim() || prev.copay,
      deductible_remaining: String(acct.deductible_remaining || '').trim() || prev.deductible_remaining,
      coinsurance_pct: String(acct.coinsurance_pct || '').trim() || prev.coinsurance_pct,
      coverage_active: String(acct.coverage_active || '').trim() || prev.coverage_active,
      in_network: String(acct.in_network || '').trim() !== ''
        ? acct.in_network
        : prev.in_network,
      auth_required: String(acct.auth_required || '').trim() || prev.auth_required,
      source_label: item.client || prev.source_label,
    };
    rerender();
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
      ...lastInsuranceDraft,
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
    setVobMode('existing');
    setVobSearch(item.client || '');
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
    let filtered;
    switch (accountFilter) {
      case 'operator':
        filtered = sorted.filter((item) => deriveAccountVisualState(item).state === 'red');
        break;
      case 'watch':
        filtered = sorted.filter((item) => deriveAccountVisualState(item).state === 'yellow');
        break;
      case 'healthy':
        filtered = sorted.filter((item) => deriveAccountVisualState(item).state === 'green');
        break;
      case 'strong':
        filtered = sorted.filter((item) => ['strong', 'possible'].includes(String(item.recoveryBand?.band || '')));
        break;
      case 'insurance':
        filtered = sorted.filter((item) => String(item.diagnosis?.status || '') === 'insurance_setup_issue');
        break;
      case 'missing':
        filtered = sorted.filter((item) => !(item.accountSummary?.insurers || []).length);
        break;
      case 'client_match':
        filtered = sorted.filter((item) => String(item.diagnosis?.status || '') === 'client_match_issue');
        break;
      case 'oldest':
        filtered = sorted;
        break;
      default:
        filtered = sorted;
        break;
    }

    const query = String(lastAccountSearch || '').trim().toLowerCase();
    if (!query) return filtered;

    return filtered.filter((item) => {
      const insurer = (item.accountSummary?.insurers || []).join(' ');
      const memberIds = (item.insurancePreview || []).map((insurance) => insurance.memberId || '').join(' ');
      const note = item.notePreview || '';
      const needed = (item.diagnosis?.needed || []).join(' ');
      const wrong = (item.diagnosis?.whatWentWrong || []).join(' ');
      return [item.client, insurer, memberIds, note, needed, wrong].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  function renderFilterBar() {
    const filters = [
      ['operator', 'Needs Me', 'Accounts where the billing coordinator must take action right now — red status, blocked, or overdue'],
      ['watch', 'Watching', 'Yellow-status accounts — no immediate action required but need to be monitored closely'],
      ['healthy', 'Healthy', 'Green accounts — claims are progressing normally, nothing blocking'],
      ['all', 'All', 'Show every account regardless of status'],
      ['strong', 'Strong Chance', 'Accounts most likely to be collected — prioritize these when working the backlog'],
      ['insurance', 'Insurance Setup', 'Accounts with insurance configuration problems that are blocking billing entirely'],
      ['missing', 'Missing Insurance', 'Accounts with no insurance on file at all — cannot bill until insurance is added'],
      ['client_match', 'Client Match', 'Accounts where the patient name or DOB in ClientCare does not match the insurance record'],
      ['oldest', 'Oldest', 'All accounts sorted by oldest first — useful for finding claims approaching timely-filing deadlines'],
    ];
    return `
      <div class="filter-bar">
        ${filters.map(([value, label, tip]) => `
          <button class="${accountFilter === value ? '' : 'ghost'}" data-account-filter="${value}" data-tip="${escapeHtml(tip)}">${escapeHtml(label)}</button>
        `).join('')}
      </div>
    `;
  }

  function renderAccountSearchBar() {
    const total = lastAccountReport?.items?.length || 0;
    const visible = getFilteredItems().length;
    return `
      <div class="card">
        <div class="grid two" style="align-items:end;">
          <label class="stack">
            <span class="muted">Find an account</span>
            <input
              id="account-search"
              value="${escapeHtml(lastAccountSearch)}"
              placeholder="Search client, payer, member ID, note, or blocker"
              data-tip="Type any part of the client name, payer, member ID, or blocker. The queue and account board will shrink as you type."
            >
          </label>
          <div class="row-actions" style="justify-content:flex-end;">
            <div class="small muted" style="margin-right:8px;">Showing ${escapeHtml(visible)} of ${escapeHtml(total)} accounts</div>
            <button id="account-search-clear" class="ghost">Clear search</button>
          </div>
        </div>
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
    ` : `
      <div style="text-align:center;padding:20px 0;">
        <p class="muted" style="margin-bottom:12px;">No accounts loaded yet.</p>
        <p class="muted small" style="margin-bottom:16px;">Open <strong style="color:#edf2f7">Tools</strong> below → click <strong style="color:#edf2f7">Full Queue Report</strong> to pull accounts from ClientCare.</p>
        <button class="ghost" onclick="document.querySelector('.tools-card')?.setAttribute('open',''); document.querySelector('.tools-card')?.scrollIntoView({behavior:'smooth'})">Open Tools ↓</button>
      </div>
    `;
  }

  function renderManagedWorkQueue() {
    const items = [...getFilteredItems()];
    const queue = items
      .map((item) => {
        const visual = deriveAccountVisualState(item);
        const todo = buildAccountTodoItems(item)[0] || null;
        return {
          item,
          visual,
          todo,
          stage: deriveAccountStage(item),
        };
      })
      .sort((a, b) => {
        const av = ['red', 'yellow', 'green'].indexOf(a.visual.state);
        const bv = ['red', 'yellow', 'green'].indexOf(b.visual.state);
        if (av !== bv) return av - bv;
        return String(a.item.client || '').localeCompare(String(b.item.client || ''));
      });

    const counts = queue.reduce((acc, entry) => {
      acc[entry.visual.state] = (acc[entry.visual.state] || 0) + 1;
      return acc;
    }, { red: 0, yellow: 0, green: 0 });

    const rows = queue.slice(0, 8).map(({ item, visual, todo, stage }, index) => {
      const execution = buildExecutionSummary(item);
      return `
      <tr>
        <td>
          <strong>${escapeHtml(item.client || 'Unknown client')}</strong>
          <div class="small muted">${escapeHtml(item.accountSummary?.insurers?.[0] || 'Payer not visible')}</div>
        </td>
        <td><span class="badge ${badgeClass(visual.state)}">${escapeHtml(visual.owner)}</span></td>
        <td>${escapeHtml(todo?.label || visual.summary)}</td>
        <td class="small muted">${escapeHtml(execution.systemNext)}</td>
        <td>${escapeHtml(stage.label)}</td>
        <td><button data-work-queue-index="${index}" class="ghost">Open</button></td>
      </tr>
    `;
    }).join('');

    return `
      <details class="card" open>
        <summary data-tip="This is the operator starting point. Red means you need to act. Yellow means the system is monitoring or waiting. Green means no immediate action is needed.">Managed Work Queue</summary>
        <p class="hint" style="margin:10px 0">Start here. The system manages the work and shows where you are needed.</p>
        <div class="grid four" style="margin-bottom:12px;">
          <div class="card stat"><span>Needs me</span><strong>${escapeHtml(counts.red || 0)}</strong></div>
          <div class="card stat"><span>System watching</span><strong>${escapeHtml(counts.yellow || 0)}</strong></div>
          <div class="card stat"><span>Healthy</span><strong>${escapeHtml(counts.green || 0)}</strong></div>
          <div class="card stat"><span>Total active</span><strong>${escapeHtml(queue.length)}</strong></div>
        </div>
        <table>
          <thead><tr><th>Account</th><th>Owner</th><th>Your next step</th><th>System is doing</th><th>Stage</th><th></th></tr></thead>
          <tbody>
            ${rows || '<tr><td colspan="6">No billing accounts loaded yet.</td></tr>'}
          </tbody>
        </table>
      </details>
    `;
  }

  function renderOperatorGuide() {
    return `
      <details class="card" open>
        <summary data-tip="This is the shortest path for a billing coordinator: start in the managed queue, open the red items first, let the system pull data from ClientCare, and only type information when it could not be found or requested automatically.">How to work this page</summary>
        <div class="grid four" style="margin-top:12px; margin-bottom:0;">
          <div class="card stat"><span>1. Start here</span><strong>Managed queue</strong><div class="small muted" style="margin-top:6px;">Red = you act. Yellow = system watches. Green = healthy.</div></div>
          <div class="card stat"><span>2. Open file</span><strong>Review next action</strong><div class="small muted" style="margin-top:6px;">Each account tells you what is wrong and what happens next.</div></div>
          <div class="card stat"><span>3. Let system pull</span><strong>ClientCare first</strong><div class="small muted" style="margin-top:6px;">Use VOB search or refresh from ClientCare before typing anything.</div></div>
          <div class="card stat"><span>4. Escalate gaps</span><strong>Request by text/email</strong><div class="small muted" style="margin-top:6px;">If data is missing, ask the system to request it from the client.</div></div>
        </div>
      </details>
    `;
  }

  function renderSystemStatusSummary() {
    const items = lastAccountReport?.items || [];
    const red = items.filter((item) => deriveAccountVisualState(item).state === 'red').length;
    const yellow = items.filter((item) => deriveAccountVisualState(item).state === 'yellow').length;
    const green = items.filter((item) => deriveAccountVisualState(item).state === 'green').length;
    const setupIssues = items.filter((item) => String(item.diagnosis?.status || '') === 'insurance_setup_issue').length;
    const clientMatch = items.filter((item) => String(item.diagnosis?.status || '') === 'client_match_issue').length;
    return `
      <details class="card" open>
        <summary data-tip="This tells Sherry how the system is doing overall without making her read the raw ledger. It separates work she owns from work the system is already tracking.">System status</summary>
        <div class="grid four" style="margin-top:12px; margin-bottom:0;">
          <div class="card stat"><span>Needs operator</span><strong>${escapeHtml(red)}</strong></div>
          <div class="card stat"><span>System monitoring</span><strong>${escapeHtml(yellow)}</strong></div>
          <div class="card stat"><span>Healthy files</span><strong>${escapeHtml(green)}</strong></div>
          <div class="card stat"><span>Missing/setup blockers</span><strong>${escapeHtml(setupIssues + clientMatch)}</strong></div>
        </div>
        <div class="small muted" style="margin-top:12px;">Goal: keep operator-owned work low, move monitor-only work to the system, and only surface red when Sherry actually needs to act.</div>
      </details>
    `;
  }

  function renderAccountBoard() {
    const container = document.getElementById('account-board');
    const detail = document.getElementById('account-detail');
    if (!container || !detail) return;

    const items = getFilteredItems();
    if (!items.length) {
      const noData = !(lastAccountReport?.items?.length);
      container.innerHTML = `${renderFilterBar()}
        <div style="text-align:center;padding:24px 0;">
          ${noData
            ? `<p class="muted" style="margin-bottom:12px;">No account data loaded yet.</p>
               <p class="muted small" style="margin-bottom:16px;">Open Tools below → <strong style="color:#edf2f7">Full Queue Report</strong> to pull all ClientCare accounts.</p>
               <button class="ghost" onclick="document.querySelector('.tools-card')?.setAttribute('open',''); document.querySelector('.tools-card')?.scrollIntoView({behavior:'smooth'})">Open Tools ↓</button>`
            : `<p class="muted">No accounts match the current filter.</p>
               <p class="muted small" style="margin-top:8px;">Try <strong style="color:#edf2f7">All</strong> to see everything.</p>`
          }
        </div>`;
      detail.innerHTML = '';
      return;
    }

    if (selectedAccountIndex >= items.length) selectedAccountIndex = 0;

    container.innerHTML = renderFilterBar() + items.map((item, index) => {
      const stage = deriveAccountStage(item);
      const visual = deriveAccountVisualState(item);
      const todos = buildAccountTodoItems(item);
      const execution = buildExecutionSummary(item);
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
          <div class="muted small" style="margin-top:6px;">System: ${escapeHtml(execution.systemNext)}</div>
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
    const execution = buildExecutionSummary(item);
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
        <div class="grid two">
          <div class="card">
            <div class="muted">System is doing next</div>
            <strong style="display:block;margin-top:8px;">${escapeHtml(execution.systemNext)}</strong>
            <div class="small muted" style="margin-top:8px;">The portal should keep this moving without asking Sherry to retype data.</div>
          </div>
          <div class="card">
            <div class="muted">You need to do next</div>
            <strong style="display:block;margin-top:8px;">${escapeHtml(execution.youNext)}</strong>
            <div class="small muted" style="margin-top:8px;">Only act here if the file is blocked on judgment, approval, or a missing repair the system could not finish.</div>
          </div>
        </div>
        <div class="row-actions">
          <button type="button" data-account-action="vob" class="ghost">Use this account in VOB</button>
          <button type="button" data-account-action="refresh" class="ghost">Refresh from ClientCare</button>
          <button type="button" data-account-action="request_text" class="ghost">Request missing info by text</button>
          <button type="button" data-account-action="request_email" class="ghost">Request missing info by email</button>
        </div>
        ${renderDataCompletenessCard(item)}
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
          return;
        }
        if (action === 'refresh') {
          item._inspected = false;
          await inspectSelectedAccount();
          toast('Refreshed the selected account from ClientCare.', 'success');
          return;
        }
        if (action === 'request_text') {
          try {
            await sendAssistantPrompt(buildAccountOutreachPrompt(item, 'text message'));
            toast('Queued a client text request from the selected account.', 'success');
          } catch (error) {
            toast(error.message, 'error');
          }
          return;
        }
        if (action === 'request_email') {
          try {
            await sendAssistantPrompt(buildAccountOutreachPrompt(item, 'email'));
            toast('Queued a client email request from the selected account.', 'success');
          } catch (error) {
            toast(error.message, 'error');
          }
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

  function buildVobOutreachPrompt(channel) {
    const selectedAccount = getSelectedAccountItem();
    const missing = [
      !String(lastInsuranceDraft.payer_name || '').trim() && 'payer name',
      !String(lastInsuranceDraft.member_id || '').trim() && 'member ID',
    ].filter(Boolean);
    const subject = vobMode === 'prospect'
      ? (lastProspectDraft.full_name || 'New prospect')
      : (selectedAccount?.client || 'Selected client');
    const contactLine = vobMode === 'prospect'
      ? `Prospect contact: phone=${lastProspectDraft.phone || 'unknown'}, email=${lastProspectDraft.email || 'unknown'}.`
      : `Use the client contact information already on file in ClientCare.`;
    return [
      `Prepare and queue a ${channel} outreach for ${subject}.`,
      `Goal: collect the missing information needed to finish Verification of Benefits.`,
      `Missing information: ${missing.length ? missing.join(', ') : 'none listed; confirm coverage details and summarize the VOB result.'}.`,
      contactLine,
      `Return a concise outreach draft and the next system action after the client replies.`,
    ].join(' ');
  }

  /** Patient-facing copy for SMS/email (not for the assistant). */
  function buildVobClientFacingBody() {
    const missing = [
      !String(lastInsuranceDraft.payer_name || '').trim() && 'insurance company name',
      !String(lastInsuranceDraft.member_id || '').trim() && 'member ID (from front of card)',
    ].filter(Boolean);
    const first = (lastProspectDraft.full_name || 'there').trim().split(/\s+/)[0] || 'there';
    const need = missing.length
      ? `We still need: ${missing.join(', ')}.`
      : 'Please confirm your insurance details or send a photo of your card.';
    const sms = `Hi ${first}, this is ClientCare West billing. ${need} Reply when you can. Thank you!`;
    return sms.length > 300 ? `${sms.slice(0, 297)}...` : sms;
  }

  function buildVobClientFacingEmail() {
    const missing = [
      !String(lastInsuranceDraft.payer_name || '').trim() && 'insurance company name',
      !String(lastInsuranceDraft.member_id || '').trim() && 'member ID (front of card)',
    ].filter(Boolean);
    const name = lastProspectDraft.full_name || 'there';
    const need = missing.length
      ? `We still need the following to finish your verification of benefits: ${missing.join(', ')}.`
      : 'Please confirm your current insurance information or attach a photo of your insurance card.';
    return [
      `Hi ${name},`,
      '',
      need,
      '',
      'Reply to this email with the details or attach a photo of your card.',
      '',
      'Thank you,',
      'ClientCare West — Billing',
    ].join('\n');
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
          <strong>Historical intake rule only</strong>
          <p class="muted" style="margin-top:8px">This is not a live VOB. Use the real ClientCare VOB workflow above for actual eligibility, active coverage, copay, deductible, and benefits.</p>
        </div>
      </div>
    `;
  }

  function renderSavedVobProspects() {
    const items = lastSavedVobProspects || [];
    return `
      <div class="card" style="margin-top:12px;background:#0f1528;">
        <strong>Saved VOB history</strong>
        <div class="small muted" style="margin:6px 0 12px;">Prospects and card-based VOBs stay here until they decide to move forward. Reopen them later or push them into the client-creation queue.</div>
        ${items.length ? `
          <div class="stack">
            ${items.slice(0, 8).map((entry, index) => `
              <div class="card" style="padding:12px;background:#0a1020;">
                <div class="account-card-top">
                  <div>
                    <strong>${escapeHtml(entry.full_name || entry.matched_client_name || 'Saved VOB')}</strong>
                    <div class="small muted">${escapeHtml(entry.payer_name || 'Payer missing')}${entry.member_id ? ` · ${escapeHtml(entry.member_id)}` : ''}</div>
                  </div>
                  <span class="badge ${badgeClass(entry.status === 'ready_to_convert' ? 'warn' : entry.matched_client_name ? 'ok' : 'review')}">${escapeHtml(String(entry.status || 'saved').replace(/_/g, ' '))}</span>
                </div>
                <div class="small muted" style="margin-top:8px;">Decision: ${escapeHtml(entry.preview_result?.decision || 'not run')} · Created ${escapeHtml(String(entry.created_at || '').slice(0, 10) || 'unknown')}</div>
                <div class="row-actions" style="margin-top:10px;">
                  <button type="button" class="ghost" data-vob-history-use="${index}">Use again</button>
                  <button type="button" data-vob-history-promote="${index}">Promote to client file</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="small muted">No saved VOB history yet.</div>'}
      </div>
    `;
  }

  function renderVerificationOfBenefitsCard() {
    if (vobMode === 'existing') ensureInsuranceDraftSeed();
    const selectedAccount = vobMode === 'existing' ? getSelectedAccountItem() : null;
    const selectedLabel = vobMode === 'prospect'
      ? (lastProspectDraft.full_name || 'New prospect VOB')
      : selectedAccount?.client
        ? `${selectedAccount.client}${selectedAccount.accountSummary?.insurers?.[0] ? ` · ${selectedAccount.accountSummary.insurers[0]}` : ''}`
        : 'No account selected';
    const matches = vobMode === 'existing' ? getVobMatches() : [];
    const requiredMissing = [
      !String(lastInsuranceDraft.payer_name || '').trim() && 'payer name',
      !String(lastInsuranceDraft.member_id || '').trim() && 'member ID',
    ].filter(Boolean);

    return `
      <details class="card" id="verification-of-benefits" open>
        <summary data-tip="This is the real ClientCare VOB workflow. Drop the card, let the system identify the client file, then run the live ClientCare eligibility action.">Verification of Benefits (VOB)</summary>
        <p class="hint" style="margin:10px 0">This belongs in the main workflow. The system should pull from ClientCare first, match the right file, then run the real ClientCare VOB.</p>

        <div class="filter-bar" style="margin-bottom:12px;">
          <button id="vob-mode-existing" class="${vobMode === 'existing' ? '' : 'ghost'}" data-tip="Search ClientCare and auto-fill everything the system already knows.">Existing client</button>
          <button id="vob-mode-prospect" class="${vobMode === 'prospect' ? '' : 'ghost'}" data-tip="Use this when someone is not a client yet and wants an insurance estimate before committing.">Prospect / first-time inquiry</button>
        </div>

        ${vobMode === 'existing' ? `
          <div class="stack" style="margin-bottom:12px;">
            <label class="stack">
              <span class="muted">Search existing client</span>
              <input id="vob-client-search" value="${escapeHtml(lastVobSearch)}" placeholder="Start typing a client name, payer, or member ID">
            </label>
            ${matches.length ? `
              <div class="stack vob-match-list">
                ${matches.map((item, index) => `
                  <button type="button" class="ghost vob-match-option" data-vob-match-index="${index}" style="text-align:left;">
                    <strong>${escapeHtml(item.client || 'Unknown client')}</strong>
                    <div class="small muted">${escapeHtml(item.accountSummary?.insurers?.[0] || 'Payer not visible')}${item.insurancePreview?.[0]?.memberId ? ` · ${escapeHtml(item.insurancePreview[0].memberId)}` : ''}</div>
                  </button>
                `).join('')}
              </div>
            ` : (lastVobSearch.trim() ? '<div class="muted small">No ClientCare match yet. Switch to prospect mode if this is a new inquiry.</div>' : '<div class="muted small">Start typing and the system will narrow the client list automatically.</div>')}
          </div>
        ` : `
          <div class="grid two" style="margin-bottom:12px;">
            <label class="stack"><span class="muted">Prospect full name</span><input id="vob-prospect-name" value="${escapeHtml(lastProspectDraft.full_name || '')}" placeholder="Client name"></label>
            <label class="stack"><span class="muted">Prospect phone</span><input id="vob-prospect-phone" value="${escapeHtml(lastProspectDraft.phone || '')}" placeholder="Phone number"></label>
            <label class="stack"><span class="muted">Prospect email</span><input id="vob-prospect-email" value="${escapeHtml(lastProspectDraft.email || '')}" placeholder="Email"></label>
          </div>
        `}

        <div class="grid four" style="margin-bottom:12px">
          <div class="card stat" data-tip="The person or account this VOB is tied to. Existing clients should come from ClientCare. Prospects stay lightweight until they commit."><span>${vobMode === 'prospect' ? 'Prospect' : 'Selected account'}</span><strong>${escapeHtml(selectedLabel)}</strong></div>
          <div class="card stat" data-tip="Insurance company name — from ClientCare if available, otherwise from the insurance card or caller."><span>Payer</span><strong>${escapeHtml(lastInsuranceDraft.payer_name || 'Missing')}</strong></div>
          <div class="card stat" data-tip="Member/subscriber ID — from ClientCare first, otherwise from the insurance card."><span>Member ID</span><strong>${escapeHtml(lastInsuranceDraft.member_id || 'Missing')}</strong></div>
          <div class="card stat" data-tip="The only workflow that matters here is the real ClientCare VOB. Once the right client is selected, run the live ClientCare flow below."><span>Live VOB</span><strong style="color:${getSelectedClientBillingHref() ? '#7ef0b8' : '#ffd666'}">${escapeHtml(getSelectedClientBillingHref() ? 'Ready to run' : 'Needs client file')}</strong></div>
        </div>

        ${renderVobCardAccountMismatchBanner()}

        <div class="card" style="margin-bottom:12px;background:#0f1528;">
          <strong>System-managed status</strong>
          <div class="small muted" style="margin-top:6px;">${requiredMissing.length ? `The system still needs ${requiredMissing.join(', ')} before it can run the real ClientCare VOB.` : 'ClientCare provided enough information to run the real ClientCare VOB.'}</div>
          <div class="row-actions" style="margin-top:10px;">
            ${vobMode === 'existing' ? '<button id="use-selected-account-vob" class="ghost">Refresh from ClientCare</button>' : ''}
            <button id="vob-request-text" class="ghost" data-tip="Ask the system assistant to draft and queue a client text asking for the missing insurance information.">Request by text</button>
            <button id="vob-request-email" class="ghost" data-tip="Ask the system assistant to draft and queue an email asking for the missing insurance information.">Request by email</button>
          </div>
        </div>

        <div style="background:#0a1020;border:1px solid #27304a;border-radius:12px;padding:14px;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:#8aa4ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Real ClientCare VOB — card and client match</div>
          <div id="vob-inline-dropzone" data-tip="Drop front and back of the insurance card — all files are merged into one OCR pass. Fills payer, member ID &amp; group automatically."
            style="${getVobCardZoneStyle()}">
            <div style="font-size:13px;font-weight:600;color:#c5d4f0;margin-bottom:3px;" data-zone-label>${escapeHtml(getVobCardZoneLabel())}</div>
            <div style="font-size:11px;color:#98a5c3;">Front + back at the same time — photos, HEIC, TIFF, PDF, JPG, PNG, WEBP</div>
            <input id="vob-inline-file" type="file" multiple accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif" style="display:none;">
          </div>
          <div id="vob-inline-status" style="min-height:18px;font-size:12px;line-height:1.5;margin-bottom:10px;">${renderVobCardStatus()}</div>
          ${vobMode === 'prospect' ? `
          <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #27304a;">
            <div class="row-actions" style="flex-wrap:wrap;gap:8px;">
              <button type="button" id="vob-card-upload">${hasReadableCardDraft() ? 'Save card to history' : 'Read card + save prospect'}</button>
              <button type="button" id="vob-save-prospect" class="ghost">Save prospect VOB</button>
            </div>
          </div>
          ` : ''}
          <div class="grid two">
            <div data-tip="Insurance company name — exactly as it appears on the patient's card (e.g. 'Aetna', 'Blue Cross Blue Shield', 'United Healthcare')">
              <label style="font-size:11px;color:#98a5c3;display:block;margin-bottom:4px;">Payer name <span style="color:#ef476f">*</span></label>
              <input id="insurance-payer-name" value="${escapeHtml(lastInsuranceDraft.payer_name || '')}" placeholder="e.g. Aetna, Blue Cross, United" style="width:100%;box-sizing:border-box;">
            </div>
            <div data-tip="The member or subscriber ID — printed on the front of the patient's insurance card, usually labeled 'Member ID' or 'ID#'">
              <label style="font-size:11px;color:#98a5c3;display:block;margin-bottom:4px;">Member ID <span style="color:#ef476f">*</span></label>
              <input id="insurance-member-id" value="${escapeHtml(lastInsuranceDraft.member_id || '')}" placeholder="From front of insurance card" style="width:100%;box-sizing:border-box;">
            </div>
            <div data-tip="Blue Shield / Blue Cross = in-network (contracted). All other payers default to out of network. Change only if you have a specific contract with this payer.">
              <label style="font-size:11px;color:#98a5c3;display:block;margin-bottom:4px;">Network status</label>
              <select id="insurance-in-network" style="width:100%;box-sizing:border-box;">
                <option value="false" ${String(lastInsuranceDraft.in_network) !== 'true' ? 'selected' : ''}>Out of network (default)</option>
                <option value="true" ${String(lastInsuranceDraft.in_network) === 'true' ? 'selected' : ''}>In network — Blue Shield / Blue Cross</option>
              </select>
            </div>
          </div>
          ${renderClientcareReconcilePanel({ inline: true })}
        </div>
        ${renderSavedVobProspects()}
      </details>
    `;
  }

  function getSelectedClientBillingHref() {
    const item = getSelectedAccountItem();
    return String(item?.raw?.billingHref || item?.billingHref || lastVobClientHref || '').trim();
  }

  function buildClientcarePipelineResultHtml(data, { dryRun = false } = {}) {
    const rows = [];
    if (data.client_label_guess) rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;">Client</td><td style="padding:4px 0;"><strong>${escapeHtml(data.client_label_guess)}</strong></td></tr>`);

    const ex = data.card_extracted || {};
    if (ex.payer_name || ex.member_id) {
      rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;">Card read</td><td style="padding:4px 0;">${escapeHtml([ex.payer_name, ex.member_id ? `ID ${ex.member_id}` : '', ex.group_number ? `Grp ${ex.group_number}` : '', ex.subscriber_name].filter(Boolean).join(' · '))}</td></tr>`);
    }

    const filled = Object.keys(data.card_fill_proposed || {}).filter((k) => k !== 'insurance_match_hints' && k !== 'insurance_slot');
    rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;">Fields written</td><td style="padding:4px 0;">${
      filled.length
        ? `<span style="color:#7ef0b8;">${escapeHtml(filled.join(', '))}</span>`
        : '<span style="color:#98a5c3;">Nothing new needed in ClientCare</span>'
    }</td></tr>`);

    const vob = data.vob_flow || {};
    const vobStatus = vob.vob_received
      ? '<span style="color:#7ef0b8;">Live VOB response received</span>'
      : '<span style="color:#f0b429;">VOB click completed but no response was automatically confirmed</span>';
    rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;">VOB status</td><td style="padding:4px 0;">${vobStatus}${vob.vob_retry_rounds > 1 ? ` (${escapeHtml(String(vob.vob_retry_rounds))} attempts)` : ''}</td></tr>`);

    const vobFilled = Object.keys(data.vob_fill_proposed || {}).filter((k) => k !== 'insurance_match_hints' && k !== 'insurance_slot');
    if (vobFilled.length) {
      rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;">Benefits synced back</td><td style="padding:4px 0;"><span style="color:#7ef0b8;">${escapeHtml(vobFilled.join(', '))}</span></td></tr>`);
    }

    const vobExtracted = data.vob_extracted || {};
    const benefitBits = [];
    if (vobExtracted.coverage_active != null) benefitBits.push(`Coverage ${vobExtracted.coverage_active ? 'active' : 'inactive'}`);
    if (vobExtracted.copay) benefitBits.push(`Copay ${vobExtracted.copay}`);
    if (vobExtracted.deductible_remaining) benefitBits.push(`Deductible ${vobExtracted.deductible_remaining}`);
    if (vobExtracted.coinsurance) benefitBits.push(`Coinsurance ${vobExtracted.coinsurance}`);
    if (benefitBits.length) {
      rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;">Benefits found</td><td style="padding:4px 0;">${escapeHtml(benefitBits.join(' · '))}</td></tr>`);
    }

    const np = data.note_posted;
    let noteRow = '';
    if (dryRun) {
      noteRow = '<span style="color:#98a5c3;">Dry run only — note not posted</span>';
    } else if (np?.ok) {
      noteRow = '<span style="color:#7ef0b8;">Billing note posted to ClientCare</span>';
    } else {
      const noteText = data.clientcare_note_suggestion || '';
      const escaped = escapeHtml(noteText);
      noteRow = `<span style="color:#f0b429;">Auto-post failed (${escapeHtml(np?.reason || 'unknown')})</span>${noteText ? `<pre style="margin:8px 0 4px;font-size:11px;max-height:160px;overflow:auto;">${escaped}</pre><button type="button" onclick="navigator.clipboard.writeText(${JSON.stringify(noteText)}).then(()=>this.textContent='Copied!').catch(()=>{})" style="background:#27304a;border:none;border-radius:8px;padding:6px 12px;color:#edf2f7;cursor:pointer;font-size:12px;">Copy note</button>` : ''}`;
    }
    rows.push(`<tr><td style="color:#98a5c3;padding:4px 8px 4px 0;vertical-align:top;">Billing note</td><td style="padding:4px 0;">${noteRow}</td></tr>`);

    const dryBadge = dryRun ? '<span style="background:#4a3a12;color:#ffd666;padding:2px 8px;border-radius:6px;font-size:11px;margin-left:8px;">DRY RUN</span>' : '';
    return `
      <div style="margin-bottom:8px;font-weight:700;color:#edf2f7;">Real ClientCare VOB complete${dryBadge}</div>
      <table style="font-size:13px;width:100%;border-collapse:collapse;">${rows.join('')}</table>
      <details style="margin-top:12px;"><summary style="cursor:pointer;color:#98a5c3;font-size:12px;">Full JSON</summary><pre style="margin-top:8px;font-size:11px;">${escapeHtml(JSON.stringify(data, null, 2))}</pre></details>
    `;
  }

  function renderClientcarePipelineOutput() {
    if (lastClientcarePipelineState === 'running') {
      return lastClientcarePipelineDryRun
        ? '<span style="color:#8aa4ff;">Running real ClientCare VOB (dry run — no writes)…</span>'
        : '<span style="color:#8aa4ff;">Running real ClientCare VOB — card → ClientCare fields → VOB → sync → billing note…</span>';
    }
    if (lastClientcarePipelineState === 'done' && lastClientcarePipelineResult) {
      return buildClientcarePipelineResultHtml(lastClientcarePipelineResult, { dryRun: lastClientcarePipelineDryRun });
    }
    if (lastClientcarePipelineState === 'error' && lastClientcarePipelineError) {
      return `<span style="color:#ff9db0;">${escapeHtml(lastClientcarePipelineError)}</span>`;
    }
    return 'Select or auto-match the client, attach the card images for that same patient, then run the real ClientCare VOB.';
  }

  function renderClientcareReconcilePanel({ inline = false } = {}) {
    const href = getSelectedClientBillingHref();
    return `
      <div class="${inline ? '' : 'card'}" style="${inline ? 'margin-top:14px;padding-top:14px;border-top:1px solid #27304a;' : 'margin-top:14px;background:#0c1a30;border-color:#26c281;'}">
        <h3 style="margin:0 0 8px;font-size:15px;color:#7ef0b8;">Real ClientCare VOB</h3>
        <p class="small muted" style="margin:0 0 12px;">This is the real path. It logs into ClientCare, writes the card data into the billing file, clicks ClientCare&rsquo;s own VOB/eligibility action, then reads back the live result.</p>
        <div class="stack">
          <label class="stack"><span class="muted small">Billing page URL</span>
            <input id="reconcile-client-href" value="${escapeHtml(href)}" placeholder="Select a client on the board or paste /Pregnancy/Billing/..."></label>
          <label class="stack"><span class="muted small">Coverage slot (0 = primary)</span>
            <input id="reconcile-insurance-slot" type="number" min="0" step="1" value="0" style="width:120px;"></label>
          <div class="row-actions" style="align-items:center;flex-wrap:wrap;gap:10px;">
            <span class="muted small">Insurance card images for this one patient only — front, back, and extra pages are all allowed. The system reuses whatever is already attached in the VOB panel or you can add more files here.</span>
            <input id="reconcile-card-file" type="file" multiple accept="image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif">
          </div>
          <label class="row-actions" style="gap:8px;align-items:center;">
            <input type="checkbox" id="reconcile-dry-run-only">
            <span class="small muted">Dry run only (preview; no writes)</span>
          </label>
          <div class="row-actions">
            <button type="button" id="clientcare-pipeline-run">Run real ClientCare VOB</button>
          </div>
          <div id="reconcile-output" class="small muted" style="max-height:320px;overflow:auto;margin:0;padding:10px;background:#0f1528;border-radius:10px;border:1px solid #27304a;">${renderClientcarePipelineOutput()}</div>
          <details style="margin-top:6px;">
            <summary style="cursor:pointer;font-size:12px;color:#8aa4ff;">Advanced repair tools</summary>
            <div class="stack" style="margin-top:10px;">
              <label class="stack"><span class="muted small">Extra notes</span>
                <textarea id="reconcile-supplemental-notes" rows="3" placeholder="Only if you need to merge text without running the full pipeline"></textarea></label>
              <div class="row-actions">
                <button type="button" id="reconcile-preview" class="ghost">Preview reconcile</button>
                <button type="button" id="reconcile-apply" class="ghost">Apply reconcile</button>
              </div>
            </div>
          </details>
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
    const isFormData = options?.body instanceof FormData;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(!isFormData ? { 'content-type': 'application/json' } : {}),
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

      const endpointNames = ['dashboard','readiness','template','claims','actions','reconciliation','intelligence','payerPlaybooks','payerRules','eraInsights','patientArPolicy','patientArEscalation','opsOverview','underpayments','appeals','packagingOverview','packagingValidationHistory','vobHistory'];
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
        api('/api/v1/clientcare-billing/insurance/prospects?limit=25'),
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
      const vobHistory = val(17, null);

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
      lastSavedVobProspects = vobHistory?.items || [];
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
    if (!csv.trim()) return toast('Paste CSV first.', "error");
    try {
      await api('/api/v1/clientcare-billing/claims/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv, source: 'overlay_csv_import' }),
      });
      toast('CSV imported.', "success");
      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function importPaymentHistoryCsv() {
    const csv = document.getElementById('payment-history-input')?.value || '';
    if (!csv.trim()) return toast('Paste payment history / ERA CSV first.', "error");
    try {
      const result = await api('/api/v1/clientcare-billing/history/import-csv', {
        method: 'POST',
        body: JSON.stringify({ csv, source: 'overlay_payment_history_import' }),
      });
      toast(`Imported ${result.imported || 0} payment-history rows.`, "success");
      await loadDashboard({}, { skipAutoFullQueue: true });
    } catch (error) {
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
    }
  }

  async function importSnapshot() {
    const text = document.getElementById('snapshot-input').value;
    if (!text.trim()) return toast('Paste snapshot text or HTML first.', "error");
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
      if (!preview.parsed) return toast('No rows parsed from snapshot.', "warn");
      await api('/api/v1/clientcare-billing/snapshots/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast(`Imported ${preview.parsed} rows from snapshot.`, "success");
      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function browserLoginTest() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/login-test', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setBrowserOutput(result);
      toast('Browser login test completed.', "success");
    } catch (error) {
      toast(error.message, "error");
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
      toast('Browser discovery completed.', "success");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function browserOverview() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/billing-overview?page_timeout_ms=12000');
      setBrowserOutput(result);
      toast('Billing overview loaded.', "info");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function browserScanBillingNotes() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/scan-billing-notes?page_timeout_ms=12000');
      setBrowserOutput(result);
      toast('Billing notes scan completed.', "success");
    } catch (error) {
      toast(error.message, "error");
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
      toast(`Scanned ${result.totalScanned || 0} client billing accounts.`, "success");
    } catch (error) {
      toast(error.message, "error");
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
      toast(`Loaded ${result.items?.length || 0} account rescue rows.`, "success");
    } catch (error) {
      toast(error.message, "error");
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
      if (!silent) toast(`Loaded ${result.accounts?.length || 0} accounts from the full billing queue.`, "success");
    } catch (error) {
      if (!silent) toast(error.message, "error");
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
      if (!silent) toast(`Loaded ${result.accounts?.length || 0} backlog accounts.`, "success");
    } catch (error) {
      if (!silent) toast(error.message, "error");
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
    const collapseLabel = assistantOpen ? 'Collapse' : 'Open';
    return `
      <div class="card assistant-card">
        <div class="account-card-top">
          <div>
            <h2 data-tip="This routes billing questions into the system AI Council after the built-in billing workflows check whether the request already has a direct answer. Ask in plain English: 'which accounts need auth before I can submit?', 'what should I work first today?', 'explain this denial reason'.">Operations Assistant / AI Council</h2>
            <p class="muted">Ask questions about accounts, denials, next actions, or system changes in plain English.</p>
          </div>
          <div class="row-actions">
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
    `;
  }

  async function sendAssistantPrompt(message) {
    const content = String(message || '').trim();
    if (!content) return;
    if (!assistantSessionId) await ensureAssistantSession();
    await api('/api/v1/clientcare-billing/assistant/message', {
      method: 'POST',
      body: JSON.stringify({
        session_id: assistantSessionId,
        message: content,
      }),
    });
    await ensureAssistantSession();
  }

  async function sendAssistantMessage() {
    const input = document.getElementById('assistant-input');
    const message = String(input?.value || '').trim();
    if (!message) return;
    input.value = '';
    try {
      await sendAssistantPrompt(message);
    } catch (error) {
      toast(error.message, "error");
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
      if (!silent) toast(error.message, "error");
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
      toast(error.message, "error");
    }
  }

  async function saveTenantOnboarding() {
    if (!selectedTenantId) {
      toast('Save a tenant first.', "error");
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
      toast(error.message, "error");
    }
  }

  async function saveOperatorAccess() {
    if (!selectedTenantId) {
      toast('Save a tenant first.', "error");
      return;
    }
    const operatorEmail = String(document.getElementById('operator-email')?.value || '').trim();
    if (!operatorEmail) {
      toast('Operator email required.', "error");
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
      toast(error.message, "error");
    }
  }

  async function savePayerRuleOverride() {
    const payerName = String(document.getElementById('payer-rule-name')?.value || '').trim();
    if (!payerName) {
      toast('Payer name required.', "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(importIntoQueue ? 'Browser extraction and import completed.' : 'Browser extraction preview completed.', "success");
      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function reclassify(id) {
    try {
      await api(`/api/v1/clientcare-billing/claims/${id}/reclassify`, { method: 'POST', body: JSON.stringify({ actor: 'overlay' }) });
      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function completeAction(id) {
    try {
      await api(`/api/v1/clientcare-billing/actions/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) });
      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function saveProspectVob() {
    try {
      const draft = syncInsuranceDraftFromDom();
      const result = await api('/api/v1/clientcare-billing/insurance/prospects', {
        method: 'POST',
        body: JSON.stringify({
          full_name: lastProspectDraft.full_name || '',
          phone: lastProspectDraft.phone || '',
          email: lastProspectDraft.email || '',
          payer_name: draft.payer_name || '',
          member_id: draft.member_id || '',
          group_number: draft.group_number || '',
          subscriber_name: draft.subscriber_name || '',
          support_phone: '',
          billed_amount: Number(draft.billed_amount || 0) || null,
          coverage_active: draft.coverage_active === 'true' ? true : draft.coverage_active === 'false' ? false : null,
          in_network: draft.in_network === 'true' ? true : draft.in_network === 'false' ? false : null,
          auth_required: draft.auth_required === 'true' ? true : draft.auth_required === 'false' ? false : null,
          requested_by: 'overlay',
        }),
      });
      lastInsurancePreview = result.preview || lastInsurancePreview;
      if (result.saved) {
        lastSavedVobProspects = [result.saved, ...lastSavedVobProspects.filter((entry) => entry.id !== result.saved.id)];
        toast('Saved this prospect VOB to history.', 'success');
      } else {
        toast('VOB preview ran but was not saved—check that the database migration for VOB history is applied on the server.', 'error');
      }
      rerender();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function uploadInsuranceCard() {
    try {
      const files = getVobCardFilesForUpload();
      if (!files.length) {
        if (hasReadableCardDraft()) {
          await saveProspectVob();
          return;
        }
        throw new Error('Attach an insurance card image in the VOB panel first.');
      }
      const form = new FormData();
      files.forEach((f) => form.append('card', f));
      form.append('full_name', lastProspectDraft.full_name || '');
      form.append('phone', lastProspectDraft.phone || '');
      form.append('email', lastProspectDraft.email || '');
      form.append('billed_amount', String(lastInsuranceDraft.billed_amount || ''));
      form.append('requested_by', 'overlay');
      const result = await api('/api/v1/clientcare-billing/insurance/card-intake', {
        method: 'POST',
        body: form,
      });
        if (result.extracted) {
          const newPayer = result.extracted.payer_name || lastInsuranceDraft.payer_name;
          lastInsuranceDraft = {
            ...lastInsuranceDraft,
            payer_name: newPayer,
            member_id: result.extracted.member_id || lastInsuranceDraft.member_id,
            group_number: result.extracted.group_number || lastInsuranceDraft.group_number,
            subscriber_name: result.extracted.subscriber_name || lastInsuranceDraft.subscriber_name,
            in_network: inferNetworkStatus(newPayer),
            coverage_active: '',
            auth_required: '',
            source_label: lastProspectDraft.full_name || '',
          };
        }
      lastInsurancePreview = result.preview || null;
      if (result.saved) {
        lastSavedVobProspects = [result.saved, ...lastSavedVobProspects.filter((entry) => entry.id !== result.saved.id)];
      }
      if (result.matched_client?.patient_name) {
        toast(
          `Matched existing client: ${result.matched_client.patient_name}${result.saved ? '' : ' — VOB not saved; check DB migration clientcare_vob_prospects.'}`,
          result.saved ? 'success' : 'warn',
        );
      } else if (result.saved) {
        toast('Insurance card read and saved to VOB history.', 'success');
      } else if (result.extracted && Object.keys(result.extracted).length) {
        toast('Card read completed, but VOB was not saved to history—check server migration clientcare_vob_prospects.', 'warn');
      }
      rerender();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function executeSystemOutreach({ channel, recipientName, recipientPhone = '', recipientEmail = '', subject = '', body, sourceRef }) {
    const result = await api('/api/v1/clientcare-billing/ops/outreach-request', {
      method: 'POST',
      body: JSON.stringify({
        channel,
        recipient_name: recipientName || '',
        recipient_phone: recipientPhone || '',
        recipient_email: recipientEmail || '',
        subject: subject || '',
        body,
        source_ref: sourceRef || 'clientcare_vob',
        requested_by: 'overlay',
      }),
    });
    return result;
  }

  async function runFullClientcarePipeline() {
    const out = document.getElementById('reconcile-output');
    const href = (document.getElementById('reconcile-client-href')?.value || '').trim() || getSelectedClientBillingHref();
    if (!href) {
      toast('Select a client on the board or paste the ClientCare billing URL.', 'error');
      return;
    }
    const dryRun = Boolean(document.getElementById('reconcile-dry-run-only')?.checked);
    const form = new FormData();
    form.append('client_href', href);
    form.append('insurance_slot', String(Number(document.getElementById('reconcile-insurance-slot')?.value || 0) || 0));
    form.append('apply', dryRun ? 'false' : 'true');
    form.append('requested_by', 'overlay');
    const files = getReconcileCardFiles();
    files.forEach((file) => form.append('card', file));
    const notesExtra = (document.getElementById('reconcile-supplemental-notes')?.value || '').trim();
    if (notesExtra) form.append('supplemental_notes', notesExtra);
    try {
      lastClientcarePipelineState = 'running';
      lastClientcarePipelineResult = null;
      lastClientcarePipelineError = '';
      lastClientcarePipelineDryRun = dryRun;
      if (out) out.innerHTML = renderClientcarePipelineOutput();
      const data = await api('/api/v1/clientcare-billing/insurance/clientcare-pipeline', { method: 'POST', body: form });
      lastClientcarePipelineState = 'done';
      lastClientcarePipelineResult = data;
      lastClientcarePipelineError = '';
      if (out) out.innerHTML = renderClientcarePipelineOutput();

      const rounds = data?.vob_retry_config?.rounds;
      const vobNote = !dryRun && Number.isFinite(Number(rounds)) && rounds > 1
        ? ` (VOB ran up to ${rounds} sessions)`
        : '';
      const np = data.note_posted;
      toast(dryRun ? 'Dry run complete.' : `Real ClientCare VOB finished${vobNote} — fields filled, VOB run, note ${np?.ok ? 'posted' : 'needs manual copy'}.`, dryRun ? 'info' : 'success');
      await loadDashboard({}, { skipAutoFullQueue: true });
    } catch (error) {
      lastClientcarePipelineState = 'error';
      lastClientcarePipelineResult = null;
      lastClientcarePipelineError = error.message;
      if (out) out.innerHTML = renderClientcarePipelineOutput();
      toast(error.message, 'error');
    }
  }

  async function runClientcareReconcile(apply) {
    const out = document.getElementById('reconcile-output');
    const href = (document.getElementById('reconcile-client-href')?.value || '').trim() || getSelectedClientBillingHref();
    if (!href) {
      toast('Paste the ClientCare billing URL or select an account from the queue.', 'error');
      return;
    }
    const form = new FormData();
    form.append('client_href', href);
    form.append('supplemental_notes', document.getElementById('reconcile-supplemental-notes')?.value || '');
    form.append('insurance_slot', String(Number(document.getElementById('reconcile-insurance-slot')?.value || 0) || 0));
    form.append('apply', apply ? 'true' : 'false');
    form.append('requested_by', 'overlay');
    const files = getReconcileCardFiles();
    files.forEach((file) => form.append('card', file));
    try {
      if (out) out.textContent = apply ? 'Writing to ClientCare (browser repair)…' : 'Inspecting ClientCare and merging card/notes…';
      const data = await api('/api/v1/clientcare-billing/insurance/reconcile-clientcare', { method: 'POST', body: form });
      if (out) out.textContent = JSON.stringify(data, null, 2);
      toast(apply ? 'Apply finished — check JSON for save operations.' : 'Reconcile preview ready below.', apply ? 'success' : 'info');
      await loadDashboard({}, { skipAutoFullQueue: true });
    } catch (error) {
      if (out) out.textContent = error.message;
      toast(error.message, 'error');
    }
  }

  async function promoteSavedVobHistory(index) {
    const entry = (lastSavedVobProspects || [])[Number(index)];
    if (!entry?.id) return;
    try {
      const result = await api(`/api/v1/clientcare-billing/insurance/prospects/${encodeURIComponent(entry.id)}/promote`, {
        method: 'POST',
        body: JSON.stringify({ requested_by: 'overlay' }),
      });
      if (result.saved) {
        lastSavedVobProspects = lastSavedVobProspects.map((item) => item.id === result.saved.id ? result.saved : item);
      }
      toast('Queued this saved VOB for client-file creation.', 'success');
      rerender();
    } catch (error) {
      toast(error.message, 'error');
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
      toast(lines.join('\n', "info"));
      await browserBacklogSummary({ silent: true });
    } catch (error) {
      toast(error.message, "error");
    }
  }

  async function runAccountRepair(apply) {
    const item = getFilteredItems()?.[selectedAccountIndex];
    const billingHref = item?.billingHref || item?.raw?.billingHref || '';
    if (!billingHref) {
      toast('No billing account selected.', "error");
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
      toast('Choose at least one repair field before previewing or applying.', "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(`Queued ${actionType === 'appeal_packet' ? 'appeal packet prep' : 'appeal follow-up'} for claim ${id}.`, "success");
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
      toast(error.message, "error");
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
        toast(result.reason || 'This claim does not need an underpayment action.', "info");
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
      toast(error.message, "error");
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
      ${renderSetupStrip()}
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

      <div class="workspace with-utilities ${utilitySidebarDockedBottom ? 'utilities-bottom' : ''}">
        <div class="main-workspace">
          ${renderOperatorGuide()}
          ${renderSystemStatusSummary()}
          ${renderAccountSearchBar()}
          ${renderVerificationOfBenefitsCard()}
          ${renderManagedWorkQueue()}

          <div class="grid two">
            <details class="card" open>
              <summary data-tip="Your highest-priority accounts right now — ranked by dollar value and urgency. Work top to bottom.">Today's Focus</summary>
              <p class="hint" style="margin:10px 0">Start here. Highest-value accounts first.</p>
              ${renderTodaysFocus()}
            </details>
            <details class="card" open>
              <summary data-tip="Instead of opening accounts one by one, these workflows let you fix the same type of problem across many accounts at once — much faster.">Batch Workflows</summary>
              <p class="hint" style="margin:10px 0">Work the backlog by blocker instead of one account at a time.</p>
              <div id="workflow-playbooks">${renderWorkflowPlaybooks(lastAccountReport?.summary || {})}</div>
            </details>
          </div>

          <div class="grid two">
            <details class="card" open>
              <summary data-tip="All accounts with open billing issues pulled from ClientCare. Color ring = urgency (red = critical, yellow = needs attention, green = on track). Hover an account for a quick summary, click to open the full recovery detail.">Accounts Needing Action</summary>
              <p class="hint" style="margin:10px 0">Hover for a summary. Click for full detail.</p>
              <div id="account-board" class="account-board"><p class="muted">Loading live billing accounts…</p></div>
            </details>
            <details class="card" open>
              <summary data-tip="Full breakdown for the account you clicked — what is blocking the claim, what the system recommends doing next, and any repair options.">Account Recovery Detail</summary>
              <div id="account-detail"><p class="muted">Click an account card to inspect the live billing status, blocker, and next actions.</p></div>
            </details>
          </div>

          <details class="card">
            <summary data-tip="Secondary rollout controls. Keep this collapsed during daily billing work and open it when you need packaging, go-live validation, or trend review.">Rollout, Packaging &amp; Trends ▸</summary>
            <div class="stack" style="margin-top:16px;">
              <div class="card">
                <h2 data-tip="Everything needed to hand this billing system to a new tenant — credentials, onboarding steps, operator access, and audit trail. Run this checklist before going live with a new practice.">Sellable Packaging</h2>
                <p class="hint" style="margin:10px 0">Tenant setup, onboarding, operator access, and audit trail.</p>
                <div id="packaging-overview">${renderPackagingOverview(packagingOverview)}</div>
              </div>

              <div class="card">
                <h2 data-tip="Run this before going live with a new practice. It checks browser login, claim history, operator access, and audit logs to confirm everything is working. Fails loudly if something is missing.">Live Rollout Validation</h2>
                <p class="hint" style="margin:10px 0">Cross-check actual browser readiness, claim history, operator access, and audit receipts before go-live.</p>
                <div class="row-actions" style="margin-bottom:10px"><button id="packaging-validate">Run validation</button></div>
                <div id="packaging-validation">${renderPackagingValidation(packagingValidation)}</div>
              </div>

              <div class="card">
                <h2 data-tip="Tracks validation run history — shows which blockers keep appearing and whether readiness is improving over time. Useful for catching systemic setup problems.">Validation Trends</h2>
                <p class="hint" style="margin:10px 0">See repeated rollout blockers and whether readiness is improving across runs.</p>
                <div id="packaging-validation-history">${renderPackagingValidationHistory(packagingValidationHistory)}</div>
              </div>
            </div>
          </details>

          <details class="card tools-card">
            <summary data-tip="Expand to access browser automation, data imports, validation, payer rules, underpayments, and appeals queues. Start with Browser automation → Full Queue Report to populate the dashboard.">Tools &amp; Data Sources ▸</summary>
            <div class="stack" style="margin-top:16px;">
              <div class="grid two">
                <div class="card">
                  <h2 data-tip="Checks whether the server has credentials to log into ClientCare via browser automation. All checks must pass before the extraction buttons will work.">Browser fallback readiness</h2>
                  <p style="margin:10px 0"><span class="badge ${badgeClass(readiness.ready ? 'ready' : 'warn')}">${readiness.ready ? 'ready' : 'not ready'}</span></p>
                  ${renderReadiness(readiness)}
                </div>
                <div class="card">
                  <h2 data-tip="Headless browser tools that log into ClientCare on your behalf and extract billing data. Requires CC_USER and CC_PASS to be set in Railway env vars. Start with Login Test to verify credentials, then Full Queue Report to populate the dashboard.">Browser automation</h2>
                  <p class="hint" style="margin:10px 0">Start with Login Test, then Full Queue Report to populate the dashboard.</p>
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
                  <h2 data-tip="Manually import claims data when browser automation is not available. Export a CSV from ClientCare Reports, paste it below, and click Import CSV. ERA/remittance data can also be imported to improve the collections forecast.">Imports</h2>
                  <p class="hint" style="margin:10px 0">Paste a CSV from ClientCare exports — or copy a table directly as a fallback.</p>
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
                  <h2 data-tip="Raw output from the last browser automation run — shows exactly what was extracted or what went wrong. Useful for debugging when a run produces unexpected results.">Browser Output</h2>
                  <div id="browser-output"><p class="muted small">No browser run yet — click any automation button to see output here.</p></div>
                </div>
              </div>
            </div>
          </details>

          <details class="card">
            <summary data-tip="Advanced billing analysis and long-form claim lists. Keep this closed during day-to-day work; open it when you need forecasting, reconciliation, denials, underpayments, or payer strategy detail.">Claims, Forecasting &amp; Analysis ▸</summary>
            <div class="grid two" style="margin-top:16px;">
              <div class="card">
                <h2 data-tip="Predicted cash inflow from insurance over the next 30, 60, and 90 days — based on claim status and historical payer payment patterns. More accurate the more paid claims you import.">Collections Forecast</h2>
                <p class="hint" style="margin:10px 0">Projection improves as paid claims, ERAs, and remits are imported.</p>
                <div id="reimbursement-intelligence">${renderReimbursementIntelligence(intelligence)}</div>
                <hr style="border-color:#27304a; margin:16px 0;">
                <h3>Patient AR</h3>
                <div id="patient-ar-summary">${renderPatientArSummary(opsOverview, patientArPolicy, patientArEscalation)}</div>
              </div>
              <div class="card">
                <h2 data-tip="All claims imported into the system — classified by rescue bucket (submit now, correct and resubmit, appeal, write off) with priority scores. Import claims via CSV or browser extraction above.">Claims Ledger</h2>
                <div class="stack">
                  <div class="card">
                    <h3 data-tip="The current rule the system uses to decide whether to accept a new insurance patient — based on payer history, auth requirements, and collection rates">Insurance Intake Rule</h3>
                    <div id="insurance-intake-rule">${renderInsuranceIntakeRule(opsOverview)}</div>
                  </div>
                  <div class="card">
                    <h3 data-tip="Matches what was submitted vs what was paid vs what is still outstanding — shows where money is leaking">Reconciliation</h3>
                    ${renderReconciliation(reconciliation)}
                  </div>
                  <details class="card">
                    <summary>Claims &amp; Open Actions ▸</summary>
                    <div class="stack" style="margin-top:12px;">
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
                        <h3 data-tip="Click any row in the Claims table above to see the detailed filing plan — which rescue bucket it is in, what action to take, and what evidence is needed to get it paid">Claim plan</h3>
                        <p class="muted small">Click a claim row above to inspect its filing rule, rescue bucket, and recommended next action.</p>
                      </div>
                    </div>
                  </details>
                  <details class="card">
                    <summary>Denials, Underpayments &amp; Payer Strategy ▸</summary>
                    <div class="stack" style="margin-top:12px;">
                      <div class="card">
                        <h3 data-tip="System capabilities that are not yet active — things the billing system could do once additional credentials or integrations are set up. Shows what is unlocked vs what requires more setup.">Capability Queue</h3>
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
                        <h3 data-tip="Custom rules you have set for specific payers — overrides the default behavior. For example: always require auth for Aetna, or skip secondary billing for this payer.">Payer Rule Overrides</h3>
                        <div id="payer-rules">${renderPayerRules(payerRules)}</div>
                      </div>
                      <div class="card">
                        <h3 data-tip="Patterns found in your Explanation of Remittance files — which denial codes appear most, which payers are slowest to pay, and where to focus appeal effort">ERA / Remit Insights</h3>
                        <div id="era-insights">${renderEraInsights(eraInsights)}</div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </details>
        </div>
        <aside class="utility-sidebar ${utilitySidebarCollapsed ? 'collapsed' : ''}">
          <div class="card utility-sidebar-head">
            <div class="row-actions" style="justify-content:space-between;align-items:flex-start;">
              <div>
                <div class="eyebrow">Utilities</div>
                <strong>${utilitySidebarCollapsed ? 'Open utilities' : 'Assistant'}</strong>
              </div>
              <div class="row-actions" style="justify-content:flex-end;">
                <button id="utility-sidebar-dock-toggle" class="ghost">${utilitySidebarDockedBottom ? 'Dock right' : 'Dock below'}</button>
                <button id="utility-sidebar-toggle" class="ghost">${utilitySidebarCollapsed ? 'Open' : 'Collapse'}</button>
              </div>
            </div>
          </div>
          <div class="utility-sidebar-body" style="${utilitySidebarCollapsed ? 'display:none;' : ''}">
            ${renderAssistantShell()}
          </div>
        </aside>
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
    const accountSearch = document.getElementById('account-search');
    if (accountSearch) {
      accountSearch.addEventListener('input', (event) => {
        const nextValue = event.target.value || '';
        setAccountSearch(nextValue);
        selectedAccountIndex = 0;
        rerender();
        requestAnimationFrame(() => {
          const input = document.getElementById('account-search');
          if (!input) return;
          input.focus();
          input.setSelectionRange(nextValue.length, nextValue.length);
        });
      });
    }
    const accountSearchClear = document.getElementById('account-search-clear');
    if (accountSearchClear) {
      accountSearchClear.addEventListener('click', () => {
        setAccountSearch('');
        selectedAccountIndex = 0;
        rerender();
      });
    }
    const utilitySidebarToggle = document.getElementById('utility-sidebar-toggle');
    if (utilitySidebarToggle) utilitySidebarToggle.addEventListener('click', () => {
      setUtilitySidebarCollapsed(!utilitySidebarCollapsed);
      render(root, dashboard, readiness, templateFields, claims, actions, reconciliation, intelligence, payerPlaybooks, payerRules, eraInsights, patientArPolicy, patientArEscalation, opsOverview, underpayments, appeals, packagingOverview, lastPackagingValidation, lastPackagingValidationHistory);
      ensureAssistantSession();
    });
    const utilitySidebarDockToggle = document.getElementById('utility-sidebar-dock-toggle');
    if (utilitySidebarDockToggle) utilitySidebarDockToggle.addEventListener('click', () => {
      setUtilitySidebarDockedBottom(!utilitySidebarDockedBottom);
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
    const vobModeExisting = document.getElementById('vob-mode-existing');
    if (vobModeExisting) vobModeExisting.addEventListener('click', () => {
      setVobMode('existing');
      rerender();
    });
    const vobModeProspect = document.getElementById('vob-mode-prospect');
    if (vobModeProspect) vobModeProspect.addEventListener('click', () => {
      setVobMode('prospect');
      rerender();
    });
    const vobSearch = document.getElementById('vob-client-search');
    if (vobSearch) vobSearch.addEventListener('input', (event) => {
      const nextValue = event.target.value || '';
      setVobSearch(nextValue);
      rerender();
      requestAnimationFrame(() => {
        const input = document.getElementById('vob-client-search');
        if (!input) return;
        input.focus();
        input.setSelectionRange(nextValue.length, nextValue.length);
      });
    });
    root.querySelectorAll('[data-vob-match-index]').forEach((button) => button.addEventListener('click', () => {
      const match = getVobMatches()[Number(button.getAttribute('data-vob-match-index') || 0)];
      if (match) selectAccountForVob(match);
    }));
    const prospectName = document.getElementById('vob-prospect-name');
    if (prospectName) prospectName.addEventListener('input', (event) => {
      lastProspectDraft.full_name = event.target.value || '';
      lastInsuranceDraft.source_label = lastProspectDraft.full_name || '';
    });
    const prospectPhone = document.getElementById('vob-prospect-phone');
    if (prospectPhone) prospectPhone.addEventListener('input', (event) => {
      lastProspectDraft.phone = event.target.value || '';
    });
    const prospectEmail = document.getElementById('vob-prospect-email');
    if (prospectEmail) prospectEmail.addEventListener('input', (event) => {
      lastProspectDraft.email = event.target.value || '';
    });
    const vobCardUpload = document.getElementById('vob-card-upload');
    if (vobCardUpload) vobCardUpload.addEventListener('click', uploadInsuranceCard);
    const vobInlineClear = document.getElementById('vob-inline-clear');
    if (vobInlineClear) vobInlineClear.addEventListener('click', () => {
      lastVobCardFile = null;
      lastVobCardFiles = [];
      const fin = document.getElementById('vob-inline-file');
      if (fin) fin.value = '';
      lastVobCardState = 'idle';
      lastVobCardSummary = null;
      lastVobCardError = '';
      rerender();
    });
    const vobSaveProspect = document.getElementById('vob-save-prospect');
    if (vobSaveProspect) vobSaveProspect.addEventListener('click', saveProspectVob);
    root.querySelectorAll('[data-vob-history-use]').forEach((button) => button.addEventListener('click', () => {
      const entry = (lastSavedVobProspects || [])[Number(button.getAttribute('data-vob-history-use') || 0)];
      if (!entry) return;
      hydrateVobFromSavedProspect(entry);
      rerender();
    }));
    root.querySelectorAll('[data-vob-history-promote]').forEach((button) => button.addEventListener('click', () => {
      promoteSavedVobHistory(Number(button.getAttribute('data-vob-history-promote') || 0));
    }));
    const vobRequestText = document.getElementById('vob-request-text');
    if (vobRequestText) vobRequestText.addEventListener('click', async () => {
      try {
        if (vobMode === 'prospect' && lastProspectDraft.phone) {
          await executeSystemOutreach({
            channel: 'sms',
            recipientName: lastProspectDraft.full_name || 'Prospect',
            recipientPhone: lastProspectDraft.phone,
            body: buildVobClientFacingBody(),
            sourceRef: `clientcare_vob_prospect:${lastProspectDraft.full_name || 'unknown'}`,
          });
          toast('Sent the client text through the system and logged the outreach task.', 'success');
        } else {
          await sendAssistantPrompt(buildVobOutreachPrompt('text message'));
          toast('Queued a client text request in the assistant.', 'success');
        }
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    const vobRequestEmail = document.getElementById('vob-request-email');
    if (vobRequestEmail) vobRequestEmail.addEventListener('click', async () => {
      try {
        if (vobMode === 'prospect' && lastProspectDraft.email) {
          await executeSystemOutreach({
            channel: 'email',
            recipientName: lastProspectDraft.full_name || 'Prospect',
            recipientEmail: lastProspectDraft.email,
            subject: `Insurance information needed for ${lastProspectDraft.full_name || 'your benefits review'}`,
            body: buildVobClientFacingEmail(),
            sourceRef: `clientcare_vob_prospect:${lastProspectDraft.full_name || 'unknown'}`,
          });
          toast('Sent the client email through the system and logged the outreach task.', 'success');
        } else {
          await sendAssistantPrompt(buildVobOutreachPrompt('email'));
          toast('Queued a client email request in the assistant.', 'success');
        }
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    const clientcarePipelineRun = document.getElementById('clientcare-pipeline-run');
    if (clientcarePipelineRun) clientcarePipelineRun.addEventListener('click', () => runFullClientcarePipeline());
    wireInsuranceCardDropzones(root);
    const reconcilePreviewBtn = document.getElementById('reconcile-preview');
    if (reconcilePreviewBtn) reconcilePreviewBtn.addEventListener('click', () => runClientcareReconcile(false));
    const reconcileApplyBtn = document.getElementById('reconcile-apply');
    if (reconcileApplyBtn) reconcileApplyBtn.addEventListener('click', () => runClientcareReconcile(true));
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
    root.querySelectorAll('[data-work-queue-index]').forEach((button) => button.addEventListener('click', async () => {
      const queue = [...getFilteredItems()]
        .map((item) => ({ item, visual: deriveAccountVisualState(item) }))
        .sort((a, b) => {
          const av = ['red', 'yellow', 'green'].indexOf(a.visual.state);
          const bv = ['red', 'yellow', 'green'].indexOf(b.visual.state);
          if (av !== bv) return av - bv;
          return String(a.item.client || '').localeCompare(String(b.item.client || ''));
        })
        .map((entry) => entry.item);
      const target = queue[Number(button.getAttribute('data-work-queue-index') || 0)];
      if (!target) return;
      selectAccountForVob(target);
      document.getElementById('account-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await inspectSelectedAccount();
      if (String(target.diagnosis?.status || '') === 'insurance_setup_issue') {
        document.getElementById('verification-of-benefits')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }));
    renderAccountBoard();
    if (lastBrowserResult) setBrowserOutput(lastBrowserResult);
    const workflowNode = document.getElementById('workflow-playbooks');
    if (workflowNode) workflowNode.innerHTML = renderWorkflowPlaybooks(lastAccountReport?.summary || {});
    root.querySelectorAll('[data-run-workflow]').forEach((button) => button.addEventListener('click', () => runWorkflow(button.getAttribute('data-run-workflow'))));
    wireVobCardZone();

    // Wire candidate account buttons shown after card OCR when no direct name match
    root.querySelectorAll('[data-card-candidate-href]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const href = btn.getAttribute('data-card-candidate-href');
        if (!href) return;
        const match = lastAccountReport?.items?.find((item) => (item.billingHref || item.href || '') === href)
          || (lastVobCardSummary?.directoryCandidates || []).find((item) => (item.billingHref || item.href || '') === href)
          || { billingHref: href, client: btn.textContent || 'client' };
        applyCardMatchedClient(match);
      });
    });
  }

  wireOverlayCardStripOnce();
  loadDashboard();
})();
