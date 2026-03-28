(function () {
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
      const [overview, reports, approvals, interactions] = await Promise.all(requests);
      renderOverview(overview, reports.items || [], approvals?.items || [], interactions?.items || []);
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

  async function runAlertAction(id, action) {
    await api(`/api/v1/tc/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, actor: 'agent_portal' }),
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

  async function runInboxScan() {
    await api('/api/v1/tc/email/scan', { method: 'POST', body: JSON.stringify({}) });
    await load();
  }

  async function runExecutedAgreementSearch() {
    const result = await api('/api/v1/tc/intake/email-search', { method: 'POST', body: JSON.stringify({ days: 90 }) });
    alert(`Found ${result.found || 0} relevant email(s) in the inbox search.`);
    await load();
  }

  async function markTriageHandled(id) {
    await api(`/api/v1/tc/email/triage/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Handled from TC intake workspace' }),
    });
    await load();
  }

  function renderWorkspace(data) {
    const root = document.getElementById('app');
    const readiness = data.readiness || {};
    const readinessSummary = readiness.readiness || {};
    const intakeQueue = data.intake_queue || [];
    const transactions = data.active_transactions || [];

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

    const vaultRows = (readiness.vault || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.service)}</td>
        <td>${escapeHtml(item.key || '')}</td>
        <td><span class="badge ${badgeClass(item.present ? 'healthy' : 'red')}">${escapeHtml(item.present ? 'stored' : 'missing')}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="3">No vault credentials tracked yet.</td></tr>';

    const queueRows = intakeQueue.map((item) => `
      <tr>
        <td>${escapeHtml(item.received_at || '')}</td>
        <td>${escapeHtml(item.subject || '')}</td>
        <td><span class="badge ${badgeClass(item.category)}">${escapeHtml(item.category || '')}</span></td>
        <td>${item.suggested_transaction ? `<a href="/tc/agent-portal.html?tx=${encodeURIComponent(item.suggested_transaction.transaction_id)}">${escapeHtml(item.suggested_transaction.address)}</a> <span class="badge ${badgeClass(item.suggested_transaction.confidence)}">${escapeHtml(item.suggested_transaction.confidence)}</span>` : '—'}</td>
        <td>${escapeHtml(item.next_step || '')}${item.preview_text ? `<div style="margin-top:6px;color:#98a5c3;font-size:12px">${escapeHtml(item.preview_text)}</div>` : ''}</td>
        <td><button data-triage-handle="${item.id}" class="ghost">${item.actioned_at ? 'Handled' : 'Mark handled'}</button></td>
      </tr>
    `).join('') || '<tr><td colspan="6">No actionable triage items.</td></tr>';

    const txRows = transactions.map((item) => `
      <tr>
        <td><a href="/tc/agent-portal.html?tx=${encodeURIComponent(item.id)}">${escapeHtml(item.address || '')}</a></td>
        <td><span class="badge ${badgeClass(item.health_status)}">${escapeHtml(item.health_status || '')}</span></td>
        <td>${escapeHtml(item.stage || '')}</td>
        <td>${escapeHtml(item.next_action || '')}</td>
        <td>${escapeHtml(item.transaction_desk_id || 'pending')}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">No active transactions yet.</td></tr>';

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
              <input id="work-email" value="${escapeHtml(readiness.bootstrap_defaults?.TC_EMAIL_FROM || '')}" placeholder="adam@hopkinsgroup.org">
            </div>
            <div>
              <label>TC IMAP user</label>
              <input id="tc-imap-user" value="${escapeHtml(readiness.bootstrap_defaults?.TC_EMAIL_FROM || '')}" placeholder="adam@hopkinsgroup.org">
            </div>
            <div>
              <label>TC agent name</label>
              <input id="tc-agent-name" value="${escapeHtml(readiness.bootstrap_defaults?.TC_AGENT_NAME || '')}" placeholder="Adam Hopkins">
            </div>
            <div>
              <label>TC agent phone</label>
              <input id="tc-agent-phone" value="" placeholder="702-555-1212">
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
            <button id="bootstrap-access">Save access</button>
          </div>
          <p><strong>Next actions:</strong> ${(data.next_actions || []).map((item) => escapeHtml(item)).join(' | ') || 'None'}</p>
        </div>

        <div class="card">
          <h2>Readiness Details</h2>
          <table><thead><tr><th>Env</th><th>Purpose</th><th>Status</th></tr></thead><tbody>${envRows}</tbody></table>
          <h2 style="margin-top:16px">Vault Credentials</h2>
          <table><thead><tr><th>Service</th><th>Key</th><th>Status</th></tr></thead><tbody>${vaultRows}</tbody></table>
        </div>
      </div>

      <div class="card">
        <h2>Inbox Intake Queue</h2>
        <table><thead><tr><th>Received</th><th>Subject</th><th>Category</th><th>Suggested transaction</th><th>Next step</th><th>Action</th></tr></thead><tbody>${queueRows}</tbody></table>
      </div>

      <div class="card">
        <h2>Active Transactions</h2>
        <table><thead><tr><th>Address</th><th>Health</th><th>Stage</th><th>Next action</th><th>TransactionDesk</th></tr></thead><tbody>${txRows}</tbody></table>
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
  }

  function renderOverview(data, reports, approvals, interactions) {
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
    const approvalRows = approvals.map((item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="badge ${badgeClass(item.priority)}">${escapeHtml(item.priority)}</span></td>
        <td>${escapeHtml(item.summary || '')}</td>
        <td>${escapeHtml(item.due_at || '')}</td>
        <td>
          <div class="row-actions">
            <button data-approval="${item.id}" data-action="approve">Approve</button>
            <button data-approval="${item.id}" data-action="snooze">Snooze</button>
            <button data-approval-link="${item.id}" data-action="approve" class="ghost">Link</button>
            <button data-approval="${item.id}" data-action="reject" class="ghost">Reject</button>
          </div>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5">No pending approvals</td></tr>';
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
          <h1>${escapeHtml(tx.address || 'Transaction')}</h1>
          <p>${escapeHtml(tx.status || '')} ${tx.agent_role ? '· ' + escapeHtml(tx.agent_role) : ''}</p>
        </div>
        <div class="hero-actions">
          <span class="badge ${badgeClass(status.health_status)}">${escapeHtml(status.health_status || 'unknown')}</span>
          <span class="badge ${badgeClass(status.stage)}">${escapeHtml(status.stage || 'unknown')}</span>
        </div>
      </div>

      <div class="grid four">
        <div class="card stat"><span>Next action</span><strong>${escapeHtml(status.next_action || '—')}</strong></div>
        <div class="card stat"><span>Waiting on</span><strong>${escapeHtml(status.waiting_on || '—')}</strong></div>
        <div class="card stat"><span>Missing docs</span><strong>${escapeHtml(status.missing_doc_count || 0)}</strong></div>
        <div class="card stat"><span>Blockers</span><strong>${escapeHtml(status.blocker_count || 0)}</strong></div>
      </div>

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
        <div class="card">
          <h2>Requested Documents</h2>
          <table><thead><tr><th>Title</th><th>Description</th><th>Status</th><th>Due</th></tr></thead><tbody>${documentRows}</tbody></table>
        </div>
        <div class="card">
          <h2>${isClient ? 'Recent Updates' : 'Communications'}</h2>
          <table><thead><tr><th>Channel</th><th>Subject</th><th>Status</th><th>When</th></tr></thead><tbody>${communicationRows}</tbody></table>
        </div>
      </div>

      ${isClient ? '' : `
      <div class="card">
        <h2>Approval Cockpit</h2>
        <table><thead><tr><th>Item</th><th>Priority</th><th>Summary</th><th>Due</th><th>Actions</th></tr></thead><tbody>${approvalRows}</tbody></table>
      </div>

      <div class="card">
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
          await runAlertAction(button.dataset.alert, button.dataset.action);
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
  }

  window.addEventListener('DOMContentLoaded', load);
})();
