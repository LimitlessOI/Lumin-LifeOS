# 🎬 Quick Start: Video Editing Council

## What is the Video Editing Council?

A system where **8 open source video tools work together** like an AI council. Each tool can:
- Do its specialized job
- Ask other tools to improve its work
- Collaborate on complex projects
- All running **locally on your computer** (no API costs!)

## Setup (5 minutes)

```bash
# 1. Run setup script
./scripts/setup-video-editing-council.sh

# 2. Test installation
./scripts/test-video-council.sh

# 3. Start using!
```

## Quick Examples

### Example 1: Generate Video with Subtitles

```bash
curl -X POST http://localhost:8080/api/v1/video/process \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "generate video with subtitles",
    "inputImage": "/path/to/image.jpg",
    "script": "This is a test video script...",
    "options": {
      "addSubtitles": true,
      "addVoiceover": true
    }
  }'
```

**What happens:**
1. AnimateDiff generates video from image
2. Coqui TTS creates voiceover
3. FFmpeg combines video + audio
4. Whisper transcribes audio
5. MoviePy adds subtitle overlays
6. OpenCV checks quality
7. If quality is low → Stable Video Diffusion improves it

### Example 2: Edit Existing Video

```bash
curl -X POST http://localhost:8080/api/v1/video/process \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -H 'Content-Type: application/json' \
  -d '{
    "task": "cut video and add transitions",
    "inputVideo": "/path/to/video.mp4",
    "options": {
      "startTime": 10,
      "endTime": 30,
      "addTransitions": true
    }
  }'
```

**What happens:**
1. OpenCV analyzes video (finds scenes)
2. FFmpeg cuts at scene boundaries
3. MoviePy adds smooth transitions
4. OpenCV re-checks quality
5. If needed → Other tools improve result

### Example 3: Check Council Status

```bash
curl http://localhost:8080/api/v1/video/council/status \
  -H 'x-command-key: MySecretKey2025LifeOS'
```

**Response:**
```json
{
  "ok": true,
  "members": {
    "ffmpeg_editor": { "available": true, "capabilities": [...] },
    "animatediff_generator": { "available": false, ... },
    ...
  },
  "totalMembers": 8,
  "availableMembers": 6
}
```

## Available Tools

| Tool | What It Does | Status |
|------|-------------|--------|
| **FFmpeg** | Cut, merge, convert videos | ✅ Core |
| **AnimateDiff** | AI video from images | ⚙️ Optional |
| **Stable Video Diffusion** | High-quality AI video | ⚙️ Optional |
| **Whisper** | Speech-to-text, subtitles | ✅ Core |
| **Coqui TTS** | Text-to-speech, voiceovers | ✅ Core |
| **MoviePy** | Python video editing | ✅ Core |
| **OpenCV** | Video analysis, scene detection | ✅ Core |
| **Whisper Translator** | Multi-language | ✅ Core |

## How They Work Together

```
User Request: "Generate video with subtitles"
    ↓
Council Coordinator (AI) decides:
    ↓
┌─────────────────────────────────────┐
│ 1. AnimateDiff → Generate video      │
│ 2. Coqui TTS → Create voiceover     │
│ 3. FFmpeg → Combine video + audio   │
│ 4. Whisper → Transcribe audio       │
│ 5. MoviePy → Add subtitle overlays  │
│ 6. OpenCV → Check quality           │
└─────────────────────────────────────┘
    ↓
Quality Check: "Audio sync is off"
    ↓
Improvement Request:
    ↓
MoviePy fixes audio sync
    ↓
Final Result: Perfect video! ✅
```

## Installation Requirements

**Minimum (Core Tools):**
- FFmpeg
- Python 3.8+
- MoviePy, OpenCV, Whisper, Coqui TTS

**Full Setup (All Tools):**
- Everything above +
- AnimateDiff (optional)
- ComfyUI/Stable Video Diffusion (optional)

## Troubleshooting

**Tool not available?**
```bash
# Check what's installed
./scripts/test-video-council.sh

# Install missing tools
./scripts/setup-video-editing-council.sh
```

**Quality issues?**
- Council automatically requests improvements
- Check logs to see which tools are helping

**Performance slow?**
- Large models (SVD) need GPU for best performance
- CPU works but slower
- Use smaller models for testing

## Next Steps

1. **Read full plan**: `docs/VIDEO_EDITING_COUNCIL_PLAN.md`
2. **Improve AI models**: `docs/IMPROVING_OPEN_SOURCE_AI.md`
3. **Customize**: Edit `core/video-editing-council.js`

## Benefits

✅ **No API Costs** - Everything local
✅ **Privacy** - Videos never leave your computer  
✅ **Collaboration** - Tools help each other
✅ **Improvement** - System gets better over time
✅ **Customizable** - Train models on your data

---

**Ready to start?** Run the setup script and start creating videos! 🎬
