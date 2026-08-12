#!/bin/bash
# SYNOPSIS: Shell script — Restore the authentication gate on Privacy settings.
# Undoes enable-unattended-permissions.sh. After this, changing an Accessibility
# or Screen Recording switch requires Touch ID or a password again.
#
# Run this if the machine stops being single-user, if it is ever shared,
# handed over, or if anything untrusted has run on it. Nothing in Taloa depends
# on the gate staying off -- grants already made survive either way.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "must run as root: sudo $0" >&2
    exit 1
fi

# These are the stock macOS 14 values, read off this machine before they were
# changed -- not invented defaults.
for right in system.preferences.accessibility system.preferences.security; do
    security authorizationdb write "$right" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>class</key><string>user</string>
  <key>group</key><string>admin</string>
  <key>authenticate-user</key><true/>
  <key>shared</key><false/>
  <key>timeout</key><integer>2147483647</integer>
  <key>tries</key><integer>10000</integer>
</dict></plist>
PLIST
    echo "restored: $right"
done

[ -f /etc/sudoers.d/taloa ] && rm -f /etc/sudoers.d/taloa && echo "removed: /etc/sudoers.d/taloa"

echo "Privacy changes require authentication again."
