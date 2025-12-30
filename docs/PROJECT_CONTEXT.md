# PROJECT CONTEXT
# Auto-injected into AI prompts for grounding

## What We're Building
LifeOS - An AI-powered operating system for life and business automation.

## Current Status (December 2024)
- Railway deployment: ✅ Active
- Ollama tunnel: ✅ Connected  
- Cost mode: 💰 Shutdown (free models only)
- Self-programming: ✅ Enabled
- Knowledge processing: 🔄 In progress

## Immediate Goals
1. Process 18 knowledge dumps into structured index
2. Fix ideas generation for Ollama models
3. Extract and prioritize business ideas
4. Generate first revenue within 30 days

## Key Files
- Knowledge dumps: •	Lumin-Memory/00_INBOX/raw/
- Knowledge index: knowledge/index/entries.jsonl
- Core truths: docs/CORE_TRUTHS.md

## Active Models (Free Tier)
- deepseek-coder-v2:latest
- llama3.2:1b
- phi3:mini
- qwen2.5-coder:32b (when available)

## Ideas Generation
- Uses model-size detection to adapt prompts
- Small models (1b-3b): Simple numbered list format
- Medium models (7b-8b): Structured format
- Large models (32b+): Full JSON with analysis
