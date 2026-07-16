/**
 * SYNOPSIS: LifeOS overlay UI — collapsible thought stream for Lumin chat responses.
 */
(function () {
  function initThoughtStream() {
    const messageContainer = document.querySelector('#lumin-messages');
    if (!messageContainer) return;

    const originalFetch = window.fetch;
    const MESSAGE_ENDPOINT = '/api/v1/lifeos/builderos/command-control/founder-interface/message';

    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      return originalFetch.apply(this, args).then((response) => {
        const isMessageResponse = typeof url === 'string' && url.includes(MESSAGE_ENDPOINT);
        if (isMessageResponse) {
          try {
            const clone = response.clone();
            clone.json().then((data) => {
              if (data && typeof data === 'object') {
                renderThoughtStream(data, messageContainer);
              }
            }).catch(() => {});
          } catch (e) { /* non-fatal */ }
        }
        return response;
      });
    };

    function fmtValue(value) {
      if (value === undefined || value === null) return '—';
      if (typeof value === 'object') {
        try {
          if (value.route && value.estimated_cost_tier) {
            return `${value.route} (${value.estimated_cost_tier})`;
          }
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }
      return String(value);
    }

    function renderThoughtStream(data, container) {
      const existing = container.querySelector('.thought-stream');
      if (existing) existing.remove();

      const thoughtStream = document.createElement('div');
      thoughtStream.classList.add('thought-stream');
      thoughtStream.style.border = '1px solid var(--lifeos-border, #374151)';
      thoughtStream.style.borderRadius = '12px';
      thoughtStream.style.margin = '8px 0';
      thoughtStream.style.padding = '8px 12px';
      thoughtStream.style.background = 'var(--lifeos-surface-2, #1f2937)';

      const labels = {
        model_routing: 'Model / Provider',
        command_truth: 'Command Truth',
        pass_fail: 'Pass / Fail',
        action: 'Action',
        lane: 'Lane',
        execution_kind: 'Execution Kind',
        chair_channel: 'Channel',
        first_blocker: 'First Blocker',
        target_file: 'Target File',
        sha: 'Commit SHA',
        transport_status: 'Transport',
      };

      let added = 0;
      for (const key in labels) {
        if (data[key] !== undefined && data[key] !== null) {
          const item = createThoughtItem(labels[key], fmtValue(data[key]));
          thoughtStream.appendChild(item);
          added += 1;
        }
      }

      if (data.display && typeof data.display === 'object' && Object.keys(data.display).length) {
        const item = createThoughtItem('Display Payload', JSON.stringify(data.display, null, 2));
        thoughtStream.appendChild(item);
        added += 1;
      }

      if (added === 0) return;

      const controlPanel = createControlPanel(thoughtStream);
      thoughtStream.insertBefore(controlPanel, thoughtStream.firstChild);
      container.appendChild(thoughtStream);
      container.scrollTop = container.scrollHeight;
    }

    function createThoughtItem(label, value) {
      const item = document.createElement('div');
      item.classList.add('thought-item');
      item.style.marginBottom = '6px';

      const header = document.createElement('div');
      header.textContent = label;
      header.classList.add('thought-header');
      header.style.cursor = 'pointer';
      header.style.fontWeight = '600';
      header.style.fontSize = '12px';
      header.style.color = 'var(--lifeos-muted, #9ca3af)';
      header.addEventListener('click', () => toggleThought(item));

      const content = document.createElement('div');
      content.textContent = value;
      content.classList.add('thought-content');
      content.style.display = 'none';
      content.style.whiteSpace = 'pre-wrap';
      content.style.wordBreak = 'break-word';
      content.style.fontSize = '13px';
      content.style.marginTop = '4px';
      content.style.color = 'var(--lifeos-fg, #e5e7eb)';

      item.appendChild(header);
      item.appendChild(content);
      return item;
    }

    function toggleThought(item) {
      const content = item.querySelector('.thought-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }

    function createControlPanel(thoughtStream) {
      const panel = document.createElement('div');
      panel.classList.add('control-panel');
      panel.style.marginBottom = '8px';

      const expandButton = document.createElement('button');
      expandButton.textContent = 'Expand all';
      expandButton.style.marginRight = '8px';
      expandButton.style.fontSize = '12px';
      expandButton.addEventListener('click', () => expandAllThoughts(thoughtStream));

      const collapseButton = document.createElement('button');
      collapseButton.textContent = 'Collapse all';
      collapseButton.style.fontSize = '12px';
      collapseButton.addEventListener('click', () => collapseAllThoughts(thoughtStream));

      panel.appendChild(expandButton);
      panel.appendChild(collapseButton);
      return panel;
    }

    function collapseAllThoughts(thoughtStream) {
      thoughtStream.querySelectorAll('.thought-item .thought-content').forEach((item) => {
        item.style.display = 'none';
      });
    }

    function expandAllThoughts(thoughtStream) {
      thoughtStream.querySelectorAll('.thought-item .thought-content').forEach((item) => {
        item.style.display = 'block';
      });
    }

    window.LifeOSChatThoughts = {
      renderThoughtStream,
      toggleThought,
      collapseAllThoughts,
      expandAllThoughts,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThoughtStream);
  } else {
    initThoughtStream();
  }
})();
