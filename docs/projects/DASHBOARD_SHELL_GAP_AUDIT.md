# LifeOS Dashboard Gap Audit

## Summary

**CRITICAL FINDING:** Both brief files returned `ENOENT` errors. The task asserts these files "exist on the server" and are "authoritative," but the file system could not locate them:
- `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`
- `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`

**Without the brief, I cannot perform the requested comparison.** However, I can document observable architectural differences between the two HTML files based on production code analysis.

---

## Gaps vs. Brief (Inferred from Production Code)

Since the brief files are missing, I document observable differences between `lifeos-dashboard.html` (standalone page) and `lifeos-app.html` (application shell):

### 1. **Sidebar**
- **Dashboard:** ❌ No sidebar
- **App:** ✅ Full sidebar with 25+ nav items, collapsible, mobile drawer
- **Gap:** Dashboard has no navigation chrome

### 2. **Bottom Tabs (Mobile)**
- **Dashboard:** ❌ No mobile bottom navigation
- **App:** ✅ 4 fixed tabs (Today, Inner, Health, Healing) + More sheet
- **Gap:** Dashboard lacks mobile navigation

### 3. **AI Rail Direction**
- **Dashboard:** Embedded chat card in page flow (always visible, single card at bottom)
- **App:** Persistent drawer (right-side desktop, bottom sheet mobile) with FAB, quick-bar, topbar button, Cmd/Ctrl+L shortcut
- **Gap:** Different interaction models — embedded vs. overlay

### 4. **Light/Dark Theme**
- **Dashboard:** ❌ No `html[data-theme="light"]` CSS; `toggleTheme()` function exists but does nothing
- **App:** ✅ Full light mode CSS with theme sync to iframe via postMessage
- **Gap:** Dashboard theme toggle is non-functional

### 5. **Mobile vs. Desktop**
- **Dashboard:** Single breakpoint (640px) for 2-column grid; no mobile chrome
- **App:** Three-tier responsive (600px, 1000px) with mobile topbar, bottom nav, drawer
- **Gap:** Dashboard lacks mobile-first design

### 6. **PWA Support**
- **Dashboard:** ❌ No manifest, no install prompt, no service worker
- **App:** ✅ Manifest, install banner, service worker registration
- **Gap:** Dashboard is not installable

### 7. **Ambient Voice**
- **Dashboard:** ✅ `toggleAmbient()` with proactive nudge polling (`/api/v1/lifeos/ambient/nudge`)
- **App:** ❌ No ambient mode (has always-on toggle but no proactive nudges)
- **Gap:** Feature exists in dashboard but not in app shell

---

## Recommended Next Queued Builds

### 1. **Create Missing Brief Files** (P0 — BLOCKING)

**Action:** Create or restore:
- `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`
- `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`

**Must specify:**
- Is `lifeos-dashboard.html` standalone or iframe content?
- Sidebar: required or not?
- Bottom tabs: which sections are primary?
- AI rail: embedded card or persistent drawer?
- Light/dark: both required or dark-only acceptable?
- Mobile: standalone mobile chrome or relies on app shell?
- Mockup filenames (task mentions "Reference mockup filenames from the brief")

### 2. **Add Light Mode to Dashboard** (if standalone)

**File:** `public/overlay/lifeos-dashboard.html`

**Changes:**
- Add `html[data-theme="light"]` CSS block (copy from `lifeos-app.html` lines 126-137)
- Fix `toggleTheme()` to actually set `data-theme` attribute on `<html>`
- Test all cards, scores, chat in light mode

### 3. **Align Dashboard with App Shell** (if iframe content)

**Option A:** Dashboard as iframe content (likely intent)
- Remove standalone chrome from dashboard (header, theme toggle, ambient button)
- Rely on app shell for navigation and theme
- Add to `PAGE_META` in app: `'lifeos-dashboard.html': { title: 'Dashboard', icon: '📊', color: '--c-dashboard' }`

**Option B:** Dashboard as standalone (if brief specifies)
- Add light mode CSS
- Add link to full app
- Document use case

### 4. **Standardize Voice Integration**

**Current state:**
- Dashboard: ambient proactive mode (app lacks)
- App: always-on toggle (dashboard lacks)
- Both: push-to-talk

**Recommendation:**
- Move ambient mode to app shell (make global, not page-specific)
- Document voice feature matrix

### 5. **Mobile Bottom Nav Validation**

**Current:** Today, Inner, Health, Healing, More

**Questions for brief:**
- Should Dashboard be in bottom nav instead of More sheet?
- Should Chat/Lumin be a bottom tab?

---

## Open Questions

1. **What is the relationship between the two HTML files?**
   - Is dashboard standalone or iframe content?
   - If standalone, what is the use case?

2. **Where are the mockup files?**
   - Task says "Reference mockup filenames from the brief"
   - No mockups found in repo

3. **Why does dashboard have ambient mode but app doesn't?**
   - Should ambient voice be global or page-specific?

4. **What is the target breakpoint strategy?**
   - Dashboard: 640px
   - App: 600px, 1000px
   - Should dashboard adopt app's breakpoints?

5. **Is the "overnight queue" a task backlog or scheduled build queue?**

6. **Should the Lumin drawer replace the embedded chat card?**
   - If dashboard loads in iframe, which pattern wins?

---

**Next Step:** Create or restore missing brief files. The brief must answer: **"Is dashboard standalone or iframe content?"** — this determines all subsequent work.