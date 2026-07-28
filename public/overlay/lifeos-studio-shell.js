/**
 * SYNOPSIS: Browser-side Studio shell packet — founder-facing LifeOS shell tokens and cues.
 */
(function () {
  const PACKET = {
    schema: 'studio_shell_packet_v2',
    surface: 'founder_command_center',
    mood: 'atelier_operator',
    title: 'Lumin Chair',
    subtitle: 'Direct action, visible proof, no theater',
    tokens: {
      bg: '#f4f1ea',
      bgRaised: '#fcfaf6',
      bgSurface: '#fffdfa',
      bgSurface2: '#f1ece3',
      bgOverlay: '#ebe4d8',
      text: '#172033',
      textSecondary: '#4f5d75',
      textMuted: '#6f7b8f',
      border: 'rgba(23,32,51,0.10)',
      borderFocus: 'rgba(28,124,84,0.32)',
      accent: '#1c7c54',
      accentTwo: '#d96c06',
      accentSoft: 'rgba(28,124,84,0.12)',
      heroGradient: 'linear-gradient(135deg, rgba(28,124,84,0.96) 0%, rgba(217,108,6,0.88) 100%)',
      displayFont: '"Space Grotesk", "Trebuchet MS", sans-serif',
      bodyFont: '"Manrope", "Avenir Next", sans-serif',
      codeFont: '"IBM Plex Mono", monospace',
      shadow: '0 24px 80px rgba(38, 45, 61, 0.16)',
      shellGap: '14px',
      contentPad: '14px',
      panelRadius: '22px',
      stageRadius: '28px',
      drawerWidth: '440px',
      composerRadius: '22px',
      sidebarWidth: '248px',
      sidebarMiniWidth: '72px',
      topbarHeight: '64px',
    },
    copy: {
      topbarEyebrow: 'Founder command rail',
      quickTitle: 'Ask Lumin or execute directly',
      quickSubhead: 'Open a surface, continue a build, or press on a blocker. The shell stays honest about what actually ran.',
      emptyHeading: 'Talk to Lumin',
      emptySubhead: 'Start with a direct instruction or a hard question. Execution, counsel, and proof all return in one place.',
      placeholder: 'Tell Lumin what to do, ask, or pressure-test. Shift+Enter for a new line.',
      suggestionsHeading: 'Start with one of these',
    },
    nav: {
      groups: {
        daily: 'Daily Operations',
        life: 'Life Systems',
        support: 'Resolution',
        self: 'Core Self',
        legacy: 'Archive',
      },
    },
    actions: [
      { label: 'Open LifeRE', prompt: 'open LifeRE', send: true },
      { label: 'Alpha cycle', prompt: 'run alpha cycle for the current product and return receipts only', send: true },
      { label: 'Build next step', prompt: 'continue the active blueprint to the next required step and return exact proof or blocker', send: true },
      { label: 'Pressure test', prompt: 'pressure test the current plan and show me the weakest assumption', send: false },
    ],
    status: {
      pointBLabel: 'Point B',
    },
  };

  function applyTokens(packet) {
    const root = document.documentElement;
    const t = packet.tokens || {};
    root.style.setProperty('--studio-bg', t.bg || '#f4f1ea');
    root.style.setProperty('--studio-bg-raised', t.bgRaised || '#fcfaf6');
    root.style.setProperty('--studio-bg-surface', t.bgSurface || '#fffdfa');
    root.style.setProperty('--studio-bg-surface2', t.bgSurface2 || '#f1ece3');
    root.style.setProperty('--studio-bg-overlay', t.bgOverlay || '#ebe4d8');
    root.style.setProperty('--studio-text', t.text || '#172033');
    root.style.setProperty('--studio-text-secondary', t.textSecondary || '#4f5d75');
    root.style.setProperty('--studio-text-muted', t.textMuted || '#6f7b8f');
    root.style.setProperty('--studio-border', t.border || 'rgba(23,32,51,0.10)');
    root.style.setProperty('--studio-border-focus', t.borderFocus || 'rgba(28,124,84,0.32)');
    root.style.setProperty('--studio-accent', t.accent || '#1c7c54');
    root.style.setProperty('--studio-accent-two', t.accentTwo || '#d96c06');
    root.style.setProperty('--studio-accent-soft', t.accentSoft || 'rgba(28,124,84,0.12)');
    root.style.setProperty('--studio-hero-gradient', t.heroGradient || 'linear-gradient(135deg, rgba(28,124,84,0.96) 0%, rgba(217,108,6,0.88) 100%)');
    root.style.setProperty('--studio-font-display', t.displayFont || '"Space Grotesk", "Trebuchet MS", sans-serif');
    root.style.setProperty('--studio-font-body', t.bodyFont || '"Manrope", "Avenir Next", sans-serif');
    root.style.setProperty('--studio-font-code', t.codeFont || '"IBM Plex Mono", monospace');
    root.style.setProperty('--studio-shadow', t.shadow || '0 24px 80px rgba(38,45,61,0.16)');
    root.style.setProperty('--studio-shell-gap', t.shellGap || '14px');
    root.style.setProperty('--studio-content-pad', t.contentPad || '14px');
    root.style.setProperty('--studio-panel-radius', t.panelRadius || '22px');
    root.style.setProperty('--studio-stage-radius', t.stageRadius || '28px');
    root.style.setProperty('--studio-drawer-width', t.drawerWidth || '440px');
    root.style.setProperty('--studio-composer-radius', t.composerRadius || '22px');
    root.style.setProperty('--studio-sidebar-width', t.sidebarWidth || '248px');
    root.style.setProperty('--studio-sidebar-mini-width', t.sidebarMiniWidth || '72px');
    root.style.setProperty('--studio-topbar-height', t.topbarHeight || '64px');
    root.dataset.studioSurface = packet.surface || 'voice_command_surface';
    root.dataset.studioMood = packet.mood || 'mission_control';
  }

  function applyCopy(packet) {
    const empty = document.getElementById('lumin-empty');
    const input = document.getElementById('lumin-input');
    const title = document.querySelector('.lumin-drawer-title strong');
    const subtitle = document.getElementById('lumin-status-text');
    const quickTitle = document.getElementById('lumin-quick-title');
    const quickSub = document.getElementById('lumin-quick-sub');
    const eyebrow = document.getElementById('topbar-eyebrow');
    const suggestionsHeading = document.getElementById('lumin-suggestions-heading');
    if (title && packet.title) title.textContent = packet.title;
    if (subtitle && packet.subtitle) subtitle.textContent = packet.subtitle;
    if (quickTitle && packet.copy?.quickTitle) quickTitle.textContent = packet.copy.quickTitle;
    if (quickSub && packet.copy?.quickSubhead) quickSub.textContent = packet.copy.quickSubhead;
    if (eyebrow && packet.copy?.topbarEyebrow) eyebrow.textContent = packet.copy.topbarEyebrow;
    if (suggestionsHeading && packet.copy?.suggestionsHeading) suggestionsHeading.textContent = packet.copy.suggestionsHeading;
    if (empty) {
      const nodes = empty.querySelectorAll('[data-studio-copy]');
      nodes.forEach((node) => {
        const key = node.getAttribute('data-studio-copy');
        if (key && packet.copy?.[key]) node.textContent = packet.copy[key];
      });
    }
    if (input && packet.copy?.placeholder) input.placeholder = packet.copy.placeholder;
  }

  function applyNav(packet) {
    const groups = packet.nav?.groups || {};
    document.querySelectorAll('[data-studio-nav-group]').forEach((node) => {
      const key = node.getAttribute('data-studio-nav-group');
      if (key && groups[key]) node.textContent = groups[key];
    });
  }

  function renderActionChip(action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-chip';
    button.textContent = action.label;
    button.dataset.prompt = action.prompt || '';
    button.dataset.send = action.send ? '1' : '0';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window.lifeosStudioRunAction === 'function') {
        window.lifeosStudioRunAction(action.prompt || '', { send: !!action.send });
      }
    });
    return button;
  }

  function applyActions(packet) {
    const quick = document.getElementById('studio-command-chips');
    const drawer = document.getElementById('lumin-suggestion-chips');
    const actions = Array.isArray(packet.actions) ? packet.actions : [];
    if (quick) {
      quick.innerHTML = '';
      actions.forEach((action) => quick.appendChild(renderActionChip(action)));
    }
    if (drawer) {
      drawer.innerHTML = '';
      actions.slice(0, 3).forEach((action) => drawer.appendChild(renderActionChip(action)));
    }
  }

  function applyStatus(packet) {
    const pointB = document.getElementById('point-b-label');
    if (pointB && packet.status?.pointBLabel) {
      pointB.dataset.prefix = packet.status.pointBLabel;
    }
  }

  function applyStudioShellPacket() {
    applyTokens(PACKET);
    applyCopy(PACKET);
    applyNav(PACKET);
    applyActions(PACKET);
    applyStatus(PACKET);
    return PACKET;
  }

  window.LifeOSStudioShell = {
    packet: PACKET,
    apply: applyStudioShellPacket,
  };
})();
