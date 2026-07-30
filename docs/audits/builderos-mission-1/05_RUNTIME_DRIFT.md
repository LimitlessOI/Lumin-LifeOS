<!-- SYNOPSIS: 5. Runtime Drift Report -->


# 5. Runtime Drift Report

## 5.1 Production vs origin/main
`/api/v1/lifeos/builder/ready` response:
```json
{
  "ok": true,
  "runtime_profile": "full",
  "codegen": {
    "policy_revision": "2026-05-01a",
    "supports_max_output_tokens_body": true,
    "html_output_estimator": "v2_linear_chars_1_85",
    "deploy_commit_sha": "2b96d2f42763dc831d7cf3ca3ac3e3ff9b6d8c0d"
  },
  "builder": {
    "commitToGitHub": true,
    "commit_path_ready": true,
    "local_mirror_commit": false,
    "github_token": true,
    "callCouncilMember": true,
    "pool": true,
    "lclMonitor": true,
    "codegen_policy_revision": "2026-05-01a"
  },
  "server": {
    "auth": "key_required",
    "auth_keys": {
      "API_KEY": false,
      "LIFEOS_KEY": false,
      "COMMAND_CENTER_KEY": true
    },
    "local_builder_env": {
      "file_present": true,
      "file_nonempty": false,
      "openai_key_loaded": true
    }
  },
  "next_steps": [
    "Send x-command-key (or x-lifeos-key) equal to the configured COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY on each builder request from your machine.",
    "Local BuilderOS worker file .env.builderos exists but is empty \u2014 local builder lanes will stay unavailable until OPENAI_API_KEY (or other provider keys) are actually saved into that file."
  ],
  "truth_spine_applied": true,
  "truth_spine_version": "truth_enforcement_spine_v1",
  "point_b_dna_version": "point_b_dna_v1",
  "system_purpose": "point_a_to_point_b",
  "synergy_model": "human_ai_greater_than_sum"
}
```
- origin/main HEAD: `2b96d2f42`
- The never-stop autonomous builder pushes queue-status commits and triggers deploys, causing production to move ahead of manual audit commits.

## 5.2 Runtime profile lockout
`services/runtime-modes.js` forces Railway to `founder_builder` unless all env levers set.
      return String(value ?? fallback).trim().toLowerCase();
      return Boolean(
      const raw = normalize(env.LIFEOS_RUNTIME_PROFILE, 'founder_builder');
       *   but production must fail closed to founder_builder even if stale env flags remain.
        return 'founder_builder';
        return explicitFullRuntime ? 'full' : 'founder_builder';
      if (raw === 'founder_builder' || raw === 'builder' || raw === 'founder') {
        return 'founder_builder';
      return 'founder_builder';
      return getRuntimeProfile(env) === 'full';
      return getRuntimeProfile(env) === 'founder_builder';
      return normalize(env.LIFEOS_DIRECTED_MODE, 'true') !== 'false';
      return normalize(env.PAUSE_AUTONOMY, '1') === '1';
      return normalize(env.LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER, 'false') === 'true';
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
      return {
        fullRuntimeProfile: isFullRuntimeProfile(env),

## 5.3 Two servers / route registration paths
**server-founder-runtime.js** route mounts: 6
**server-full-runtime.js** route mounts: 13
**server.js** route mounts: 0

## 5.4 Observed dead 404 routes
- `GET /api/v1/builderos/control-plane/runtime-fingerprint` -> 404
- `GET /api/v1/flags` -> 404
- Route existence depends on runtime profile and server file loaded.