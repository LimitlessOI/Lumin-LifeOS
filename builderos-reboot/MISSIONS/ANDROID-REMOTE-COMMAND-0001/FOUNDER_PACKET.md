<!-- SYNOPSIS: Founder Packet — remote command queue so the Android app can be driven from this session, not just by manual taps. -->

# Founder Packet — Android Remote Command Queue

**Mission ID:** `ANDROID-REMOTE-COMMAND-0001`
**Locked:** 2026-08-10 (Adam: "why are you not doing it for me" -- re: tapping the Upload button once the app is installed and permissions are granted.)

## Priority

The Android app has real driving capability (accessibility, biometric,
gallery) but no remote-trigger channel -- every action still needs a manual
tap. The browser extension already has this exact pattern
(`routes/extension-drive-routes.js`'s poll/act/result loop); the Android
app never got the equivalent.

## Desired outcome

A small command queue: this session enqueues a named command for the
founder's phone, the app polls for it while running, executes the matching
already-built action (e.g. `upload_recent_photos`), and reports the result
back -- so once the one-time install + permission grants are done, every
action after that runs with zero taps.

## FOUNDER SUCCESS TEST

`POST /api/v1/android/command {user, command:'upload_recent_photos'}`
enqueues a real row; `GET /api/v1/android/pending-for-user?user=X` atomically
claims it; `POST /api/v1/android/command-result` marks it done.

## Acceptance command

```bash
npm run android-remote-command:acceptance
```
