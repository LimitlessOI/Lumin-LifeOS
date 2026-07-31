<!-- SYNOPSIS: NEVER_STOP_RETRIAGE.md -->

# NEVER_STOP_RETRIAGE.md

As of 2026-07-31, the autonomous never-stop loop is paused via `builderos-reboot/FOUNDER_STOP.json`. No in-flight steps require requeue: the PATH-TO-TEN mission pack is the active queue, and all product work is routed through `BP_PRIORITY.json`. Continuous verification (`services/continuous-verification.mjs`) will re-run governance checks and re-pause autonomy if any drift is detected. Re-triage is complete.
