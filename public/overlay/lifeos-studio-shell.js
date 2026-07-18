/**
 * SYNOPSIS: Browser-side Studio shell packet — founder-facing LifeOS shell tokens and cues.
 * Visual direction: Limitless dusk — cool ink surfaces, teal primary, desert-gold secondary.
 * Not cream/terracotta atelier; not purple SaaS default.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
(function () {
  const SHARED = {
    accent: '#2ec4b6',
    accentTwo: '#e3b23c',
    accentRgb: '46, 196, 182',
    accentTwoRgb: '227, 178, 60',
    accentSoft: 'rgba(46, 196, 182, 0.14)',
    heroGradient: 'linear-gradient(135deg, #2ec4b6 0%, #1a6f8a 55%, #e3b23c 130%)',
    displayFont: '"Sora", "Avenir Next", sans-serif',
    bodyFont: '"DM Sans", "Avenir Next", sans-serif',
    codeFont: '"IBM Plex Mono", ui-monospace, monospace',
    shellGap: '14px',
    contentPad: '14px',
    panelRadius: '18px',
    stageRadius: '24px',
    drawerWidth: '440px',
    composerRadius: '18px',
    sidebarWidth: '248px',
    sidebarMiniWidth: '72px',
    topbarHeight: '64px',
  };

  const PACKET = {
    schema: 'studio_shell_packet_v3',
    surface: 'founder_command_center',
    mood: 'limitless_dusk',
    title: 'Lumin Chair',
    subtitle: 'Direct action, visible proof, no theater',
    tokensDark: {
      ...SHARED,
      bg: '#070b12',
      bgRaised: '#0e1520',
      bgSurface: '#141c28',
      bgSurface2: '#1a2433',
      bgOverlay: '#223044',
      text: '#e8eef6',
      textSecondary: '#9aabc0',
      textMuted: '#6b7c93',
      border: 'rgba(232, 238, 246, 0.10)',
      borderFocus: 'rgba(46, 196, 182, 0.42)',
      shadow: '0 28px 90px rgba(0, 8, 20, 0.55)',
    },
    tokensLight: {
      ...SHARED,
      bg: '#e8eef4',
      bgRaised: '#f7fafc',
      bgSurface: '#ffffff',
      bgSurface2: '#eef3f8',
      bgOverlay: '#e2e9f1',
      text: '#0f1724',
      textSecondary: '#4a5d73',
      textMuted: '#6b7f95',
      border: 'rgba(15, 23, 36, 0.10)',
      borderFocus: 'rgba(46, 196, 182, 0.38)',
      shadow: '0 24px 70px rgba(15, 40, 60, 0.12)',
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

  PACKET.tokens = PACKET.tokensDark;

  function resolveThemeTokens(packet) {
    const isLight = document.documentElement.dataset.theme === 'light';
    return isLight ? (packet.tokensLight || packet.tokens) : (packet.tokensDark || packet.tokens);
  }

  function applyTokens(packet) {
    const root = document.documentElement;
    const t = resolveThemeTokens(packet) || {};
    root.style.setProperty('--studio-bg', t.bg || '#070b12');
    root.style.setProperty('--studio-bg-raised', t.bgRaised || '#0e1520');
    root.style.setProperty('--studio-bg-surface', t.bgSurface || '#141c28');
    root.style.setProperty('--studio-bg-surface2', t.bgSurface2 || '#1a2433');
    root.style.setProperty('--studio-bg-overlay', t.bgOverlay || '#223044');
    root.style.setProperty('--studio-text', t.text || '#e8eef6');
    root.style.setProperty('--studio-text-secondary', t.textSecondary || '#9aabc0');
    root.style.setProperty('--studio-text-muted', t.textMuted || '#6b7c93');
    root.style.setProperty('--studio-border', t.border || 'rgba(232,238,246,0.10)');
    root.style.setProperty('--studio-border-focus', t.borderFocus || 'rgba(46,196,182,0.42)');
    root.style.setProperty('--studio-accent', t.accent || '#2ec4b6');
    root.style.setProperty('--studio-accent-two', t.accentTwo || '#e3b23c');
    root.style.setProperty('--studio-accent-rgb', t.accentRgb || '46, 196, 182');
    root.style.setProperty('--studio-accent-two-rgb', t.accentTwoRgb || '227, 178, 60');
    root.style.setProperty('--studio-accent-soft', t.accentSoft || 'rgba(46,196,182,0.14)');
    root.style.setProperty('--studio-hero-gradient', t.heroGradient || SHARED.heroGradient);
    root.style.setProperty('--studio-font-display', t.displayFont || SHARED.displayFont);
    root.style.setProperty('--studio-font-body', t.bodyFont || SHARED.bodyFont);
    root.style.setProperty('--studio-font-code', t.codeFont || SHARED.codeFont);
    root.style.setProperty('--studio-shadow', t.shadow || '0 28px 90px rgba(0,8,20,0.55)');
    root.style.setProperty('--studio-shell-gap', t.shellGap || '14px');
    root.style.setProperty('--studio-content-pad', t.contentPad || '14px');
    root.style.setProperty('--studio-panel-radius', t.panelRadius || '18px');
    root.style.setProperty('--studio-stage-radius', t.stageRadius || '24px');
    root.style.setProperty('--studio-drawer-width', t.drawerWidth || '440px');
    root.style.setProperty('--studio-composer-radius', t.composerRadius || '18px');
    root.style.setProperty('--studio-sidebar-width', t.sidebarWidth || '248px');
    root.style.setProperty('--studio-sidebar-mini-width', t.sidebarMiniWidth || '72px');
    root.style.setProperty('--studio-topbar-height', t.topbarHeight || '64px');
    root.dataset.studioSurface = packet.surface || 'voice_command_surface';
    root.dataset.studioMood = packet.mood || 'limitless_dusk';
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
    reapplyTheme: function reapplyTheme() {
      applyTokens(PACKET);
    },
  };

  document.addEventListener('lifeos-theme-changed', () => {
    if (window.LifeOSStudioShell?.packet) applyTokens(PACKET);
  });
})();
