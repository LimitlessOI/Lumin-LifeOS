// SYNOPSIS: Real, runnable proof-of-concept for a system-wide floating overlay window --
// borderless, transparent, always-on-top, visible across every macOS Space regardless of
// which app has focus. This is the missing "visual compositor" layer distinct from the
// existing AX-driving (input control) and browser-extension overlay (browser-tab-scoped)
// work already shipped elsewhere in this repo. Run directly: `swift scripts/prototype-macos-floating-overlay.swift`
// Drag the purple "T" badge anywhere; switch apps/Spaces to confirm it stays on top. Ctrl+C to quit.

import Cocoa

class OverlayWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

class OverlayView: NSView {
    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.set()
        dirtyRect.fill()

        let circleRect = bounds.insetBy(dx: 4, dy: 4)
        let path = NSBezierPath(ovalIn: circleRect)
        NSColor(calibratedRed: 0.31, green: 0.27, blue: 0.90, alpha: 0.92).setFill()
        path.fill()
        NSColor.white.withAlphaComponent(0.6).setStroke()
        path.lineWidth = 2
        path.stroke()

        let text = "T"
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 28, weight: .bold),
            .foregroundColor: NSColor.white
        ]
        let size = text.size(withAttributes: attrs)
        let point = NSPoint(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2)
        text.draw(at: point, withAttributes: attrs)
    }

    override func mouseDragged(with event: NSEvent) {
        guard let window = self.window else { return }
        var frame = window.frame
        frame.origin.x += event.deltaX
        frame.origin.y -= event.deltaY
        window.setFrame(frame, display: true)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory) // no Dock icon, no menu bar -- stays a background-style overlay

let screenFrame = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
let size: CGFloat = 80
let windowRect = NSRect(
    x: screenFrame.maxX - size - 40,
    y: screenFrame.minY + 100,
    width: size,
    height: size
)

let window = OverlayWindow(
    contentRect: windowRect,
    styleMask: [.borderless],
    backing: .buffered,
    defer: false
)
window.isOpaque = false
window.backgroundColor = .clear
window.level = .floating // above normal app windows; NOT above the menu bar/screensaver
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
window.hasShadow = true
window.ignoresMouseEvents = false // false = draggable/clickable; true = click-through mode for later

let view = OverlayView(frame: NSRect(x: 0, y: 0, width: size, height: size))
window.contentView = view

window.makeKeyAndOrderFront(nil)

FileHandle.standardError.write("Taloa overlay running -- above every app, every Space. Ctrl+C to quit.\n".data(using: .utf8)!)
app.run()
