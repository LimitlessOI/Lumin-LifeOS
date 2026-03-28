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

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 76/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] Core pipeline is built (`services/game-publisher.js`) and wired
- [x] "Closed World" prompt pattern fully specified — headless AI can implement games with no ambiguity
- [x] Validation checks defined (Phaser reference, scene methods, balanced braces)
- [ ] Game endpoints not yet extracted from server.js → `routes/game-routes.js`
- [ ] DB table for game persistence not yet created — games only exist as `meta.json` files
- [ ] Revenue model segments (game-as-a-service, educational packs) not defined to billing/endpoint level
- [ ] Play count tracking endpoint not specified

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| GameMaker (YoYo Games) | Industry-standard, large community, export to multiple platforms | Requires human expertise, hours to days to build a game, $99/mo | We go from text description to playable game in under 2 minutes, zero game-dev knowledge required |
| Construct 3 | Visual no-code game builder, browser-based | Still requires manual design work, not AI-generative, $129/yr | Full AI generation from a sentence — no drag-and-drop, no templates |
| ChatGPT Code Interpreter | Can generate HTML/JS games on request | No deployment, no gallery, no validation, no Phaser scaffolding | We validate, repair, deploy, and serve — a complete pipeline, not a code snippet |
| Rosebud AI | AI game generation for Phaser | Early product, limited game types, no white-label or business integration | Our pipeline is embedded in a full business OS — games are a revenue feature, not a standalone product |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| LLM token limits mean complex games get truncated at 4096 tokens (confirmed THINK) | HIGH | Medium — validation catches truncation, but repair loop may loop infinitely | Mitigate: increase max_tokens to 8192 for game generation calls; add loop limit to repair |
| Phaser.js CDN goes down or changes URL | Low | High — all games break on load | Mitigate: pin Phaser version in CDN URL; add fallback to self-hosted Phaser copy |
| Browser game piracy — someone scrapes our generated games and republishes them | Medium | Low — games are demos, not our primary product | Accept: games have no DRM by design; the generation capability is the moat |
| AI-generated game content violates IP (character names, art style) | Medium | Medium — DMCA risk | Mitigate: prompt instructs AI not to reference copyrighted characters; add content review flag |

### Gate 4 — Adaptability Strategy
The game generation prompt is a string — swapping Phaser for a different game engine requires one prompt edit and one validation function update. If a competitor demonstrates a new game type (e.g., isometric), we add it to the `GAME_TYPES` list and update the prompt. The "Closed World" constraint pattern is engine-agnostic and can be reused for any future single-file output target. Score: 76/100 — the pipeline architecture is sound; the main gap is the missing DB table and routes extraction.

### Gate 5 — How We Beat Them
While other tools require game developers to use them, LifeOS game generation is positioned for business owners — a yoga studio gets a branded quiz game for their website, a real estate agent gets a neighborhood guessing game for lead capture, without either of them knowing what Phaser is.
