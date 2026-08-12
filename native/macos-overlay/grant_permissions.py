#!/usr/bin/env python3
"""
Grants Taloa both permissions it needs -- Accessibility (hands) and Screen
Recording (eyes) -- by driving System Settings' own UI through the real macOS
Accessibility API, exactly as a human clicking the switch would.

Founder, direct: "Everything that pops up, we've already given permission to.
If you don't have permission, ask for it, or actually you can just click on it.
Why can't you?"

Supersedes grant_accessibility.py, which only handled Accessibility and was
written before the root cause below was found.

ROOT CAUSE, now fixed elsewhere: Taloa was ad-hoc signed, so its designated
requirement was a hash of the binary and every rebuild silently voided both
grants -- the checkbox stayed checked while the app was refused. setup-signing.sh
gives it a stable self-signed identity, so a grant made once now survives
rebuilds. Without that fix this script has to be re-run after every build and
still cannot make the grant stick; with it, this runs once.

This does NOT touch the TCC database (confirmed: it is itself TCC-protected and
denies even a trusted process -- the correct boundary). It clicks the real
switch.

Exit code 0 only if every requested permission ends up enabled.
"""
import subprocess
import sys
import time

import ApplicationServices as AX
import Quartz

# The third field is the pane's real window title, which is verified before any
# row is touched. Without that check this script reported Screen Recording
# "already enabled" while System Settings had never left the Accessibility pane
# -- it matched Taloa's Accessibility row and called it a win. A permissions
# tool that reports success on the wrong pane is worse than one that fails.
# Note the Screen Recording pane is NOT titled "Screen Recording".
PANES = {
    "accessibility": (
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
        "Accessibility",
    ),
    "screen-recording": (
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
        "Screen & System Audio Recording",
    ),
}
APP_LABEL = "Taloa"


def attr(elem, name):
    err, val = AX.AXUIElementCopyAttributeValue(elem, name, None)
    return val if err == 0 else None


def children(elem):
    kids = attr(elem, "AXChildren")
    return list(kids) if kids else []


def pid_for(name):
    for app in Quartz.NSWorkspace.sharedWorkspace().runningApplications():
        if app.localizedName() == name:
            return app.processIdentifier()
    return None


def dismiss_system_prompt():
    """A fresh request puts up a system dialog that steals the pane; clicking
    through it is part of doing this without the founder."""
    for proc, button in (
        ("universalAccessAuthWarn", "Open System Settings"),
        ("UserNotificationCenter", "Open System Settings"),
    ):
        if pid_for(proc) is None:
            continue
        subprocess.run(
            ["osascript", "-e",
             f'tell application "System Events" to tell process "{proc}" '
             f'to click button "{button}" of window 1'],
            capture_output=True,
        )
        time.sleep(1.5)


def find_toggle(app_elem, label):
    """Recursive search, not a hardcoded index path: System Settings' layout
    shifts between the two panes and between macOS releases, and a fixed path
    fails silently (it resolves to *something*, just the wrong thing).

    Rows render as a checkbox carrying the app name, or as static text with the
    switch as a sibling -- both shapes appear in practice, so both are handled.
    """
    result = []

    def switch_near(elem):
        parent = attr(elem, "AXParent")
        if parent is None:
            return None
        for sibling in children(parent):
            role = attr(sibling, "AXRole")
            if role in ("AXCheckBox", "AXSwitch", "AXToggle"):
                return sibling
        return None

    def walk(elem, depth):
        if depth > 30 or result:
            return
        for kid in children(elem):
            role = attr(kid, "AXRole")
            value = attr(kid, "AXValue")
            title = attr(kid, "AXTitle")
            if role in ("AXCheckBox", "AXSwitch", "AXToggle") and label in (value, title):
                result.append(kid)
                return
            if label in (value, title):
                near = switch_near(kid)
                if near is not None:
                    result.append(near)
                    return
            walk(kid, depth + 1)

    walk(app_elem, 0)
    return result[0] if result else None


def enabled(toggle):
    value = attr(toggle, "AXValue")
    return value in (1, True, "1")


def open_pane(url, pane_title):
    """System Settings ignores the pane anchor when it is already running -- it
    just restores whatever pane it was last showing. Quitting first is the only
    reliable way in; confirmed against both panes."""
    subprocess.run(["osascript", "-e", 'tell application "System Settings" to quit'],
                   capture_output=True)
    time.sleep(2.5)
    subprocess.run(["open", url], capture_output=True)
    time.sleep(4)

    pid = pid_for("System Settings")
    if pid is None:
        return None
    app_elem = AX.AXUIElementCreateApplication(pid)
    for _ in range(8):
        windows = children(app_elem)
        if windows and attr(windows[0], "AXTitle") == pane_title:
            return app_elem
        time.sleep(0.6)
    actual = attr(children(app_elem)[0], "AXTitle") if children(app_elem) else "no window"
    print(f"wrong pane: wanted '{pane_title}', System Settings is showing '{actual}'")
    return None


def grant(pane_key):
    url, pane_name = PANES[pane_key]
    app_elem = open_pane(url, pane_name)
    if app_elem is None:
        dismiss_system_prompt()
        app_elem = open_pane(url, pane_name)
    if app_elem is None:
        print(f"{pane_key}: could not reach the {pane_name} pane")
        return False

    toggle = None
    for _ in range(10):  # the list populates asynchronously after the pane draws
        toggle = find_toggle(app_elem, APP_LABEL)
        if toggle is not None:
            break
        time.sleep(0.6)

    if toggle is None:
        print(f"{pane_key}: no '{APP_LABEL}' row in {pane_name} -- "
              f"launch Taloa first so it registers itself")
        if pane_key == "screen-recording":
            # This was real, not hypothetical: the pane listed nine other apps
            # and no Taloa, so there was nothing to switch on. An app only
            # registers by attempting a capture from inside its own process.
            print("  (a request alone does not register an app; it must attempt "
                  "an in-process capture -- see requestScreenRecording)")
        return False

    if enabled(toggle):
        print(f"{pane_key}: already enabled")
        return True

    AX.AXUIElementPerformAction(toggle, "AXPress")
    time.sleep(0.8)
    if enabled(toggle):
        print(f"{pane_key}: enabled")
        return True

    print(f"{pane_key}: press did not take (value={attr(toggle, 'AXValue')}) -- "
          f"System Settings may be asking for authentication")
    return False


def main():
    requested = sys.argv[1:] or list(PANES)
    unknown = [p for p in requested if p not in PANES]
    if unknown:
        print(f"unknown pane(s): {', '.join(unknown)}; known: {', '.join(PANES)}")
        return 2
    return 0 if all([grant(p) for p in requested]) else 1


if __name__ == "__main__":
    sys.exit(main())
