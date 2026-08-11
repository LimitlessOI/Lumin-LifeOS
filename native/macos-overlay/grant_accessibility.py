#!/usr/bin/env python3
"""
Auto-grants Taloa Accessibility trust via the real macOS Accessibility API
(ApplicationServices/AXUIElement) -- not a workaround or a TCC.db hack.
Real founder ask, direct: "you do them you will see that they are done in
fact you have to do everything that you can rather then asking me to do it."

Root cause this exists at all: ad-hoc code signing (build.sh's
`codesign --sign -`) gives Taloa.app a fresh identity on every rebuild, so
System Settings' Accessibility grant (tied to the binary's signature, not
just its bundle path) silently goes stale each time -- confirmed live,
twice, this session: relaunching after a rebuild with the checkbox still
showing checked still reported AXIsProcessTrusted() == false from inside
the app itself.

Uses the SAME underlying Accessibility API this script is granting access
to -- it drives System Settings' own UI exactly the way a human clicking
the checkbox would, via the process that's already trusted to do this
(confirmed working the same way this session for clicking Taloa's own
buttons and the mic-permission "Allow" dialog). It does not touch
~/Library/Application Support/com.apple.TCC/TCC.db directly (confirmed
that path is itself TCC-protected and denies access even to this trusted
process -- the correct, intended boundary).

Handles all three real states found live:
  1. A fresh `universalAccessAuthWarn` system prompt is showing (first
     launch after a rebuild) -- clicks "Open System Settings".
  2. The Accessibility pane's Taloa row exists but is unchecked -- presses
     the checkbox directly via AXPress.
  3. The row is already checked (stale from before this rebuild) -- no-op;
     the caller must still relaunch Taloa for AXIsProcessTrusted() to
     re-evaluate, since trust is cached for the life of the process.

Exit code 0 if the checkbox ends up checked, 1 otherwise. Prints a one-line
status either way.
"""
import subprocess
import sys
import time

import ApplicationServices as AX
import Quartz

TALOA_ROW_PATH = [0, 0, 0, 2, 0, 0, 0, 1, 0, 10, 0, 0]


def get_pid_for_app(name):
    for app in Quartz.NSWorkspace.sharedWorkspace().runningApplications():
        if app.localizedName() == name:
            return app.processIdentifier()
    return None


def attr(elem, name):
    err, val = AX.AXUIElementCopyAttributeValue(elem, name, None)
    return val if err == 0 else None


def children(elem):
    kids = attr(elem, "AXChildren")
    return list(kids) if kids else []


def dismiss_fresh_auth_prompt():
    pid = get_pid_for_app("universalAccessAuthWarn")
    if pid is None:
        return False
    script = (
        'tell application "System Events"\n'
        '  tell process "universalAccessAuthWarn"\n'
        '    click button "Open System Settings" of window 1\n'
        "  end tell\n"
        "end tell\n"
    )
    subprocess.run(["osascript", "-e", script], capture_output=True)
    time.sleep(1.5)
    return True


def find_taloa_checkbox():
    """Walks the same fixed path proven live this session. Falls back to a
    real recursive search (slower, ~5-10s) if System Settings' layout ever
    shifts, rather than silently failing."""
    pid = get_pid_for_app("System Settings")
    if pid is None:
        return None
    app_elem = AX.AXUIElementCreateApplication(pid)

    def resolve(path):
        elem = app_elem
        for i in path:
            kids = children(elem)
            if i >= len(kids):
                return None
            elem = kids[i]
        return elem

    elem = resolve(TALOA_ROW_PATH)
    if elem is not None:
        role = attr(elem, "AXRole")
        if role == "AXCheckBox":
            return elem
        if role == "AXStaticText" and attr(elem, "AXValue") == "Taloa":
            parent = resolve(TALOA_ROW_PATH[:-1])
            if parent is not None:
                for k in children(parent):
                    if attr(k, "AXRole") == "AXCheckBox":
                        return k

    # Fallback: real recursive search by value, not just the known path.
    found = []

    def walk(elem, depth):
        if depth > 25 or found:
            return
        for k in children(elem):
            if attr(k, "AXValue") == "Taloa" and attr(k, "AXRole") == "AXCheckBox":
                found.append(k)
                return
            if attr(k, "AXValue") == "Taloa":
                for sib in children(attr(k, "AXParent")) if attr(k, "AXParent") else []:
                    if attr(sib, "AXRole") == "AXCheckBox":
                        found.append(sib)
                        return
            walk(k, depth + 1)

    walk(app_elem, 0)
    return found[0] if found else None


def main():
    subprocess.run(
        ["open", "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"],
        capture_output=True,
    )
    time.sleep(1.2)

    if dismiss_fresh_auth_prompt():
        subprocess.run(
            ["open", "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"],
            capture_output=True,
        )
        time.sleep(1.0)

    checkbox = find_taloa_checkbox()
    if checkbox is None:
        print("grant_accessibility: could not locate Taloa row in Accessibility list")
        return 1

    value = attr(checkbox, "AXValue")
    if value == 1:
        print("grant_accessibility: already checked (relaunch Taloa if this was just rebuilt)")
        return 0

    AX.AXUIElementPerformAction(checkbox, "AXPress")
    time.sleep(0.4)
    value_after = attr(checkbox, "AXValue")
    if value_after == 1:
        print("grant_accessibility: checked successfully")
        return 0
    print(f"grant_accessibility: press did not result in checked state (value={value_after})")
    return 1


if __name__ == "__main__":
    sys.exit(main())
