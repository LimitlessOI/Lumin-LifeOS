# 🎬 Video Editing Council - Local Ollama Setup

## Overview

The Video Editing Council uses **local Ollama models** for all AI coordination and decision-making. No external APIs needed!

## How It Works

```
┌─────────────────────────────────────────────────┐
│         VIDEO EDITING COUNCIL                    │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐         │
│  │ Video Tools  │ ←──→ │ Ollama AI    │         │
│  │ (FFmpeg,     │      │ Coordinator │         │
│  │  Whisper,    │      │ (Local)      │         │
│  │  MoviePy)    │      └──────────────┘         │
│  └──────────────┘                               │
│                                                  │
│  All AI decisions use local Ollama models:       │
│  - ollama_deepseek_v3 (primary)                  │
│  - ollama_llama_3_3_70b (fallback)               │
│  - ollama_deepseek_coder_v2 (code tasks)         │
└─────────────────────────────────────────────────┘
```

## Required Ollama Models

The council uses these Ollama models for AI coordination:

### Primary Models (Required)

1. **ollama_deepseek_v3** ⭐ PRIMARY
   - Used for: AI coordination, improvement suggestions
   - Why: Best reasoning and decision-making
   - Install: `ollama pull deepseek-v3:latest`

2. **ollama_llama_3_3_70b** (Fallback)
   - Used for: Backup when deepseek-v3 unavailable
   - Why: High-quality reasoning
   - Install: `ollama pull llama3.3:70b-instruct-q4_0`

### Optional Models (Better Performance)

3. **ollama_deepseek_coder_v2**
   - Used for: Code generation (FFmpeg commands, Python scripts)
   - Why: Best for technical tasks
   - Install: `ollama pull deepseek-coder-v2:latest`

## Installation

### Step 1: Install Ollama Models

```bash
# Primary AI coordinator
ollama pull deepseek-v3:latest

# Fallback coordinator
ollama pull llama3.3:70b-instruct-q4_0

# Optional: For code generation
ollama pull deepseek-coder-v2:latest
```

### Step 2: Install Video Tools

```bash
# Run the setup script
./scripts/setup-video-editing-council.sh
```

### Step 3: Verify Setup

```bash
# Check Ollama models
ollama list | grep -E "deepseek-v3|llama3.3|deepseek-coder"

# Check video tools
./scripts/test-video-council.sh
```

## How Ollama is Used

### 1. Task Coordination

When you request a video task, Ollama decides which tools to use:

```javascript
// Ollama analyzes the request
const prompt = `Analyze this video task and select appropriate tools:
Task: ${task}
Available tools: ${tools.join(', ')}

Return JSON with selected tools and reasoning.`;

const decision = await callCouncilMember('ollama_deepseek_v3', prompt);
// Returns: { tools: ['ffmpeg_editor', 'whisper_subtitles'], reasoning: '...' }
```

### 2. Quality Assessment

After tools complete, Ollama assesses quality:

```javascript
const assessmentPrompt = `Assess video quality:
- Output: ${result.outputPath}
- Duration: ${result.duration}
- Tools used: ${result.membersUsed.join(', ')}

Rate quality (0-1) and identify improvements needed.`;

const assessment = await callCouncilMember('ollama_deepseek_v3', assessmentPrompt);
// Returns: { quality: 0.85, needsImprovement: ['audio_sync', 'color'] }
```

### 3. Improvement Suggestions

When quality needs improvement, Ollama suggests fixes:

```javascript
const improvementPrompt = `How can ${member.name} improve this result?
Result: ${result}
Member can improve: ${member.canImprove.join(', ')}

Provide specific, actionable suggestions.`;

const suggestion = await callCouncilMember('ollama_deepseek_v3', improvementPrompt);
// Returns: "Adjust audio sync by 0.5 seconds, enhance color saturation by 20%"
```

### 4. Code Generation

For technical tasks, Ollama generates code:

```javascript
const codePrompt = `Generate FFmpeg command to:
- Cut video from 10s to 30s
- Add fade in/out transitions
- Resize to 1920x1080

Return only the FFmpeg command.`;

const code = await callCouncilMember('ollama_deepseek_coder_v2', codePrompt);
// Returns: "ffmpeg -i input.mp4 -ss 10 -t 20 -vf scale=1920:1080,fade=in:0:30,fade=out:st=19.7:d=0.3 output.mp4"
```

## Configuration

### Environment Variables

Add to your `.env`:

```bash
# Ollama endpoint (local)
OLLAMA_ENDPOINT=http://localhost:11434

# Video council AI models
VIDEO_COUNCIL_PRIMARY_MODEL=ollama_deepseek_v3
VIDEO_COUNCIL_FALLBACK_MODEL=ollama_llama_3_3_70b
VIDEO_COUNCIL_CODE_MODEL=ollama_deepseek_coder_v2
```

### Customize Models

Edit `core/video-editing-council.js`:

```javascript
constructor(pool, callCouncilMember) {
  // ...
  // Use your preferred Ollama models
  this.aiCoordinatorModel = 'ollama_deepseek_v3'; // Change here
  this.fallbackModel = 'ollama_llama_3_3_70b';   // Change here
  this.codeModel = 'ollama_deepseek_coder_v2';    // Change here
}
```

## Example: Full Workflow with Ollama

### Request
```bash
curl -X POST http://localhost:8080/api/v1/video/process \
  -H 'x-command-key: MySecretKey2025LifeOS' \
  -d '{
    "task": "generate video with subtitles",
    "script": "Hello world, this is a test video"
  }'
```

### What Happens (All Local)

1. **Ollama analyzes request** (deepseek-v3)
   - Decides: Use AnimateDiff, Coqui TTS, Whisper, MoviePy

2. **Tools execute** (local)
   - AnimateDiff generates video
   - Coqui TTS creates voiceover
   - FFmpeg combines them

3. **Ollama assesses quality** (deepseek-v3)
   - Checks: Audio sync, video quality, subtitle timing
   - Finds: Audio sync is 0.3s off

4. **Ollama suggests fix** (deepseek-v3)
   - Suggests: "Use MoviePy to adjust audio by -0.3s"

5. **MoviePy fixes it** (local)
   - Applies the fix

6. **Ollama re-assesses** (deepseek-v3)
   - Quality: 0.95 ✅
   - Result: Perfect!

## Performance Tips

### For Faster Responses

1. **Use smaller models for simple tasks**:
   ```javascript
   // For simple decisions
   this.aiCoordinatorModel = 'ollama_llama'; // Faster
   
   // For complex reasoning
   this.aiCoordinatorModel = 'ollama_deepseek_v3'; // Better
   ```

2. **Cache common decisions**:
   - Similar tasks reuse previous decisions
   - Reduces Ollama calls

3. **Parallel processing**:
   - Multiple tools run simultaneously
   - Ollama coordinates in parallel

### For Better Quality

1. **Use larger models**:
   - 70B models for complex decisions
   - 7B models for simple tasks

2. **Fine-tune on your data**:
   - Train LoRA on video editing examples
   - See `docs/IMPROVING_OPEN_SOURCE_AI.md`

## Troubleshooting

### Ollama Model Not Found

```bash
# Check installed models
ollama list

# Install missing model
ollama pull deepseek-v3:latest
```

### Model Too Slow

```bash
# Use smaller model
# Edit video-editing-council.js:
this.aiCoordinatorModel = 'ollama_llama'; // Faster
```

### Model Not Responding

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

## Benefits of Local Ollama

✅ **No API Costs** - Completely free
✅ **Privacy** - Everything stays local
✅ **Fast** - No network latency
✅ **Customizable** - Fine-tune models
✅ **Reliable** - No rate limits or downtime
✅ **Offline** - Works without internet

## Next Steps

1. **Install Ollama models**: `ollama pull deepseek-v3:latest`
2. **Install video tools**: `./scripts/setup-video-editing-council.sh`
3. **Test**: `./scripts/test-video-council.sh`
4. **Start using**: See `docs/QUICK_START_VIDEO_COUNCIL.md`

---

**Everything runs locally with Ollama!** 🎬🤖
