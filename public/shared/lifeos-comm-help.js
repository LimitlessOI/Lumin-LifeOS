/**
 * SYNOPSIS: Universal explainability catalog for LifeOS Communication OS + Command Center.
 * Universal explainability catalog for LifeOS Communication OS + Command Center.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
(function (global) {
  'use strict';

  const HELP = {
    'snap-builder-mode': {
      short: 'Current builder release mode (MANUAL / SUPERVISED / AUTONOMOUS).',
      what: 'Shows how much autonomy the builder has right now.',
      why: 'Wrong mode = surprise builds or blocked progress.',
      source: 'GET /api/v1/lifeos/builder/ready + /command-center/mode',
      trust: 'VERIFIED when Railway responds 200 with mode field.',
      action: 'Switch mode only via governed gate-change — not from this card alone.',
    },
    'snap-alpha-cert': {
      short: 'Phase 14 Alpha-Ready certification status.',
      what: 'Whether OIL phase proofs are ALPHA_READY on live Railway DB.',
      why: 'Alpha cert gates supervised autonomy expansion.',
      source: 'GET /api/v1/lifeos/command-center/phase14',
      trust: 'VERIFIED from builder_audit_receipts on server pool.',
      action: 'Open proof drawer for phase ledger details.',
    },
    'snap-oil-health': {
      short: 'Proof freshness across PF-001/002/003 rules.',
      what: 'Whether deploy SHA and proof receipts are CURRENT or STALE.',
      why: 'Stale proof = do not trust green status tiles.',
      source: 'GET /api/v1/lifeos/command-center/proof-freshness',
      trust: 'VERIFIED when overall=CURRENT; UNVERIFIED when UNKNOWN.',
      action: 'Run self-repair deploy-check if STALE.',
    },
    'snap-railway-sha': {
      short: 'Git commit currently deployed on Railway.',
      what: 'Live runtime version fingerprint.',
      why: 'Compare to local git before trusting UI vs code.',
      source: 'GET /api/v1/lifeos/builder/ready → codegen.deploy_commit_sha',
      trust: 'VERIFIED from deploy metadata.',
      action: 'Redeploy if SHA lags main after merge.',
    },
    'snap-gemini-live': {
      short: 'Latest Gemini live proof receipt.',
      what: 'External model reachability proof for council routing.',
      why: 'Missing proof = council may fail over or skip.',
      source: 'GET /api/v1/lifeos/command-center/security or gemini receipts',
      trust: 'PARTIAL — receipt age matters; check timestamp.',
      action: 'See SEC-F01 panel for not_wired lanes.',
    },
    'snap-neon-db': {
      short: 'Database connectivity from Railway runtime.',
      what: 'Can the live app query Neon PostgreSQL.',
      why: 'Panels show ERROR when DB is down or misconfigured.',
      source: 'Aggregate snapshot + /api/health',
      trust: 'VERIFIED when queries succeed in snapshot load.',
      action: 'Check DATABASE_URL on Railway if red.',
    },
    'snap-adam-queue': {
      short: 'Items blocked on Adam approval.',
      what: 'pending_adam rows needing operator decision.',
      why: 'Revenue and builds stall while queue grows.',
      source: 'GET /api/v1/pending-adam',
      trust: 'VERIFIED from DB count.',
      action: 'Open Decision Queue panel to resolve.',
    },
    'snap-memory-proof': {
      short: 'BuilderOS memory proof (epistemic_facts only).',
      what: 'Canonical memory maturity — NOT chat history.',
      why: 'Legacy memory excluded from BuilderOS proof by design.',
      source: 'GET /api/v1/lifeos/command-center/memory/proof',
      trust: 'VERIFIED when builderos_memory_proven:true.',
      action: 'Do not conflate with Communication history.',
    },
    'comm-hub-priorities': {
      short: 'What LifeOS thinks matters right now.',
      what: 'Aggregated waiting decisions + latest conversations.',
      why: 'Conversation-first home — dashboard supports this list.',
      source: 'GET /api/v1/lifeos/communication/hub',
      trust: 'PARTIAL — advisory synthesis; underlying rows are DB-backed.',
      action: 'Click a item to continue in thread.',
    },
    'comm-revenue': {
      short: 'Fastest ethical revenue paths (advisory).',
      what: 'Opportunity comparison with effort and risk labels.',
      why: 'Revenue Mode surfaces blockers before spend.',
      source: 'GET /api/v1/lifeos/communication/revenue',
      trust: 'UNVERIFIED until pipeline metrics wired; scores may be null.',
      action: 'Run Site Builder dry-run for first dollar path.',
    },
    'comm-meeting': {
      short: 'Boardroom multi-agent discussion.',
      what: 'Lumin, Codex, BuilderOS, TSOS, Governance perspectives.',
      why: 'Surfaces disagreement before you commit.',
      source: 'POST /api/v1/lifeos/communication/meeting',
      trust: 'Each turn has own evidence_status; disagreements tagged.',
      action: 'Use when decision has tradeoffs across lanes.',
    },
    'comm-evidence': {
      short: 'Trust guard for this response.',
      what: 'VERIFIED / PARTIAL / UNVERIFIED + confidence %.',
      why: 'Never treat advisory council text as proven repo fact.',
      source: 'command_center_communication_guard on server',
      trust: 'See files_checked and warnings list.',
      action: 'Ask Audit mode to verify specific paths.',
    },
    'cc-mode': {
      short: 'How LifeOS frames your message.',
      what: 'Changes prompt structure and response format.',
      why: 'Same question gets different depth per mode.',
      source: 'Client modeFrame + server /communication/ask',
      trust: 'Mode label is metadata — not proof.',
      action: 'Pick Revenue or Audit when decisions need evidence.',
    },
    'cc-voice-record': {
      short: 'Browser speech-to-text.',
      what: 'Microphone → transcript; say "send" to submit.',
      why: 'Hands-free operator workflow.',
      source: 'Web Speech API in browser only',
      trust: 'Audio never uploaded; transcript is local until Send.',
      action: 'Grant mic permission; use Chrome for best support.',
    },
  };

  let longPressTimer = null;

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatHelp(h, expanded) {
    if (!expanded) return `<div>${escapeHtml(h.short)}</div>`;
    return `<div><strong>${escapeHtml(h.short)}</strong></div>
      <div class="comm-help-more"><b>What:</b> ${escapeHtml(h.what || '')}</div>
      <div class="comm-help-more"><b>Why:</b> ${escapeHtml(h.why || '')}</div>
      <div class="comm-help-more"><b>Source:</b> ${escapeHtml(h.source || '')}</div>
      <div class="comm-help-more"><b>Trust:</b> ${escapeHtml(h.trust || '')}</div>
      <div class="comm-help-more"><b>Action:</b> ${escapeHtml(h.action || '')}</div>`;
  }

  function showTooltip(el, helpKey, expanded) {
    let tip = document.getElementById('comm-help-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'comm-help-tooltip';
      tip.className = 'comm-help-tooltip';
      document.body.appendChild(tip);
    }
    const h = HELP[helpKey] || { short: helpKey };
    tip.innerHTML = formatHelp(h, expanded) +
      (!expanded && (h.what || h.why) ? '<button type="button" class="comm-help-more-btn">More</button>' : '');
    tip.querySelector('.comm-help-more-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showTooltip(el, helpKey, true);
    });
    const rect = el.getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
    tip.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  }

  function hideTooltip() {
    const tip = document.getElementById('comm-help-tooltip');
    if (tip) tip.style.display = 'none';
  }

  function initHelp(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-comm-help]').forEach((el) => {
      if (el.dataset.commHelpBound) return;
      el.dataset.commHelpBound = '1';
      const key = el.getAttribute('data-comm-help');
      if (!el.querySelector('.comm-help-icon')) {
        const icon = document.createElement('span');
        icon.className = 'comm-help-icon';
        icon.textContent = '?';
        icon.setAttribute('tabindex', '0');
        icon.setAttribute('aria-label', 'Help');
        el.appendChild(icon);
      }
      el.addEventListener('mouseenter', () => showTooltip(el, key, false));
      el.addEventListener('mouseleave', hideTooltip);
      el.addEventListener('focusin', () => showTooltip(el, key, false));
      el.addEventListener('focusout', hideTooltip);
      el.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
          e.preventDefault();
          showTooltip(el, key, true);
        }, 500);
      }, { passive: false });
      el.addEventListener('touchend', () => clearTimeout(longPressTimer));
      el.addEventListener('touchmove', () => clearTimeout(longPressTimer));
    });
  }

  global.LifeOSCommHelp = { HELP, initHelp, showTooltip, hideTooltip };
})(window);
