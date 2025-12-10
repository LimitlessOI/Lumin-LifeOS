# Open Source Video Generation Setup

## Overview

BoldTrail uses open source AI video generation models to help agents create YouTube videos. The system supports:

1. **Learn-First Approach**: Agents create videos manually using scripts, then AI enhances them
2. **AI Generation**: Full AI video creation using Stable Video Diffusion (requires mastery unlock)

## Supported Models

### Primary: Stable Video Diffusion (Stability AI)
- **Best for**: High-quality, professional videos
- **Setup**: Via Replicate API or local deployment
- **Cost**: ~$0.05-0.10 per video via Replicate

### Alternative: AnimateDiff
- **Best for**: Animating static images
- **Setup**: Local deployment or API
- **Cost**: Free if self-hosted

## Setup Options

### Option 1: Replicate API (Easiest - Recommended)

1. Sign up at [replicate.com](https://replicate.com)
2. Get your API token
3. Set environment variables:
   ```bash
   VIDEO_GEN_ENDPOINT=https://api.replicate.com
   VIDEO_GEN_API_KEY=your_replicate_token
   ```

### Option 2: Local Stable Diffusion API

1. Install Stable Diffusion WebUI or similar
2. Set environment variable:
   ```bash
   VIDEO_GEN_ENDPOINT=http://localhost:7860
   ```

### Option 3: Self-Hosted Stable Video Diffusion

1. Deploy Stable Video Diffusion model
2. Set custom endpoint:
   ```bash
   VIDEO_GEN_ENDPOINT=http://your-server:port
   ```

## How It Works

### Workflow 1: Learn-First (Default)

1. Agent requests video script
2. System generates script
3. Agent records video manually (learns the process)
4. Agent uploads raw video
5. AI enhances with:
   - B-roll footage
   - Transitions
   - Text overlays
   - Color correction

### Workflow 2: Full AI Generation (Unlocked)

1. Agent requests video
2. System generates:
   - Script
   - Scene breakdown
   - Images (Stable Diffusion)
   - Video clips (Stable Video Diffusion)
   - Voiceover (optional)
   - Final edited video
3. Agent reviews and can request changes

## API Endpoints

- `POST /api/v1/youtube/create-project` - Create project with script
- `POST /api/v1/youtube/upload-raw` - Upload manual recording
- `POST /api/v1/youtube/generate-video` - Generate full AI video
- `GET /api/v1/youtube/project/:projectId` - Check status

## Cost Considerations

- **Replicate API**: ~$0.05-0.15 per 5-second video
- **Self-hosted**: Free but requires GPU (6GB+ VRAM minimum)
- **Recommended**: Start with Replicate, move to self-hosted at scale

## Future Enhancements

- Agent voice cloning for voiceovers
- Real-time video generation
- Batch video creation
- Custom branding/watermarks
- Direct YouTube upload integration
