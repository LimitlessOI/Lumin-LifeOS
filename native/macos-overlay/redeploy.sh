#!/bin/bash
# SYNOPSIS: Shell script — Build, relaunch, and verify Taloa's real capabilities.
# Founder, direct: "you have to do everything that you can rather then asking me
# to do it."
#
# This used to re-grant Accessibility on every run, because ad-hoc signing gave
# Taloa a new identity per build and voided the grant every time. That is fixed
# at the root now (setup-signing.sh -- a stable certificate, so the designated
# requirement names the signer instead of the bytes), so a rebuild no longer
# costs a permission. What remains here is build, relaunch, and an honest
# capability report: grants are only re-attempted if something is actually
# missing.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f "$HOME/.taloa-signing/identity-hash" ]; then
    ./setup-signing.sh
fi

./build.sh

pkill -f "Taloa.app/Contents/MacOS/Taloa" 2>/dev/null || true
sleep 1
open build/Taloa.app
sleep 4

STATE=$(node ../../scripts/taloa.mjs state 2>/dev/null || echo '{}')
echo "$STATE" | grep -E '"can_see"|"can_click"|"can_show"' || true

if echo "$STATE" | grep -q '"can_click" : false'; then
    python3 grant_permissions.py accessibility || true
    RELAUNCH=1
fi
if echo "$STATE" | grep -q '"can_see" : false'; then
    python3 grant_permissions.py screen-recording || true
    RELAUNCH=1
fi

# Both grants are evaluated once at process start, so a fresh one only takes
# effect on the next launch.
if [ "${RELAUNCH:-0}" = "1" ]; then
    pkill -f "Taloa.app/Contents/MacOS/Taloa" 2>/dev/null || true
    sleep 1
    open build/Taloa.app
    sleep 4
    node ../../scripts/taloa.mjs state 2>/dev/null | grep -E '"can_see"|"can_click"|"can_show"' || true
fi

echo "Redeployed."
