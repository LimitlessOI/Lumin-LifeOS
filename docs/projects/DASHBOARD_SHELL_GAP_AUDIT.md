# Gap Audit: LifeOS Dashboard vs. Builder Brief

## Summary

**Critical finding:** The builder brief files (`LIFEOS_DASHBOARD_BUILDER_BRIEF.md` and `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`) do **not exist** in the repository. Both file reads returned `ENOENT` (file not found).

Without the authoritative brief, this audit compares the two production HTML files against each other and infers likely design intent from their structure.

---

## Gaps vs. Inferred Brief

### 1. **lifeos-dashboard.html** (standalone page)
- **Structure:** Single-page dashboard with header, MITs, calendar, goals, scores, and chat
- **Theme toggle:** Present (☀︎ button in header)
- **Mobile layout:** Responsive via `@media` queries; no bottom nav (standalone page)
- **AI rail:** Chat component embedded at bottom of page (not a persistent drawer)
- **Ambient voice:** Toggle button present (`btn-ambient`) with proactive nudge logic
- **Light/dark intent:** Theme toggle implemented; CSS variables defined for both modes

### 2. **lifeos-app.html** (shell/chrome)
- **Structure:** Full app shell with sidebar, topbar, mobile bottom nav, iframe content area
- **Sidebar:** Collapsible, mini mode, user dropdown, nav groups
- **Bottom tabs (mobile):** 4 fixed tabs (Today, Inner, Health, Healing) + "More" sheet
- **AI rail:** Persistent Lumin drawer (right-side panel on desktop, bottom sheet on mobile) + FAB + quick-bar entry
- **Theme toggle:** Present in topbar, mobile topbar, and settings panel
- **Light/dark intent:** Full theme system with `lifeos-theme.js` and CSS variable overrides

### 3. **Concrete gaps** (inferred from typical dashboard brief patterns)

| Gap | lifeos-dashboard.html | lifeos-app.html | Likely Brief Intent |
|-----|----------------------|-----------------|---------------------|
| **Sidebar navigation** | ❌ None (standalone) | ✅ Full sidebar with sections | Brief likely specifies sidebar for app shell |
| **Bottom nav (mobile)** | ❌ None | ✅ 4 tabs + More | Brief likely specifies mobile bottom nav |
| **AI rail direction** | Embedded chat (bottom of page) | Persistent drawer (right/bottom) | Brief likely specifies drawer pattern (app.html is correct) |
| **Quick-bar entry** | ❌ None | ✅ One-tap Lumin strip above content | Brief likely specifies quick-bar for low-friction access |
| **FAB (floating action button)** | ❌ None | ✅ Bottom-right ◎ button | Brief likely specifies FAB for mobile |
| **Settings panel** | ❌ None | ✅ Right-side drawer with admin sections | Brief likely specifies settings in shell |
| **User pill/dropdown** | ❌ None | ✅ Sidebar top with avatar | Brief likely specifies user context in shell |
| **Section color accent** | ❌ None | ✅ Topbar bottom border changes per section | Brief likely specifies visual section identity |
| **Feature help popovers** | ❌ None | ✅ Hover/long-press help on nav items | Brief likely specifies contextual help |
| **Ambient sense opt-in** | ❌ None | ✅ Settings toggle + background hints | Brief likely specifies ambient sense as optional |
| **Install banner (PWA)** | ❌ None | ✅ Conditional banner after 2 visits | Brief likely specifies PWA promotion |
| **Voice status indicators** | Basic (mic button) | Full (topbar icon, drawer mic, interim preview) | Brief likely specifies rich voice UI |

---

## Recommended Next Queued Builds

1. **Restore or create `LIFEOS_DASHBOARD_BUILDER_BRIEF.md`**  
   - If it existed, recover from git history  
   - If not, generate from `lifeos-app.html` as the authoritative implementation  
   - Include: sidebar structure, bottom nav tabs, AI rail direction, theme intent, mobile vs desktop breakpoints

2. **Restore or create `LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`**  
   - Document any pending dashboard tasks (e.g., score tile tooltips, goal progress animations, calendar sync)

3. **Align `lifeos-dashboard.html` with app shell pattern** (if brief confirms drawer intent)  
   - Replace embedded chat with message to open full app  
   - Or: keep as lightweight standalone for direct `/overlay/lifeos-dashboard.html` access

4. **Add missing mockup references to brief**  
   - Task mentions "Reference mockup filenames from the brief" but brief is missing  
   - If mockups exist (e.g., Figma exports, PNGs), document their paths in the brief

5. **Validate mobile bottom nav tab order**  
   - Current: Today, Inner, Health, Healing, More  
   - Confirm this matches brief priority (or adjust based on usage data)

6. **Document section color mapping**  
   - `lifeos-app.html` has full `PAGE_META` with color vars  
   - `lifeos-dashboard.html` has partial accent colors (today, health, finance, mirror)  
   - Brief should specify canonical color per section

---

## Open Questions

1. **Is `lifeos-dashboard.html` intended as a standalone page or a deprecated artifact?**  
   - If standalone: document its use case (e.g., embeddable widget, quick-view URL)  
   - If deprecated: mark for removal or redirect to `/overlay/lifeos-app.html?page=lifeos-dashboard.html`

2. **What are the "mockup filenames" referenced in the task?**  
   - No image assets found in injected file list  
   - If mockups exist, where are they stored? (e.g., `docs/mockups/`, `public/assets/`)

3. **Should the brief specify desktop vs. mobile breakpoints explicitly?**  
   - Current: `600px` (mobile), `600-999px` (icon-only sidebar), `1000px+` (full sidebar)  
   - Confirm these match design intent

4. **Is the "overnight queue" a task backlog or a scheduled build queue?**  
   - If backlog: should it live in `docs/projects/` or `docs/tasks/`?  
   - If scheduled: should it integrate with `startup/register-schedulers.js`?

5. **Should `lifeos-dashboard.html` import the same theme system as `lifeos-app.html`?**  
   - Currently uses inline `lifeos-theme.js` but not `lifeos-theme-overrides.css`  
   - Confirm if standalone pages should share theme overrides

---

**Next step:** Locate or generate the missing brief files before making structural changes to either HTML file.

---

**ASSUMPTIONS:**
- The brief files were intended to exist but were never committed (or were deleted)
- `lifeos-app.html` represents the current authoritative design (full shell with drawer)
- `lifeos-dashboard.html` is either a legacy artifact or a lightweight standalone variant
- "Mockup filenames" refers to design assets not present in the injected file list