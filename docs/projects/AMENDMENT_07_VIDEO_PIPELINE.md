# AMENDMENT 07 — Video Pipeline
**Status:** BUILDING
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
Generates realistic-looking videos from text scripts. Two paths: (A) Text-to-video via Replicate AI models (Kling 1.6 for quality, Wan 2.1 for speed), (B) AI images + FFmpeg compose (cheaper, controllable). Also includes a YouTube workflow for creating channel content and a video editing council for post-production decisions.

**Mission:** Turn a script into a publishable video — cinematic quality, no camera, no editing software.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| Video production for wellness clients | $300–$1,000 per video | Testimonial reels, brand videos |
| YouTube content automation | $500/mo retainer | Weekly videos for client channels |
| Testimonial highlight reels | $150–$300 | Short-form, social-ready |
| Educational/training videos | $500–$2,000 | Course content for practitioners |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `services/video-pipeline.js` | Core: script → scenes → images → audio → FFmpeg → MP4 |
| `core/video-editing-council.js` | AI council for post-production decisions |
| `server.js` (lines 7153–7550) | YouTube workflow, video editing, video pipeline endpoints — NEEDS EXTRACTION |

### AI Models (via Replicate)
| Model | ID | Cost | Use |
|-------|----|------|-----|
| Kling 1.6 | `klingai/kling-1.6` | ~$0.05–0.08/clip | Best quality |
| Wan 2.1 | `wavespeedai/wan-2.1-i2v-480p` | ~$0.02–0.04/clip | Fast/cheap |
| Flux Schnell | `black-forest-labs/flux-schnell` | ~$0.003/image | Scene images |
| Flux Dev | `black-forest-labs/flux-dev` | ~$0.025/image | Higher quality images |

### Required Env Vars
- `REPLICATE_API_TOKEN` — Replicate API key
- `ELEVENLABS_API_KEY` — (optional) AI voice narration

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/video/generate` | Generate a video from script |
| GET | `/api/v1/video/estimate` | Cost estimate before generating |
| POST | `/api/v1/youtube/create` | Full YouTube video creation workflow |
| GET | `/api/v1/video/status/:jobId` | Check generation status |

### Video Generation Flow
1. Parse script into scenes (AI)
2. Generate scene images (Flux Schnell — $0.003/image)
3. Optionally: generate audio narration (ElevenLabs)
4. Optionally: animate images to video clips (Wan 2.1 or Kling 1.6)
5. Compose with FFmpeg: images + audio + transitions → MP4
6. Store in `/public/videos/{jobId}/output.mp4`

---

## CURRENT STATE
- **KNOW:** `services/video-pipeline.js` written and wired to server
- **KNOW:** `REPLICATE_API_TOKEN` must be added to Railway env vars
- **KNOW:** `core/video-editing-council.js` exists
- **THINK:** FFmpeg must be available on Railway — verify ffmpeg binary in Docker/buildpack
- **DON'T KNOW:** Whether Replicate webhooks are needed for long-running jobs (Kling takes 1–5 min)
- **DON'T KNOW:** Whether ElevenLabs is configured

---

## REFACTOR PLAN
1. Extract all video endpoints from server.js → `routes/video-routes.js`
2. Use BullMQ `video-generate` queue for async generation (long-running jobs)
3. Add webhook callback from Replicate when job completes
4. Add video job status polling endpoint for frontend
5. Add video gallery at `/videos/` for serving completed videos
6. Wire `videoJobs` Drizzle schema table to track all jobs in Neon

---

## NON-NEGOTIABLES (this project)
- Never generate videos containing real people's likenesses without explicit consent
- Cost estimate MUST be shown before generation — user must confirm
- Failed video jobs must refund or not charge (track Replicate job IDs)
- Video content must not violate platform policies (Replicate, ElevenLabs ToS)
- Store raw model output before any processing — allow re-run from checkpoint

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 70/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] AI model list documented with IDs, costs, and use cases
- [x] Video generation flow specified (6-step pipeline)
- [x] Required env vars listed
- [ ] Video endpoints not yet extracted from server.js → `routes/video-routes.js`
- [ ] BullMQ async queue for long-running jobs not yet wired (Kling takes 1–5 min, cannot run synchronously in HTTP handler)
- [ ] Replicate webhook callback for job completion not designed or documented
- [ ] `videoJobs` DB table schema not yet written
- [ ] FFmpeg availability on Railway not yet confirmed — this is a build blocker

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Synthesia | Polished AI avatar videos, enterprise sales, widely trusted | $30/video or $67/mo, avatars look synthetic, no custom scenes, no script-to-scene breakdown | We generate scene-by-scene with real image + video composition — cinematic, not avatar-based |
| Runway ML Gen-3 | Best-in-class video quality, trusted by filmmakers | $15/mo entry, complex UI, not integrated into any business workflow | We pipe video directly into client deliverables (YouTube, wellness site) without the user ever leaving LifeOS |
| HeyGen | Fast avatar videos, voice cloning, good for testimonials | $29–$89/mo, still avatar-centric, not useful for cinematic brand content | Our Kling 1.6 path produces real scene video, not talking heads |
| Invideo AI | Script-to-video AI, template library | Template-based, not truly generative, limited customization | We generate from scratch — no templates, fully custom scenes from the script |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| FFmpeg not available in Railway's buildpack | HIGH (unconfirmed) | HIGH — entire pipeline broken | Mitigate: confirm buildpack before any other work; add `apt-get install ffmpeg` to Dockerfile if needed |
| Replicate model IDs change (Kling 1.6, Wan 2.1 are versioned) | Medium | Medium — API calls fail silently | Mitigate: store model IDs in config, not hardcoded; test model ID validity at startup |
| ElevenLabs ToS restricts commercial use of cloned voices | Medium | Medium — audio narration blocked | Monitor: read ToS on signup; build narration as optional with clear ToS disclosure to user |
| AI-generated video quality catches up to real video — commodity pricing war | HIGH (12–18 months) | Low — our margin is in the pipeline and client delivery, not the model itself | Accept: our edge is the end-to-end delivery workflow, not the raw video quality |

### Gate 4 — Adaptability Strategy
The pipeline is model-agnostic by design — Kling and Wan are referenced only in a model routing table. If Google Veo or OpenAI Sora become cheaper or higher quality, we swap the model ID in config without touching the pipeline. The FFmpeg composition layer is decoupled from the AI generation step, so switching to a cloud video editor API (e.g., Cloudinary video) requires only replacing the FFmpeg service. Score: 70/100 — good model abstraction; the missing async queue and unconfirmed FFmpeg are the gaps blocking a higher score.

### Gate 5 — How We Beat Them
Competitors sell video generation as a product; we sell it as a delivery mechanism — when a wellness client pays for a monthly content plan, LifeOS auto-generates their weekly YouTube video from a script, posts it to their channel, and links it on their AI-built website, turning a $300 retainer into a fully automated content machine.
