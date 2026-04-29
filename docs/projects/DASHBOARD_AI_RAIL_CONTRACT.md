# Persistent AI Rail — Technical Contract

## Contract

### What it is
A **persistent, dockable AI conversation strip** that lives at the top or bottom of the LifeOS shell (`lifeos-app.html`), providing always-available access to Lumin without navigating away from the current page.

### Core behaviors
1. **Collapsed state**: One-line strip showing last message preview + input field
2. **Expanded state**: Full transcript (last 20 messages), scrollable, with input
3. **Docking**: User can dock top or bottom; persists in `localStorage`
4. **Voice/text parity**: Both input modes work identically; voice uses Web Speech API
5. **Read-aloud**: Assistant responses can be spoken via TTS (opt-in per message or auto-on in voice mode)
6. **Persistence**: Rail state (open/closed, dock position, thread ID) survives page navigation within shell

### Relationship to existing entry points
- **Lumin drawer** (`lifeos-app.html` bottom-right FAB): Remains as-is; opens full-height overlay
- **Full chat page** (`lifeos-chat.html`): Remains primary power-user interface
- **Rail**: New third entry point — lightweight, non-blocking, always visible when enabled
- **Coordination**: All three share the same thread via `luminState.threadId` in `lifeos-app.html` session state

### Technical surface
- **New DOM**: `<div id="lumin-rail">` injected into `lifeos-app.html` body, positioned via CSS `position: fixed`
- **New CSS**: `.lumin-rail`, `.lumin-rail-collapsed`, `.lumin-rail-expanded`, `.lumin-rail-dock-top`, `.lumin-rail-dock-bottom`
- **New JS module**: `public/overlay/lumin-rail.js` (ESM, imported by `lifeos-app.html`)
- **State keys**: `lifeos_rail_enabled`, `lifeos_rail_dock`, `lifeos_rail_expanded` (all `localStorage`)
- **API reuse**: Same `/api/v1/lifeos/chat/threads/:id/messages` (POST) and `/stream` endpoints
- **Voice reuse**: Existing `VM` (VoiceManager) pattern from `lifeos-chat.html`, adapted for rail

---

## Non-goals

1. **Not a replacement** for drawer or full chat — rail is for quick access, not deep work
2. **No new backend routes** — reuses existing chat API
3. **No new DB tables** — thread/message storage unchanged
4. **No mobile-first design** — rail is desktop-optimized; mobile keeps drawer/full page
5. **No multi-thread UI in rail** — always shows active thread; switch via drawer or full chat
6. **No rich formatting in collapsed preview** — plain text only, truncated to ~60 chars

---

## Phases

### Phase 1: Static rail (collapsed only, no voice)
**Deliverables**:
- `lumin-rail.js` module with `init()`, `toggle()`, `setDock(position)`
- Collapsed strip HTML/CSS (input field, send button, last message preview)
- `localStorage` persistence for `enabled` and `dock` position
- Text input → POST to `/messages` → append to transcript (hidden in collapsed state)
- Toggle button in shell header (next to settings gear)

**Verification**:
- `npm run dev` → open shell → toggle rail → type message → see response preview
- Refresh page → rail state persists
- Switch dock position → layout updates

### Phase 2: Expand/collapse + transcript
**Deliverables**:
- Expand button in collapsed strip (chevron icon)
- Expanded state shows last 20 messages (scrollable, same bubble styling as drawer)
- Collapse button in expanded header
- Auto-scroll to bottom on new message
- Typing indicator (reuse `.typing-bubble` from `lifeos-chat.html`)

**Verification**:
- Expand rail → see full transcript
- Send message while expanded → new bubble appears, auto-scrolls
- Collapse → returns to one-line strip

### Phase 3: Voice input + read-aloud
**Deliverables**:
- Mic button in rail input (reuses `VM.setMode('voice-in')` logic)
- Voice input → auto-send after silence (same 1.5s timeout as full chat)
- Read-aloud toggle in expanded header (speaker icon)
- When enabled, assistant responses auto-play via TTS
- Voice mode pauses recognition during TTS playback (anti-feedback)

**Verification**:
- Click mic → speak → message sends after silence
- Enable read-aloud → send text message → response is spoken
- Voice mode + read-aloud → full 2-way conversation without typing

### Phase 4: Polish + conflict interrupt integration
**Deliverables**:
- Conflict interrupt check on rail input (reuse `/api/v1/lifeos/conflict/interrupt/check`)
- Toast notification if tension detected (same as full chat)
- Keyboard shortcut: `Cmd/Ctrl+Shift+L` focuses rail input (distinct from `Cmd+L` for drawer)
- Animation: rail slides in/out smoothly (CSS transition)
- Badge on toggle button when new message arrives while rail is collapsed

**Verification**:
- Type tense message → see interrupt toast
- `Cmd+Shift+L` → rail input focused
- Close rail → send message from another device → badge appears on toggle button

---

## Open questions

1. **Dock position default**: Top or bottom? (Suggest bottom to avoid blocking nav)
2. **Transcript length in expanded state**: 20 messages sufficient, or make configurable?
3. **Voice mode persistence**: Should `voice-in` / `voice-2way` state persist across sessions, or reset to text?
4. **Conflict with drawer**: If drawer is open and rail is toggled, should drawer auto-close? (Suggest yes)
5. **Mobile behavior**: Hide rail entirely on `max-width: 600px`, or show collapsed strip only?
6. **Thread switching**: Should rail have a minimal thread picker (dropdown), or always require full chat for switching?
7. **Read-aloud voice selection**: Reuse `v-voice-select` from full chat settings, or default voice only in rail?
8. **Streaming support**: Should rail use `/stream` endpoint for token-by-token display, or batch-only for simplicity in Phase 1-2?

---

**Confidence**: 0.85 (high — spec is grounded in existing patterns; open questions are UX preferences, not blockers)

---

**ASSUMPTIONS**:
- Rail shares `luminState.threadId` with drawer (no separate thread management)
- Voice API availability checked via `window.SpeechRecognition` (graceful degradation if unsupported)
- TTS uses `window.speechSynthesis` (same as full chat `VM.speak()`)
- Rail does not support `/plan`, `/draft`, `/queue` shortcuts (those remain full-chat-only)
- Conflict interrupt settings (`interruptSettings`) are global, shared across drawer/rail/full chat

---