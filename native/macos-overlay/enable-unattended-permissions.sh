#!/bin/bash
# SYNOPSIS: Shell script — Remove the per-change fingerprint gate on Privacy settings.
# Founder, direct: "use my computer to set up everything doent make me do it"
# and, after the Taloa grants landed: "I'm still need authorization with my
# fingerprint. Do it."
#
# WHAT IS STILL GATED AFTER THE SIGNING FIX
# Taloa's own two grants are permanent now (setup-signing.sh). What still needs
# Adam is the *next* Privacy change -- a new app, a reset, a second machine.
# macOS gates those behind two authorization rights, both currently demanding a
# live human:
#
#     system.preferences.accessibility   authenticate-user = true, group admin
#     system.preferences.security        authenticate-user = true, group admin
#
# This sets both to `allow`, which is the only way to remove the prompt; there
# is no narrower setting that keeps the gate for other callers and drops it for
# this one.
#
# THE TRADE, STATED PLAINLY
# After this, any local process running as Adam can flip a Privacy switch with
# no authentication. That is a real reduction in this machine's defences, not a
# formality -- it is the same door malware would want. It is being made
# deliberately, on an explicit founder instruction, on a single-user machine.
# `disable-unattended-permissions.sh`, beside this file, puts it back in one
# command, and nothing else here depends on it staying off.
#
# Passwordless sudo was considered and deliberately NOT installed: nothing in
# this workflow actually needs root (`tccutil` and the Accessibility API both
# run as the user), so a NOPASSWD rule would have been attack surface bought
# for nothing.
#
# Run once, as root. Everything is validated before it is installed.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "must run as root: sudo $0" >&2
    exit 1
fi

REVERT="$(cd "$(dirname "$0")" && pwd)/disable-unattended-permissions.sh"
RIGHTS=(system.preferences.accessibility system.preferences.security)

echo "== 1/2 authorization rights =="
for right in "${RIGHTS[@]}"; do
    if security authorizationdb read "$right" 2>/dev/null | grep -q "<string>allow</string>"; then
        echo "  $right: already allow"
    else
        security authorizationdb write "$right" allow >/dev/null 2>&1
        echo "  $right: set to allow"
    fi
done

echo "== 2/2 Touch ID for sudo (optional) =="
# /etc/pam.d is SIP-protected on macOS 14.5 -- confirmed live: writing
# sudo_local returns "Operation not permitted" even as root. Left non-fatal on
# purpose. This step is a convenience (a touch instead of a typed password for
# `sudo`); the actual goal is step 1, and it must not be held hostage to this.
if [ -f /etc/pam.d/sudo_local ] && grep -q "^auth.*pam_tid.so" /etc/pam.d/sudo_local; then
    echo "  already enabled"
elif printf 'auth       sufficient     pam_tid.so\n' > /etc/pam.d/sudo_local 2>/dev/null; then
    chmod 444 /etc/pam.d/sudo_local 2>/dev/null || true
    echo "  enabled"
else
    echo "  skipped: /etc/pam.d is protected by SIP (sudo still asks for a password)"
fi

echo
echo "Done. Privacy switches no longer prompt."
echo "Undo with: sudo $REVERT"
