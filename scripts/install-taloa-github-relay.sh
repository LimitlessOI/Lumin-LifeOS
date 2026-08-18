#!/bin/bash
# SYNOPSIS: Install/start the local Taloa GitHub relay as a per-user LaunchAgent.
# @ssot docs/products/universal-overlay/PRODUCT_HOME.md
set -euo pipefail

ROOT="${TALOA_REPO_ROOT:-/Users/adamhopkins/Projects/Lumin-LifeOS}"
LABEL="com.limitlessoi.taloa-github-relay"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/Taloa"
NODE_BIN="$(command -v node || true)"

if [ -z "$NODE_BIN" ]; then
  echo "node not found in PATH" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${ROOT}/scripts/taloa-github-relay.mjs</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/github-relay.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/github-relay.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TALOA_REPO_ROOT</key>
    <string>${ROOT}</string>
  </dict>
</dict>
</plist>
PLIST

chmod 600 "$PLIST"
launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"
sleep 2

if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  echo "Taloa GitHub relay installed and running"
  echo "stdout: ${LOG_DIR}/github-relay.out.log"
  echo "stderr: ${LOG_DIR}/github-relay.err.log"
else
  echo "relay failed to register; inspect ${LOG_DIR}/github-relay.err.log" >&2
  exit 1
fi
