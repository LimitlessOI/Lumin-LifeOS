#!/bin/bash
# SYNOPSIS: Shell script — Install.
# Installs the always-on automation browser as a real macOS LaunchAgent --
# runs at every login (RunAtLoad) and every 5 minutes thereafter
# (StartInterval) as a self-healing check, so the drive-channel always has a
# real, minimized, logged-in Chrome window available without Adam needing to
# open one himself.
set -euo pipefail
cd "$(dirname "$0")"

LABEL="org.hopkinsgroup.lifeos.automation-browser"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT_DIR="$(pwd)"

sed "s|__SCRIPT_PATH__|$SCRIPT_DIR|g" "$LABEL.plist" > "$DEST"

launchctl unload "$DEST" 2>/dev/null || true
launchctl load "$DEST"

echo "Installed and loaded: $DEST"
echo "Log: /tmp/lifeos-automation-browser.log"
