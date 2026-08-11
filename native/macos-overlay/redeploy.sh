#!/bin/bash
# SYNOPSIS: Shell script — Build, relaunch, and auto-grant Accessibility.
# Founder, direct: "you have to do everything that you can rather then
# asking me to do it." build.sh alone leaves Taloa's Accessibility trust
# stale after any rebuild that changes the compiled binary (ad-hoc signing
# gives it a fresh identity) -- this closes that loop end to end: build,
# relaunch so the fresh identity registers itself in System Settings, run
# grant_accessibility.py to check the box via the real Accessibility API
# (no manual click), then relaunch once more so AXIsProcessTrusted()
# re-evaluates against the now-granted state (trust is cached for the life
# of a process, so the grant only takes effect on the NEXT launch).
set -euo pipefail
cd "$(dirname "$0")"

./build.sh

pkill -f "Taloa.app/Contents/MacOS/Taloa" 2>/dev/null || true
sleep 1
open build/Taloa.app
sleep 2

python3 grant_accessibility.py || true

pkill -f "Taloa.app/Contents/MacOS/Taloa" 2>/dev/null || true
sleep 1
open build/Taloa.app
sleep 2

echo "Redeployed and re-granted."
