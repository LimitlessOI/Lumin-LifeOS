<!-- SYNOPSIS: 2026-08-12 — Keep both factories building; fix the fixer -->

# 2026-08-12 — Keep both factories building; fix the fixer

Founder: the previous hold-to-talk did not work; set up a watchdog inside the system.

Hold-to-talk is now native `AVAudioRecorder` → Voice Rail STT → `luminSend` (proven `voice.send result=sent` in Taloa.log). JS click into a hidden WKWebView cannot start getUserMedia.

Watchdog: `evaluateSystemWatchdog` runs in production `prod-health-watchdog` and in the factory-2 LaunchAgent (relaunches Taloa if she dies).

SENTRY now owns the never-stop watch of that same signal (`checkSystemStillWorking` every 5m). Railway SENTRY cannot hold-click the Taloa badge. Overlay Layer A/B scripts remain registered, not implemented.
