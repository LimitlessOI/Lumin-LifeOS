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
