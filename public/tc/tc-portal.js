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
      const [overview, reports] = await Promise.all([
        api(`/api/v1/tc/transactions/${txId}/overview?view=${view}`),
        api(`/api/v1/tc/transactions/${txId}/reports`),
      ]);
      renderOverview(overview, reports.items || []);
    } catch (err) {
      document.getElementById('app').innerHTML = `<div class="card error"><h2>Load failed</h2><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  function renderOverview(data, reports) {
    const root = document.getElementById('app');
    const isClient = data.view === 'client';
    const tx = data.transaction || {};
    const status = data.status || {};
    const recentReports = reports.slice(0, 3);

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
        <h2>Recent Events</h2>
        <table><thead><tr><th>Event</th><th>When</th></tr></thead><tbody>${eventRows}</tbody></table>
      </div>`}
    `;
  }

  window.addEventListener('DOMContentLoaded', load);
})();
