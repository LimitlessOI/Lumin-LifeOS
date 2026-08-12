# 2026-08-12 — Keep both factories building; fix the fixer

Founder: the previous hold-to-talk did not work; set up a watchdog inside the system.

Hold-to-talk is now native `AVAudioRecorder` → Voice Rail STT → `luminSend` (proven `voice.send result=sent` in Taloa.log). JS click into a hidden WKWebView cannot start getUserMedia.

Watchdog: `evaluateSystemWatchdog` runs in production `prod-health-watchdog` and in the factory-2 LaunchAgent (relaunches Taloa if she dies).
