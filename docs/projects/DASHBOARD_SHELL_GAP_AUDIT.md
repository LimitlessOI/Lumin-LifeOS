# Gap Audit: LifeOS Dashboard vs. Builder Brief

## Summary

**Critical finding:** The builder brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) do **not exist** on the server. Both returned `ENOENT` (file not found). This makes a spec-compliant gap audit impossible.

However, I can audit the two production HTML files against **common dashboard design patterns** and **internal consistency** between `lifeos-dashboard.html` (standalone) and `lifeos-app.html` (shell).

---

## Gaps vs. Inferred Brief (Best-Effort Analysis)

### 1. **Sidebar presence mismatch**
- **`lifeos-dashboard.html`**: No sidebar — standalone page with centered `.page` container
- **`lifeos-app.html`**: Full sidebar navigation (`.sidebar`) with collapsible mini mode
- **Gap**: If the brief intended a unified chrome, the standalone dashboard lacks it. If the brief intended a focused single-page view, `lifeos-app.html` may be over-scaffolded for dashboard use.

### 2. **Bottom tabs (mobile navigation)**
- **`lifeos-dashboard.html`**: No bottom nav — relies on `padding-bottom: calc(24px + env(safe-area-inset-bottom))` for safe area only
- **`lifeos-app.html`**: Full `.mobile-bottomnav` with 5 tabs (Today, Inner, Health, Healing, More)
- **Gap**: Dashboard is not accessible via bottom nav in the shell. If the brief called for "Dashboard" as a primary mobile destination, it's missing from the tab bar.

### 3. **AI rail / Lumin integration**
- **`lifeos-dashboard.html`**: Inline chat card (`.card.accent-border-mirror`) with embedded messages, typing indicator, and voice controls
- **`lifeos-app.html`**: Persistent drawer (`.lumin-drawer`) + FAB (`.lumin-fab`) + quick bar (`.lumin-quick-bar`)
- **Gap**: Two different interaction models. If the brief specified "AI rail direction" (e.g., always-visible vs. drawer), one implementation may be non-compliant. The dashboard's inline chat is **not** a rail — it's a card in the flow.

### 4. **Light/dark theme intent**
- **`lifeos-dashboard.html`**: Theme toggle button (`#btn-theme`) with `toggleTheme()` function (not shown in injected code, but referenced)
- **`lifeos-app.html`**: Full theme system with `cycleTheme()`, `setTheme()`, and `applyThemeUi()` — syncs across iframe and localStorage
- **Gap**: Dashboard theme toggle is **not wired** to the shell's theme system. If the brief required synchronized theming, the standalone page will drift.

### 5. **Mobile vs. desktop layout**
- **`lifeos-dashboard.html`**: Single responsive layout with `@media (min-width: 640px)` for `.two-col` grid — no separate mobile chrome
- **`lifeos-app.html`**: Distinct mobile topbar (`.mobile-topbar`) and bottom nav, hidden on desktop
- **Gap**: Dashboard does not adapt to the shell's mobile chrome. If loaded in the shell's iframe, it will render its own header/controls, creating duplicate UI.

### 6. **Ambient voice mode**
- **`lifeos-dashboard.html`**: `#btn-ambient` with `toggleAmbient()` — polls `/api/v1/lifeos/ambient/nudge` every 2 minutes when active
- **`lifeos-app.html`**: `toggleAlwaysListen()` via `LuminVoice.toggleAlwaysListen()` — global voice input, not proactive nudges
- **Gap**: Two different "ambient" concepts. If the brief specified one canonical ambient mode, both files implement conflicting versions.

### 7. **Section color accent**
- **`lifeos-dashboard.html`**: No section color system — uses fixed accent colors per card (e.g., `--c-today`, `--c-health`)
- **`lifeos-app.html`**: Dynamic `--section-color` CSS variable updated on navigation, applied to topbar `::after` pseudo-element
- **Gap**: Dashboard does not participate in the shell's section color theming.

### 8. **Voice chat integration**
- **`lifeos-dashboard.html`**: Loads `/shared/lifeos-voice-chat.js` (non-module IIFE) and initializes `LifeOSVoiceChat.attach()`
- **`lifeos-app.html`**: Loads `/overlay/lifeos-voice.js` and uses `LuminVoice.startForInput()` + `toggleAlwaysListen()`
- **Gap**: Two different voice libraries. If the brief required a single voice system, one is non-compliant.

### 9. **Skeleton loading states**
- **`lifeos-dashboard.html`**: Inline `.skeleton` divs with shimmer animation for MITs, calendar, goals, scores
- **`lifeos-app.html`**: No skeleton states in shell chrome (content skeletons are iframe responsibility)
- **Gap**: If the brief required consistent loading UX, the shell does not provide it.

### 10. **Feature help popover**
- **`lifeos-dashboard.html`**: No feature help system
- **`lifeos-app.html`**: `.feature-help-popover` with hover-triggered guides (desktop only, `@media (min-width: 1000px)`)
- **Gap**: Dashboard lacks contextual help. If the brief required help on all surfaces, it's missing.

---

## Recommended Next Queued Builds

1. **Locate or regenerate the builder brief** — `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` must exist for authoritative gap analysis.
2. **Unify theme system** — Wire `lifeos-dashboard.html` to shell theme via `postMessage` or shared `lifeos-theme.js`.
3. **Decide on AI rail model** — Inline chat card vs. persistent drawer. If drawer is canonical, remove inline chat from dashboard.
4. **Add Dashboard to mobile bottom nav** — If it's a primary destination, replace one of the 4 fixed tabs or add to "More" sheet.
5. **Consolidate voice libraries** — Merge `lifeos-voice-chat.js` and `lifeos-voice.js` into a single module with consistent API.
6. **Section color for dashboard** — If dashboard is loaded in shell iframe, it should respect `--section-color` from parent.
7. **Ambient mode spec** — Document whether "ambient" means proactive nudges (dashboard) or always-on voice (shell), then remove the other.
8. **Feature help for dashboard** — Add popover or inline help for MITs, goals, scores, and chat.

---

## Open Questions

1. **Is `lifeos-dashboard.html` intended to be standalone or iframe-embedded?** — Current implementation assumes standalone (own header, no shell integration).
2. **What does "AI rail direction" mean in the missing brief?** — Persistent sidebar rail, drawer, inline card, or something else?
3. **Should Dashboard appear in mobile bottom nav?** — If yes, which tab does it replace?
4. **Are the two voice systems (`lifeos-voice-chat.js` vs. `lifeos-voice.js`) intentionally separate?** — If not, which is canonical?
5. **Does the brief specify mockup filenames?** — Cannot verify without the brief file.

---

**Confidence: 0.4** — Gap analysis is speculative without the authoritative brief. Injected file bodies prove the brief files are missing, contradicting the task's assumption that they exist.

---

**ASSUMPTIONS:**
- The brief intended a unified dashboard experience across standalone and shell contexts.
- "AI rail" refers to a persistent or easily-accessible chat interface (not buried in page scroll).
- Light/dark theme should be synchronized across all surfaces.
- Mobile bottom nav should include all primary destinations.

---