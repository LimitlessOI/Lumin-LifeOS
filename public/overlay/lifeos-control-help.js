(function initLifeOSControlHelpModule() {
  const MOBILE_MEDIA = '(hover: none), (pointer: coarse)';
  const STYLE_ID = 'lifeos-control-help-style';
  const POPOVER_ID = 'lifeos-control-help-popover';
  let hideTimer = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .lifeos-control-help-popover {
        position: fixed;
        z-index: 2400;
        width: min(340px, calc(100vw - 24px));
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid rgba(91, 106, 245, 0.26);
        background: rgba(11, 11, 18, 0.97);
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.38);
        color: #e8e8f0;
        opacity: 0;
        transform: translateY(6px);
        pointer-events: none;
        transition: opacity 0.14s ease, transform 0.14s ease;
      }
      .lifeos-control-help-popover.show {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .lifeos-control-help-title {
        font-size: 13px;
        font-weight: 600;
        color: #f5f6ff;
        margin-bottom: 6px;
      }
      .lifeos-control-help-body {
        font-size: 12px;
        line-height: 1.55;
        color: #b6b8d0;
      }
      .lifeos-control-help-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        font-size: 12px;
        color: #8ea3ff;
        text-decoration: none;
      }
      .lifeos-control-help-link:hover { color: #c3d0ff; }
    `;
    document.head.appendChild(style);
  }

  function ensurePopover() {
    let pop = document.getElementById(POPOVER_ID);
    if (pop) return pop;
    pop = document.createElement('div');
    pop.id = POPOVER_ID;
    pop.className = 'lifeos-control-help-popover';
    pop.setAttribute('aria-hidden', 'true');
    pop.innerHTML = `
      <div class="lifeos-control-help-title" id="${POPOVER_ID}-title"></div>
      <div class="lifeos-control-help-body" id="${POPOVER_ID}-body"></div>
      <a class="lifeos-control-help-link" id="${POPOVER_ID}-link" href="#">Open full guide ↗</a>
    `;
    pop.addEventListener('mouseenter', cancelHide);
    pop.addEventListener('mouseleave', hideSoon);
    document.body.appendChild(pop);
    return pop;
  }

  function currentPageName() {
    const pathname = String(location.pathname || '');
    const page = pathname.split('/').pop() || 'lifeos-app.html';
    if (page === 'lifeos') return 'lifeos-app.html';
    return page;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cancelHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  }

  function hideSoon() {
    cancelHide();
    hideTimer = setTimeout(hideNow, 110);
  }

  function hideNow() {
    const pop = document.getElementById(POPOVER_ID);
    if (!pop) return;
    pop.classList.remove('show');
    pop.setAttribute('aria-hidden', 'true');
  }

  function showHelp(el, featureKey, controlKey, help) {
    if (!help) return;
    const pop = ensurePopover();
    cancelHide();
    document.getElementById(`${POPOVER_ID}-title`).textContent = help.title || el.getAttribute('aria-label') || el.textContent.trim() || 'Control';
    document.getElementById(`${POPOVER_ID}-body`).innerHTML = escapeHtml(help.short || help.details?.[0] || 'Open the full guide for more detail.');
    const link = document.getElementById(`${POPOVER_ID}-link`);
    link.href = `/overlay/lifeos-feature.html?feature=${encodeURIComponent(featureKey)}&control=${encodeURIComponent(controlKey)}`;

    const rect = el.getBoundingClientRect();
    const pad = 12;
    const vw = window.innerWidth || document.documentElement.clientWidth || 1440;
    const vh = window.innerHeight || document.documentElement.clientHeight || 900;
    let left = rect.left;
    let top = rect.bottom + 10;
    pop.style.left = '0px';
    pop.style.top = '0px';
    pop.classList.add('show');
    pop.setAttribute('aria-hidden', 'false');
    const popRect = pop.getBoundingClientRect();
    if (left + popRect.width > vw - pad) left = vw - popRect.width - pad;
    if (left < pad) left = pad;
    if (top + popRect.height > vh - pad) top = Math.max(pad, rect.top - popRect.height - 10);
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  }

  function attachControlHelp(el, featureKey, controls) {
    const controlKey = String(el.dataset.helpKey || '').trim();
    if (!controlKey || el.dataset.helpBound === '1') return;
    const help = controls[controlKey];
    if (!help) return;
    el.dataset.helpBound = '1';
    const onEnter = () => showHelp(el, featureKey, controlKey, help);
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('focus', onEnter);
    el.addEventListener('mouseleave', hideSoon);
    el.addEventListener('blur', hideSoon);
  }

  function initLifeOSControlHelp(options = {}) {
    if (window.matchMedia && window.matchMedia(MOBILE_MEDIA).matches) return;
    const guides = window.LIFEOS_FEATURE_GUIDES || {};
    const featureKey = options.feature || currentPageName();
    const guide = guides[featureKey];
    if (!guide || !guide.controls) return;
    ensureStyle();
    ensurePopover();
    document.querySelectorAll('[data-help-key]').forEach((el) => attachControlHelp(el, featureKey, guide.controls));
  }

  window.initLifeOSControlHelp = initLifeOSControlHelp;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initLifeOSControlHelp());
  } else {
    initLifeOSControlHelp();
  }
})();
