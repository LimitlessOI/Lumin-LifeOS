// SYNOPSIS: Real OS-level screen vision and cursor control -- distinct from
// the Chrome extension's DOM-based drive (extension-drive-routes.js: text-only
// page description, invisible element.click()) and from ContainerView's own
// NSAccessibility conformance (accessibilityPerformPress -- also invisible,
// and scoped only to Taloa's own UI). Founder, direct, after being shown the
// extension's real mechanism and correctly rejecting it as not what he asked
// for: "I want to see the mouse move... you should be able to see the screen
// that's up and even apps that are open in the background." Then, clarifying
// scope: "you should be able to show me with my own mouse" -- there is only
// one system cursor on macOS; CGEventPost moves that exact cursor, not a
// separate overlay pointer.
//
// Two real, distinct macOS security boundaries gate this, neither
// scriptable around (the same ones any legitimate remote-control app like
// TeamViewer requires a human to grant):
//   - Accessibility trust (System Settings > Privacy & Security >
//     Accessibility) -- required for CGEventPost to actually move/click the
//     real cursor; without it, posted events are silently dropped.
//   - Screen Recording (System Settings > Privacy & Security > Screen
//     Recording) -- required for `screencapture` to capture real pixels of
//     other apps/windows instead of a black image.
// AXIsProcessTrustedWithOptions(prompt:true) triggers the real system
// dialog for the first; `screencapture` itself triggers/relies on the
// second, same binary already proven reliable this session for
// window-ID-scoped captures.
import Cocoa
import ApplicationServices

enum ScreenControl {
    static func isAccessibilityTrusted() -> Bool {
        AXIsProcessTrusted()
    }

    /// One-time system prompt adding Taloa to the Accessibility list. Does
    /// NOT check the box itself -- that's the founder's own click, by
    /// design (macOS security boundary, not a gap in this code).
    static func requestAccessibilityTrust() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        _ = AXIsProcessTrustedWithOptions([key: true] as CFDictionary)
    }

    /// Moves and clicks the real system cursor -- the same one the
    /// founder's own trackpad/mouse controls. Silently a no-op at the OS
    /// level if Accessibility trust hasn't been granted yet (posted events
    /// are dropped, not errored) -- callers should check
    /// isAccessibilityTrusted() first to give an honest answer instead of
    /// claiming success blindly.
    static func moveMouseAndClick(to point: CGPoint) {
        if let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left) {
            move.post(tap: .cghidEventTap)
        }
        usleep(150_000) // real, visible travel time before the click, not instant teleport-then-click
        if let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left) {
            down.post(tap: .cghidEventTap)
        }
        usleep(60_000)
        if let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left) {
            up.post(tap: .cghidEventTap)
        }
    }

    /// Real cursor location as reported by the OS itself -- independent
    /// verification that a move actually happened, not just that we asked
    /// it to.
    static func currentMouseLocation() -> CGPoint? {
        CGEvent(source: nil)?.location
    }

    /// Real synthetic typing -- found necessary live (2026-08-11) while
    /// verifying the chat drawer end to end: setting a WKWebView-hosted
    /// textarea's AXValue directly via the Accessibility API (the same
    /// technique used to check System Settings' Accessibility checkbox)
    /// silently does NOT update the page's own JS-observed state -- native
    /// AppKit controls and JS-framework-driven WKWebView text fields behave
    /// differently under accessibility automation. Sending a message that
    /// way appeared to succeed (no error) but never actually reached the
    /// chat. Real keyboard events via CGEventKeyboardSetUnicodeString fire
    /// the same input/keyup events a real keystroke would, so the page's
    /// own JS sees it exactly like the founder's own typing -- this is also
    /// exactly the `type` action the screen-agent decision endpoint (see
    /// docs/products/universal-overlay/PRODUCT_HOME.md 2026-08-10 receipt,
    /// BuilderOS handoff) will need, not just a test-only helper.
    static func typeText(_ text: String) {
        for scalar in text.utf16 {
            var chars: [UniChar] = [scalar]
            guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: true) else { continue }
            down.keyboardSetUnicodeString(stringLength: chars.count, unicodeString: &chars)
            down.post(tap: .cghidEventTap)
            guard let up = CGEvent(keyboardEventSource: nil, virtualKey: 0, keyDown: false) else { continue }
            up.keyboardSetUnicodeString(stringLength: chars.count, unicodeString: &chars)
            up.post(tap: .cghidEventTap)
            usleep(12_000)
        }
    }

    /// Real Return keypress -- separate from typeText since Return isn't a
    /// Unicode character event in the same sense; uses the real virtual
    /// keycode (36 on macOS) so it's indistinguishable from a real keypress.
    static func pressReturn() {
        guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 36, keyDown: true) else { return }
        down.post(tap: .cghidEventTap)
        usleep(30_000)
        guard let up = CGEvent(keyboardEventSource: nil, virtualKey: 36, keyDown: false) else { return }
        up.post(tap: .cghidEventTap)
    }

    /// Full-screen capture (not scoped to Taloa's own window) -- reuses the
    /// same `screencapture` binary already proven reliable this session for
    /// window-ID captures, so Screen Recording permission behavior is
    /// identical to what's already verified working, not a new unknown.
    @discardableResult
    static func captureFullScreen(to path: String) -> Bool {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        task.arguments = ["-x", path]
        do {
            try task.run()
            task.waitUntilExit()
            return task.terminationStatus == 0
        } catch {
            return false
        }
    }

    // MARK: - Debug trigger (temporary, for live verification with the
    // founder watching -- not a permanent control surface). Polls for a
    // marker file every 500ms; if present, parses "x,y" and performs a real
    // move+click, then deletes the marker and writes a result file with the
    // OS-reported before/after cursor position so success can be verified
    // independently of anyone visually watching the screen.
    private static let triggerPath = "/tmp/taloa-test-click"
    private static let resultPath = "/tmp/taloa-test-click-result"
    private static let captureTriggerPath = "/tmp/taloa-test-capture"
    private static let captureResultPath = "/tmp/taloa-test-capture-result"
    private static let typeTriggerPath = "/tmp/taloa-test-type"
    private static let typeResultPath = "/tmp/taloa-test-type-result"

    static func startDebugTriggerPolling() {
        Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            if let raw = try? String(contentsOfFile: triggerPath, encoding: .utf8) {
                try? FileManager.default.removeItem(atPath: triggerPath)
                let parts = raw.trimmingCharacters(in: .whitespacesAndNewlines).split(separator: ",")
                if parts.count == 2, let x = Double(parts[0]), let y = Double(parts[1]) {
                    let before = currentMouseLocation()
                    let trusted = isAccessibilityTrusted()
                    moveMouseAndClick(to: CGPoint(x: x, y: y))
                    usleep(100_000)
                    let after = currentMouseLocation()
                    let result = "trusted=\(trusted) before=\(String(describing: before)) after=\(String(describing: after))\n"
                    try? result.write(toFile: resultPath, atomically: true, encoding: .utf8)
                }
            }

            if let outPath = try? String(contentsOfFile: captureTriggerPath, encoding: .utf8) {
                try? FileManager.default.removeItem(atPath: captureTriggerPath)
                let dest = outPath.trimmingCharacters(in: .whitespacesAndNewlines)
                let ok = captureFullScreen(to: dest)
                let result = "ok=\(ok) dest=\(dest)\n"
                try? result.write(toFile: captureResultPath, atomically: true, encoding: .utf8)
            }

            if let raw = try? String(contentsOfFile: typeTriggerPath, encoding: .utf8) {
                try? FileManager.default.removeItem(atPath: typeTriggerPath)
                // Format: "x,y|text to type|press_return(0 or 1)"
                let parts = raw.trimmingCharacters(in: .newlines).split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
                if parts.count == 3, let x = Double(parts[0].split(separator: ",")[0]), let y = Double(parts[0].split(separator: ",")[1]) {
                    moveMouseAndClick(to: CGPoint(x: x, y: y))
                    usleep(200_000)
                    typeText(String(parts[1]))
                    usleep(150_000)
                    if parts[2].trimmingCharacters(in: .whitespaces) == "1" {
                        pressReturn()
                    }
                    try? "done\n".write(toFile: typeResultPath, atomically: true, encoding: .utf8)
                }
            }
        }
    }
}
