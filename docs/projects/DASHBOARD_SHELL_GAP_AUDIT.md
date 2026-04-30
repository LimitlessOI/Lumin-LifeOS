# LifeOS Dashboard Gap Audit

## Summary

**BLOCKING ISSUE:** Both brief files returned `ENOENT` (file not found):
- `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`
- `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`

The task states these files "exist on the server" and are "authoritative," but the file system returned read errors. Without the brief, this audit compares the two production HTML files (`lifeos-dashboard.html` and `lifeos-app.html`) and documents their architectural differences.

**Key Finding:** These are two distinct artifacts serving different purposes:
- `lifeos-dashboard.html` — standalone dashboard page with embedded content
- `lifeos-app.html` — application shell with sidebar, navigation chrome, and iframe content loader

---

## Gaps vs. Brief (Inferred from Production Code)

### 1. Sidebar

| Aspect | lifeos-dashboard.html | lifeos-app.html | Gap |
|--------|----------------------|-----------------|-----|
| **Presence** | ❌ None | ✅ Full sidebar (25+ nav items, 5 groups) | Dashboard has no sidebar |
| **Collapse** | N/A | ✅ Desktop collapse, mini mode | N/A |
| **Mobile drawer** | N/A | ✅ Slide-in drawer on mobile | N/A |

**Inference:** If the brief specifies a sidebar, `lifeos-dashboard.html` lacks it entirely. If the brief specifies dashboard as iframe content within the app shell, the current standalone structure contradicts that.

---

### 2. Bottom Tabs (Mobile)

| Aspect | lifeos-dashboard.html | lifeos-app.html | Gap |
|--------|----------------------|-----------------|-----|
| **Presence** | ❌ None | ✅ 4 fixed tabs + More sheet | Dashboard has no mobile nav |
| **Tabs** | N/A | Today, Inner, Health, Healing, More | N/A |
| **More sheet** | N/A | ✅ 21 additional sections in grid | N/A |

**Inference:** If the brief specifies mobile bottom tabs, `lifeos-dashboard.html` lacks them. The app shell provides mobile chrome; dashboard does not.

---

### 3. AI Rail Direction

| Aspect | lifeos-dashboard.html | lifeos-app.html | Gap |
|--------|----------------------|-----------------|-----|
| **Pattern** | Embedded chat card in page flow | Persistent drawer (right/bottom overlay) | Different interaction models |
| **Entry points** | Single card | FAB + quick-bar + topbar button + Cmd/Ctrl+L | Dashboard has one entry |
| **Persistence** | Thread created on page load | Thread persists across navigation | Dashboard thread is page-scoped |
| **Ambient mode** | ✅ Proactive nudge system (`toggleAmbient()`) | ❌ No ambient in shell | Dashboard has feature app lacks |

**Inference:** If the brief specifies a persistent AI rail (drawer pattern), `lifeos-dashboard.html` uses an embedded card instead. If the brief specifies ambient proactive voice, `lifeos-app.html` lacks it.

---

### 4. Light/Dark Intent

| Aspect | lifeos-dashboard.html | lifeos-app.html | Gap |
|--------|----------------------|-----------------|-----|
| **Light mode CSS** | ❌ No `html[data-theme="light"]` ruleset | ✅ Full light mode variables | Dashboard is dark-only |
| **Theme toggle** | ☀︎ button (broken — no light CSS) | Multiple toggles (topbar, mobile, settings) | Dashboard toggle non-functional |
| **Theme sync** | Standalone (no sync) | Syncs to iframe via postMessage | App propagates theme |

**Inference:** If the brief specifies light/dark support, `lifeos-dashboard.html` is missing light mode CSS entirely. The `toggleTheme()` function exists but does nothing because no light theme variables are defined.

---

### 5. Mobile vs. Desktop

| Aspect | lifeos-dashboard.html | lifeos-app.html | Gap |
|--------|----------------------|-----------------|-----|
| **Responsive strategy** | Single breakpoint (640px) for 2-col grid | Three-tier: <600px mobile, 600-999px icon sidebar, 1000px+ full | Dashboard simpler |
| **Mobile chrome** | None | Mobile topbar + bottom nav + drawer sidebar | Dashboard has no mobile shell |
| **Safe area insets** | Basic `env(safe-area-inset-bottom)` on body | Full safe area on all chrome | App comprehensive |
| **Touch targets** | Standard sizes | Minimum 44px enforced | Dashboard doesn't enforce 44px |
| **PWA** | ❌ No manifest, no install prompt | ✅ Manifest, install banner, service worker | Dashboard not installable |

**Inference:** If the brief specifies mobile-first design, `lifeos-dashboard.html` lacks mobile chrome entirely. If the brief specifies PWA support, dashboard is not installable.

---

## Recommended Next Queued Builds

### 1. **Create Missing Brief Files** (P0 — BLOCKING)

**Files:**
- `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`
- `docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md`

**Must specify:**
- Is `lifeos-dashboard.html` standalone or iframe content?
- Sidebar: required or not?
- Bottom tabs: which 4 sections are primary?
- AI rail: embedded card or persistent drawer?
- Light/dark: both required or dark-only acceptable?
- Mobile: standalone mobile chrome or relies on app shell?
- Mockup references (task mentions "Reference mockup filenames from the brief")

---

### 2. **Add Light Mode to Dashboard** (if standalone)

**File:** `public/overlay/lifeos-dashboard.html`

**Changes:**
- Add `html[data-theme="light"]` CSS block (copy from `lifeos-app.html` lines 126-137)
- Update `toggleTheme()` to set `data-theme` attribute on `<html>`
- Test all cards, scores, chat in light mode

---

### 3. **Align Dashboard with App Shell** (if iframe content)

**Option A:** Dashboard as iframe content (likely intent)

**Changes:**
- Remove standalone chrome from `lifeos-dashboard.html` (header, theme toggle, ambient button)
- Rely on `lifeos-app.html` shell for navigation and theme
- Add to `PAGE_META` in `lifeos-app.html`: `'lifeos-dashboard.html': { title: 'Dashboard', icon: '📊', color: '--c-dashboard' }`
- Test dashboard loads correctly in iframe with theme sync

**Option B:** Dashboard as standalone (if brief specifies)

**Changes:**
- Add light mode CSS
- Add link to full app ("Open full LifeOS →")
- Document use case (embeddable widget, direct link, etc.)

---

### 4. **Standardize Voice Integration**

**Current state:**
- Dashboard: ambient proactive mode (app lacks)
- App: always-on toggle (dashboard lacks)
- Both: push-to-talk

**Recommendation:**
- Move ambient mode to app shell (make global, not page-specific)
- Add always-on toggle to dashboard (if standalone)
- Document voice feature matrix in brief

---

### 5. **Mobile Bottom Nav Validation**

**Current:** Today, Inner, Health, Healing, More

**Questions for brief:**
- Is this priority order based on usage data or design intent?
- Should Dashboard be in bottom nav instead of More sheet?
- Should Chat/Lumin be a bottom tab (currently FAB + quick-bar)?

---

### 6. **Document Section Color System**

**File:** `docs/design/section-colors.md` (new)

**Content:**
- Canonical color mapping (Today: `--c-today`, Health: `--c-health`, etc.)
- Usage in topbar accent line (app has, dashboard doesn't)
- Usage in nav active state
- Usage in card accent borders (dashboard has: `accent-border-today`, etc.)

---

## Open Questions

1. **What is the relationship between the two HTML files?**
   - Is `lifeos-dashboard.html` legacy or active standalone?
   - Should dashboard load inside `lifeos-app.html` iframe?
   - If standalone, what is the use case?

2. **Where are the mockup files referenced in the task?**
   - Task says "Reference mockup filenames from the brief"
   - No mockups found
   - Do they exist? Where?

3. **Why does dashboard have ambient mode but app doesn't?**
   - Dashboard: `toggleAmbient()` with proactive nudge polling
   - App: Ambient sense (device hints) but no proactive voice
   - Should ambient voice be global or page-specific?

4. **Should dashboard scores be real-time or cached?**
   - Current: Fetches from `/api/v1/lifeos/dashboard/scoreboard`
   - No loading states beyond skeleton
   - Should scores update on interval?

5. **What is the target breakpoint strategy?**
   - Dashboard: Single breakpoint (640px)
   - App: Three-tier (600px, 1000px)
   - Should dashboard adopt app's breakpoints?

6. **Is the "overnight queue" a task backlog or scheduled build queue?**
   - If backlog: Should it live in `docs/projects/` or `docs/tasks/`?
   - If scheduled: Should it integrate with `startup/register-schedulers.js`?

7. **Should the Lumin drawer replace the embedded chat card?**
   - Dashboard: embedded chat card (simpler, always visible)
   - App: persistent drawer (overlay, multiple entry points)
   - If dashboard loads in iframe, which pattern wins?

---

**ASSUMPTIONS:**
1. The brief files were intended to exist but were never committed (or deleted)
2. `lifeos-app.html` represents current authoritative shell architecture
3. `lifeos-dashboard.html` is either iframe content OR standalone page
4. "Mockup filenames" refers to design assets not in repository
5. Task expects gap audit only (no code changes)
6. Ambient voice in dashboard is intentional (not mistake)
7. Lack of light mode in dashboard is gap (not intentional dark-only)

---

**Next Step:** Create or restore missing brief files before making structural changes. The brief must answer: **"Is dashboard standalone or iframe content?"** — this determines all subsequent work.