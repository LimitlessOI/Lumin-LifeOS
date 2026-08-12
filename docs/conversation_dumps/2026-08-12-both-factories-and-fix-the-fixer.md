<!-- SYNOPSIS: 2026-08-12 — Both factories, and fix the fixer (continued) -->

# 2026-08-12 — Both factories, and fix the fixer (continued)

Twin of the BuilderOS/overlay captures.

Adam: is it not SENTRY's job to do what Cursor was asked, and never stop; if the system stops working that is its job.

Yes. SENTRY-Chair already never-stopped on boot but was not watching factories/overlay/fixer. `checkSystemStillWorking` is now a SENTRY check (every 5m). `fixer_failed` after 15m still-true. Railway cannot hold-click Taloa.

Native badge mic now reaches Chair (`voice.send result=sent`). Production watchdog watches governed-loop staleness and native false-blocks; factory-2 relaunches Taloa if she dies.
