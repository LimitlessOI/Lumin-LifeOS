# AMENDMENT 06 — Game Publisher
**Status:** LIVE
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
AI generates complete, playable Phaser.js browser games from a text description. No build step — games are pure HTML + JS files deployed to `/public/games/{gameId}/`. Uses the "Closed World" constraint prompt pattern for highest LLM reliability.

**Mission:** Turn any game idea into a playable browser game in under 2 minutes.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| Game-as-a-service for businesses | $200–$500 | Branded mini-games for marketing campaigns |
| Educational game packs | $97–$297 | Topic-specific quiz/learning games |
| Internal tooling | No direct revenue | Demonstrates platform capability |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `services/game-publisher.js` | Full pipeline: prompt → AI code → validate → deploy |
| `server.js` (lines 5566–5634) | Game endpoints — PARTIALLY EXTRACTED |

### Game Types Supported
`platformer` | `runner` | `puzzle` | `card` | `arcade` | `rpg` | `quiz` | `clicker`

### Deployed Files
- Games at: `/public/games/{gameId}/index.html`
- Metadata: `/public/games/{gameId}/meta.json`
- Served at: `https://yourdomain.com/games/{gameId}`

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/games/build` | Build + publish a game |
| POST | `/api/v1/games/generate` | Alias with legacy format |
| GET | `/api/v1/games/list` | List all published games |

### "Closed World" Prompt Pattern
Forces AI to output a single complete HTML file:
1. One file only — `<!DOCTYPE html>` to `</html>`
2. Zero build step — opens in Chrome directly
3. One CDN only — Phaser 3 (cdn.jsdelivr.net)
4. No npm, no ES module imports
5. End sentinel: `GENERATION_COMPLETE` after `</html>`

### Validation Checks
- Contains `Phaser` reference
- Contains `new Phaser.Game` instantiation
- Contains scene methods (`preload`/`create`)
- Code length > 200 chars
- Balanced braces (within ±5)

---

## CURRENT STATE
- **KNOW:** `services/game-publisher.js` is complete and wired
- **KNOW:** Games served at `/games/*` static route
- **KNOW:** Validation + repair loop implemented
- **THINK:** `gpt-4o` at 4096 tokens may truncate complex games — may need 8k tokens
- **DON'T KNOW:** Whether games have been tested end-to-end on Railway

---

## REFACTOR PLAN
1. Extract game endpoints from server.js → `routes/game-routes.js`
2. Add game gallery page at `/games/` listing all published games
3. Add play count tracking (increment `play_count` on first load)
4. Add `games` DB table sync (currently only stored in `meta.json`, not persisted to Neon)
5. Add game sharing — public URL without auth

---

## NON-NEGOTIABLES (this project)
- Games must work by opening index.html — no server-side rendering
- No external resources except Phaser CDN (no user-uploaded assets in generated code)
- Game code is sandboxed in browser — cannot access server APIs
- Game titles and content must not include offensive material
