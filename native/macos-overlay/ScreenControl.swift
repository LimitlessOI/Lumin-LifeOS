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
        }
    }
}
