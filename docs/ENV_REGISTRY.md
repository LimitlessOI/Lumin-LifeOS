<!-- SYNOPSIS: Environment Registry Documentation -->

# Environment Registry Documentation

## Overview

The environment registry is a centralized repository for managing environment variables used across various applications and services. It ensures consistency, security, and ease of management for environment configurations.

## Rotation Metadata

### Description

The rotation metadata section provides information about the rotation policies and schedule for environment variables. This ensures that sensitive data is regularly updated to maintain security and compliance.

### Components

- **Rotation Frequency**: Indicates how often the environment variable should be rotated (e.g., daily, weekly, monthly).
- **Last Rotated**: The date when the environment variable was last rotated.
- **Next Rotation Due**: The upcoming date scheduled for the next rotation.
- **Rotation Method**: Describes the method used for rotation, such as manual or automated.

## Crypto Tier Labels

### Explanation

Crypto tier labels categorize environment variables based on their sensitivity and the level of cryptographic protection required. This helps in applying appropriate security measures and managing access controls.

### Tiers

- **Tier 1**: High sensitivity. Requires strong encryption and frequent rotation. Access is highly restricted.
- **Tier 2**: Moderate sensitivity. Requires standard encryption with periodic rotation. Access is moderately restricted.
- **Tier 3**: Low sensitivity. May not require encryption but should be protected against unauthorized access. Rotation is optional.

## Best Practices

- Regularly review and update the rotation schedule and methods.
- Ensure that crypto tier labels are assigned appropriately based on the sensitivity of the data.
- Use automated tools for managing rotations to reduce the risk of human error.
- Conduct regular audits to ensure compliance with security policies.

## Conclusion

The environment registry, along with its rotation metadata and crypto tier labels, plays a critical role in maintaining the security and integrity of application configurations. Proper management ensures that sensitive information is protected and access is controlled effectively.

## Deploy Inventory

Live snapshot pulled directly from Railway's real environment via `npm run env:inventory` (`GET /api/v1/railway/managed-env/registry` — names/presence only, never secret values). Full machine-readable detail lives in `docs/ENV_LIVE_INVENTORY.json`, regenerated each run.

**Latest run: 2026-08-11.** 159 tracked variables — 67 healthy, 10 missing-critical, 9 missing-needed, 8 revenue-blocking, 2 deprecated-but-still-set.

- **AI provider keys present:** OpenAI, Anthropic, Gemini, Groq, Cerebras, Mistral, DeepSeek, Together, Replicate (9 of 9 real AI providers this codebase knows how to call are configured). Not configured at all: Perplexity, OpenRouter, Fireworks, Grok, ElevenLabs.
- **Revenue-blocking (missing):** `RESEND_API_KEY`; `TC_IMAP_HOST`/`TC_IMAP_PORT`/`TC_IMAP_USER`/`TC_IMAP_APP_PASSWORD` (transaction coordinator email intake); `AFFILIATE_JANE_APP_URL`/`AFFILIATE_MINDBODY_URL`/`AFFILIATE_SQUARE_URL`.
- **Missing-critical:** `JWT_SECRET`, `GROK_API_KEY`, `ALERT_PHONE`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `GITHUB_DEPLOY_BRANCH`, `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID`, `BOLDTRAIL_API_URL`, `UPSTASH_REDIS_URL`.

## Changelog

| Date | Change |
|---|---|
| 2026-08-11 | Founder-requested full audit of Railway environment variables ("audit of the API keys we have in Railway... every single detail of what's on our variables"). Ran the real, existing `env:inventory` tool against production for the first time this session — confirmed all 9 real AI provider keys configured, surfaced 8 revenue-blocking and 10 missing-critical gaps that were previously undocumented in this file. |