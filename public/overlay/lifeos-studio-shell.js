/**
 * SYNOPSIS: Browser-side Studio shell packet — founder-facing LifeOS shell tokens and cues.
 */
(function () {
  const PACKET = {
    schema: 'studio_shell_packet_v1',
    surface: 'voice_command_surface',
    mood: 'mission_control',
    title: 'Founder Mission Control',
    subtitle: 'Direct command, clear proof, no theater',
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
    },
    copy: {
      emptyHeading: 'Talk to Lumin',
      emptySubhead: 'Direct command first. Ask, act, verify.',
      placeholder: 'Tell Lumin what to do, ask, or fix. Press Enter to send.',
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
    root.dataset.studioSurface = packet.surface || 'voice_command_surface';
    root.dataset.studioMood = packet.mood || 'mission_control';
  }

  function applyCopy(packet) {
    const empty = document.getElementById('lumin-empty');
    const input = document.getElementById('lumin-input');
    const title = document.querySelector('.lumin-drawer-title strong');
    const subtitle = document.getElementById('lumin-status-text');
    if (title && packet.title) title.textContent = packet.title;
    if (subtitle && packet.subtitle) subtitle.textContent = packet.subtitle;
    if (empty) {
      const nodes = empty.querySelectorAll('[data-studio-copy]');
      nodes.forEach((node) => {
        const key = node.getAttribute('data-studio-copy');
        if (key && packet.copy?.[key]) node.textContent = packet.copy[key];
      });
    }
    if (input && packet.copy?.placeholder) input.placeholder = packet.copy.placeholder;
  }

  function applyStudioShellPacket() {
    applyTokens(PACKET);
    applyCopy(PACKET);
    return PACKET;
  }

  window.LifeOSStudioShell = {
    packet: PACKET,
    apply: applyStudioShellPacket,
  };
})();
