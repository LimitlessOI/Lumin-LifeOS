(function () {
  function getApiKey() {
    return (
      localStorage.getItem('COMMAND_CENTER_KEY') ||
      localStorage.getItem('lifeos_cmd_key') ||
      localStorage.getItem('x_api_key') ||
      ''
    );
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
