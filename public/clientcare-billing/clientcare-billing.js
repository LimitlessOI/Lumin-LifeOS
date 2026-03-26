/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-billing.js
 * Operator overlay for ClientCare billing rescue.
 */
(function () {
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

  async function loadDashboard(filters = {}) {
    const root = document.getElementById('app');
    try {
      const query = new URLSearchParams(filters).toString();
      const [dashboard, readiness, template, claims, actions, reconciliation] = await Promise.all([
        api('/api/v1/clientcare-billing/dashboard'),
        api('/api/v1/clientcare-billing/clientcare/readiness'),
        api('/api/v1/clientcare-billing/claims/import-template'),
        api(`/api/v1/clientcare-billing/claims${query ? `?${query}` : ''}`),
        api('/api/v1/clientcare-billing/actions'),
        api('/api/v1/clientcare-billing/reconciliation'),
      ]);
      render(root, dashboard.dashboard, readiness.readiness, template.fields || [], claims.claims || [], actions.actions || [], reconciliation.summary || {});
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
      document.getElementById('browser-output').textContent = JSON.stringify(result, null, 2);
      alert('Browser login test completed.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserDiscover() {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/discover', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      document.getElementById('browser-output').textContent = JSON.stringify(result, null, 2);
      alert('Browser discovery completed.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function browserExtract(importIntoQueue = false) {
    try {
      const result = await api('/api/v1/clientcare-billing/browser/extract-claims', {
        method: 'POST',
        body: JSON.stringify({ import_into_queue: importIntoQueue }),
      });
      document.getElementById('browser-output').textContent = JSON.stringify(result, null, 2);
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

  function render(root, dashboard, readiness, templateFields, claims, actions, reconciliation) {
    const summary = dashboard.summary || {};
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
        <div class="card stat"><span>Total claims</span><strong>${escapeHtml(summary.total_claims || 0)}</strong></div>
        <div class="card stat"><span>Outstanding total</span><strong>${escapeHtml(summary.outstanding_total || 0)}</strong></div>
        <div class="card stat"><span>Submit now</span><strong>${escapeHtml(summary.submit_now_count || 0)}</strong></div>
        <div class="card stat"><span>Correct/resubmit</span><strong>${escapeHtml(summary.correct_and_resubmit_count || 0)}</strong></div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Browser fallback readiness</h2>
          <p style="margin:10px 0"><span class="badge ${badgeClass(readiness.ready ? 'ready' : 'warn')}">${readiness.ready ? 'ready' : 'not ready'}</span></p>
          <pre>${escapeHtml(JSON.stringify(readiness, null, 2))}</pre>
        </div>
        <div class="card">
          <h2>Import backlog</h2>
          <p class="hint" style="margin:10px 0">Paste CSV from ClientCare exports. Required/expected fields are listed below.</p>
          <pre>${escapeHtml(templateFields.join('\n'))}</pre>
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
          <pre>${escapeHtml(JSON.stringify(reconciliation, null, 2))}</pre>
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Browser automation</h2>
          <p class="hint" style="margin:10px 0">Uses the Railway ClientCare credentials to log in, inspect billing pages, and preview claim tables.</p>
          <div class="row-actions">
            <button id="browser-login-test">Login Test</button>
            <button id="browser-discover" class="ghost">Discover</button>
            <button id="browser-extract" class="ghost">Extract Preview</button>
            <button id="browser-extract-import">Extract + Import</button>
          </div>
        </div>
        <div class="card">
          <h2>Browser output</h2>
          <pre id="browser-output">No browser run yet.</pre>
        </div>
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
    document.getElementById('browser-discover').addEventListener('click', browserDiscover);
    document.getElementById('browser-extract').addEventListener('click', () => browserExtract(false));
    document.getElementById('browser-extract-import').addEventListener('click', () => browserExtract(true));
    root.querySelectorAll('[data-claim-view]').forEach((button) => button.addEventListener('click', () => showClaim(button.getAttribute('data-claim-view'))));
    root.querySelectorAll('[data-claim-reclassify]').forEach((button) => button.addEventListener('click', () => reclassify(button.getAttribute('data-claim-reclassify'))));
    root.querySelectorAll('[data-action-complete]').forEach((button) => button.addEventListener('click', () => completeAction(button.getAttribute('data-action-complete'))));
  }

  loadDashboard();
})();
