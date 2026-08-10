<!-- SYNOPSIS: Founder Packet — server route to receive photo uploads from the Android gallery plugin and commit them into the repo. -->

# Founder Packet — Gallery Upload Route

**Mission ID:** `GALLERY-UPLOAD-ROUTE-0001`
**Locked:** 2026-08-10 (Adam: "You take all the photos and dump it over in one of our repos so we can set them up to be sold.")

## Priority

The new `lifeos-gallery-upload` Android plugin can read photo bytes off the
device, but there is nowhere for it to send them. Railway's filesystem is
ephemeral (confirmed earlier tonight) -- a plain disk write would vanish on
the next redeploy. Photos must be committed directly into the git repo via
the existing `commitManyToGitHub` helper (already handles binary/base64
content correctly for image extensions).

## Desired outcome

A `POST /api/v1/gallery/upload` route accepting a batch of `{filename,
base64}` photos and committing them into `data/card-photos/` via the
already-proven `commitManyToGitHub`.

## FOUNDER SUCCESS TEST

A real POST with one small base64-encoded test image commits it to
`data/card-photos/<filename>` on `main` and returns the real commit sha.

## Acceptance command

```bash
npm run gallery-upload-route:acceptance
```
