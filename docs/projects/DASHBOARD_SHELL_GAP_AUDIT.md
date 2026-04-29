# Gap Audit: LifeOS Dashboard vs. Builder Brief

## Summary

**Critical finding:** The builder brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) returned `ENOENT` — they do not exist in the repository at the documented paths. This audit compares the two production HTML files (`lifeos-dashboard.html` and `lifeos-app.html`) against each other and infers intent from their structure, but **cannot validate against the authoritative brief** because it is missing.

---

## Gaps vs. Brief (Inferred from File Structure)

### 1. **Sidebar presence**
- **lifeos-app.html**: Full collapsible sidebar with nav groups, user pill, logo, collapse button
- **lifeos-dashboard.html**: **No sidebar** — standalone page layout
- **Gap**: If the brief specifies a unified shell with sidebar, `lifeos-dashboard.html` does not implement it.

### 2. **Bottom tabs (mobile nav)**
- **lifeos-app.html**: Mobile bottom nav with 5 tabs (Today, Inner, Health, Healing, More)
- **lifeos-dashboard.html**: **No bottom nav** — no mobile chrome
- **Gap**: If the brief requires mobile bottom tabs for dashboard, they are missing.

### 3. **AI rail / Lumin drawer**
- **lifeos-app.html**: Persistent Lumin drawer (right rail on desktop, bottom sheet on mobile), FAB, quick-bar entry strip, voice integration
- **lifeos-dashboard.html**: Inline chat card with voice controls, no drawer/rail
- **Gap**: If the brief specifies a **persistent AI rail** (not inline), `lifeos-dashboard.html` does not match.

### 4. **Light/dark theme toggle**
- **lifeos-app.html**: Theme toggle in topbar, mobile topbar, settings panel; uses `lifeos-theme.js`
- **lifeos-dashboard.html**: Theme toggle button in header; uses `lifeos-theme.js`
- **Status**: Both implement light/dark. No gap unless brief specifies unified placement.

### 5. **Mobile vs. desktop layout**
- **lifeos-app.html**: Responsive shell with mobile topbar, bottom nav, drawer transforms
- **lifeos-dashboard.html**: Single-column page with no mobile chrome (relies on viewport scaling)
- **Gap**: If the brief requires a **unified mobile shell**, `lifeos-dashboard.html` does not provide it.

### 6. **Ambient voice mode**
- **lifeos-app.html**: Global always-on voice toggle (`toggleAlwaysListen()`) in topbar
- **lifeos-dashboard.html**: Ambient toggle button (`toggleAmbient()`) with proactive nudge polling
- **Gap**: Two different implementations of ambient voice — unclear which matches brief intent.

### 7. **Settings panel**
- **lifeos-app.html**: Full settings panel with API key, name, theme, admin invites, gate-change presets, ambient sense toggle
- **lifeos-dashboard.html**: **No settings panel**
- **Gap**: If the brief requires settings access from dashboard, it is missing.

### 8. **User pill / account UI**
- **lifeos-app.html**: User pill in sidebar with dropdown (Settings, Sign Out)
- **lifeos-dashboard.html**: **No user pill or account UI**
- **Gap**: If the brief requires account controls on dashboard, they are missing.

### 9. **Section color accent**
- **lifeos-app.html**: Dynamic `--section-color` CSS variable updated per page, accent line on topbar
- **lifeos-dashboard.html**: Static accent borders on cards (today, health, finance, mirror)
- **Status**: Both use color accents; no gap unless brief specifies unified dynamic system.

### 10. **Feature help popovers**
- **lifeos-app.html**: Hover-triggered feature help popovers on nav items (desktop only)
- **lifeos-dashboard.html**: **No feature help**
- **Gap**: If the brief requires contextual help on dashboard, it is missing.

---

## Recommended Next Queued Builds

1. **Restore builder brief files** — `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md` are missing; cannot validate without them.

2. **Unify shell chrome** — If the brief specifies a single shell, decide:
   - Does `lifeos-dashboard.html` become a **page inside lifeos-app.html** (iframe)?
   - Or does `lifeos-dashboard.html` **adopt the app shell** (sidebar, bottom nav, Lumin drawer)?

3. **Standardize AI rail direction** — Two implementations exist:
   - Inline chat card (dashboard)
   - Persistent drawer (app shell)
   - **Decision required**: Which is the canonical pattern?

4. **Add mobile chrome to dashboard** — If dashboard is standalone, add:
   - Mobile topbar with menu button
   - Bottom nav or quick-access strip
   - Responsive layout transforms

5. **Add settings access to dashboard** — If dashboard is entry point, add:
   - User pill or settings button
   - Theme toggle
   - Sign-out flow

6. **Consolidate ambient voice** — Two different implementations:
   - `toggleAmbient()` with proactive nudge polling (dashboard)
   - `toggleAlwaysListen()` with global voice routing (app shell)
   - **Decision required**: Merge or deprecate one.

7. **Add feature help to dashboard** — If contextual help is required, wire `LIFEOS_FEATURE_GUIDES` and hover popovers.

---

## Open Questions

1. **Is `lifeos-dashboard.html` intended to be standalone or embedded?**
   - If standalone: needs full chrome (sidebar, bottom nav, settings)
   - If embedded: should be loaded inside `lifeos-app.html` iframe

2. **What is the authoritative AI rail pattern?**
   - Inline chat card (current dashboard)
   - Persistent drawer (current app shell)
   - Hybrid (quick-bar + drawer)?

3. **Where are the builder brief files?**
   - `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` — ENOENT
   - `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md` — ENOENT
   - Were they moved, renamed, or never committed?

4. **Should dashboard adopt the app shell's section color system?**
   - Current: static accent borders per card
   - App shell: dynamic `--section-color` CSS variable
   - Unified system would simplify theming.

5. **Is the dashboard the primary entry point or a sub-page?**
   - If primary: needs full navigation and account UI
   - If sub-page: can rely on shell chrome

---

**Next step:** Locate or regenerate the builder brief files to validate these inferred gaps against the authoritative specification.

---

**METADATA**
```json
{
  "target_file": null,
  "insert_after_line": null,
  "confidence": 0.65,
  "note": "Audit completed but builder brief files are missing (ENOENT). Gaps are inferred from structural comparison only. Confidence is moderate because authoritative spec is unavailable."
}
```