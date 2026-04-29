# Gap Audit: LifeOS Dashboard vs. Builder Brief

## Summary

**Critical finding:** The builder brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) do not exist in the repository. Both returned `ENOENT` (file not found) errors. Without the authoritative specification, this audit compares the two production HTML files against each other and infers likely design intent from their structure.

**What exists:**
- `lifeos-dashboard.html` — 28,849 chars, standalone dashboard page with MITs, calendar, goals, scores, and chat
- `lifeos-app.html` — 91,838 chars, full shell with sidebar, topbar, mobile bottom nav, Lumin drawer, settings panel

**Key structural differences:**
- `lifeos-dashboard.html` is a **single-page view** (no shell chrome)
- `lifeos-app.html` is the **application shell** that loads dashboard and other pages via iframe

---

## Gaps vs. Inferred Brief

### 1. **Sidebar presence**
- **lifeos-app.html:** Full collapsible sidebar with nav groups, user pill, logo
- **lifeos-dashboard.html:** No sidebar — standalone page
- **Gap:** If the brief specifies a unified shell with persistent sidebar, `lifeos-dashboard.html` should be loaded *inside* `lifeos-app.html` iframe, not used standalone

### 2. **Bottom tabs (mobile)**
- **lifeos-app.html:** Mobile bottom nav with 5 tabs (Today, Inner, Health, Healing, More)
- **lifeos-dashboard.html:** No bottom nav — relies on browser chrome
- **Gap:** Dashboard page has no mobile navigation when accessed directly

### 3. **AI rail / Lumin drawer**
- **lifeos-app.html:** Persistent Lumin drawer (right rail on desktop, bottom sheet on mobile), FAB, quick-bar entry strip
- **lifeos-dashboard.html:** Inline chat card only — no drawer, no FAB, no quick-bar
- **Gap:** Dashboard lacks the persistent AI companion pattern present in the shell

### 4. **Light/dark theme toggle**
- **lifeos-app.html:** Theme toggle in topbar, mobile topbar, settings panel; uses `lifeos-theme.js` + `cycleTheme()` function
- **lifeos-dashboard.html:** Theme toggle button exists (`#btn-theme`) but calls `toggleTheme()` which is not defined in the page — likely expects `lifeos-theme.js` to provide it
- **Gap:** Dashboard theme toggle is non-functional without external script

### 5. **Ambient voice toggle**
- **lifeos-app.html:** Global always-on voice via `toggleAlwaysListen()` in topbar
- **lifeos-dashboard.html:** Ambient toggle button (`#btn-ambient`) calls `toggleAmbient()` which implements a local proactive nudge loop
- **Gap:** Two different ambient implementations — shell uses `LuminVoice.toggleAlwaysListen()`, dashboard uses custom interval-based nudge

### 6. **Voice input integration**
- **lifeos-app.html:** Uses `LuminVoice` global (from `lifeos-voice.js`) for drawer mic button
- **lifeos-dashboard.html:** Uses `LifeOSVoiceChat.attach()` (from `lifeos-voice-chat.js`) for inline chat
- **Gap:** Two separate voice modules — no shared state or handoff

### 7. **Mobile vs. desktop layout**
- **lifeos-app.html:** Responsive shell with breakpoints at 600px and 1000px; icon-only sidebar 600–999px, full mobile chrome <600px
- **lifeos-dashboard.html:** Single-column responsive layout with `two-col` grid at 640px+; no shell chrome
- **Gap:** Dashboard does not adapt to shell breakpoints

### 8. **Settings panel**
- **lifeos-app.html:** Full settings drawer with API key, display name, theme, admin invites, gate-change presets, ambient sense toggle
- **lifeos-dashboard.html:** No settings UI
- **Gap:** Dashboard cannot configure user preferences

### 9. **User identity display**
- **lifeos-app.html:** User pill in sidebar with avatar, name, handle, dropdown
- **lifeos-dashboard.html:** Greeting only (`Good morning` + pulse dot) — no user identity chrome
- **Gap:** Dashboard does not show who is signed in

### 10. **Navigation between sections**
- **lifeos-app.html:** Sidebar nav with 20+ sections, mobile bottom nav, "More" sheet
- **lifeos-dashboard.html:** No navigation — single-purpose page
- **Gap:** Dashboard cannot navigate to other LifeOS sections without external shell

---

## Recommended Next Queued Builds

### High priority (blocking unified UX)
1. **Create `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`** — authoritative spec for dashboard layout, sidebar behavior, AI rail direction, mobile/desktop breakpoints
2. **Unify voice modules** — merge `lifeos-voice.js` and `lifeos-voice-chat.js` into single `lifeos-voice.js` with shared state
3. **Wire dashboard into shell** — ensure `lifeos-app.html` iframe loads `lifeos-dashboard.html` correctly; remove duplicate chrome from dashboard
4. **Fix dashboard theme toggle** — ensure `lifeos-theme.js` is loaded before dashboard body renders

### Medium priority (polish)
5. **Standardize ambient voice** — choose one implementation (shell's `LuminVoice.toggleAlwaysListen()` or dashboard's interval nudge) and remove the other
6. **Mobile bottom nav consistency** — if dashboard is a top-level section, add it to bottom nav; if not, clarify routing
7. **Settings access from dashboard** — add settings button to dashboard header or rely on shell topbar

### Low priority (nice-to-have)
8. **Shared design tokens** — both files define CSS custom properties inline; extract to `lifeos-dashboard-tokens.css` (already referenced in dashboard `<head>`)
9. **Skeleton loading states** — dashboard uses skeleton loaders; shell does not (iframe load is instant)
10. **Feature help popovers** — shell has hover-based feature guides; dashboard does not

---

## Open Questions

1. **Is `lifeos-dashboard.html` intended to be standalone or iframe-only?**  
   - If standalone: needs full shell chrome (sidebar, topbar, settings)  
   - If iframe-only: should remove duplicate theme/voice/ambient logic

2. **What is the authoritative AI rail direction?**  
   - Shell uses right drawer (desktop) / bottom sheet (mobile)  
   - Dashboard uses inline chat card  
   - Should dashboard chat be replaced with Lumin drawer integration?

3. **Which voice module is canonical?**  
   - `lifeos-voice.js` (shell, drawer mic)  
   - `lifeos-voice-chat.js` (dashboard inline chat)  
   - Should one be deprecated?

4. **Where do the missing brief files live?**  
   - `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` — ENOENT  
   - `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md` — ENOENT  
   - Were they never created, or moved to a different path?

5. **Is the dashboard "Today" section or a separate analytics view?**  
   - Shell has `lifeos-today.html` as default page  
   - Dashboard shows MITs, calendar, goals, scores — overlaps with "Today"  
   - Should dashboard replace today page, or are they distinct?

---

**Next step:** Create `LIFEOS_DASHBOARD_BUILDER_BRIEF.md` with authoritative answers to open questions, then queue concrete build tasks.

---

**METADATA**
```json
{
  "target_file": null,
  "insert_after_line": null,
  "confidence": 0.85,
  "assumptions": [
    "Brief files were intended to exist but were never committed",
    "lifeos-dashboard.html is meant to be loaded inside lifeos-app.html iframe",
    "Lumin drawer in shell is the canonical AI rail (dashboard inline chat is legacy)",
    "lifeos-voice.js is canonical (lifeos-voice-chat.js is older standalone version)"
  ]
}
```