// SYNOPSIS: Taloa floating overlay -- app bootstrap. Borderless/transparent/
// always-on-top window, freeform resize, expands into the real /lifeos shell.
// One window per physical monitor -- canJoinAllSpaces only covers virtual
// desktop Spaces on a single screen, not multi-monitor presence, which was
// a real bug found live 2026-08-10 (window only appeared on one of three
// monitors). See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
import Cocoa
import CoreGraphics
import ServiceManagement

let app = NSApplication.shared
app.setActivationPolicy(.accessory) // no Dock icon / menu bar -- background-style overlay

let initialSize: CGFloat = 120 // bumped again 2026-08-10 after live confirmation it was still easy to miss at 96pt
var overlayWindows: [OverlayWindow] = []
var clickThrough = false

// Autonomous wandering (2026-08-10, founder ask: "can you make it walk
// around?"), corrected same session: "don't have her interrupt where we're
// at" -- free-roaming across the whole screen could drift over whatever the
// founder is actively working on. Bounded to a small "home" nook per screen
// (near the same corner it originally spawned in) so she has a little
// territory to putter around in without crossing active work content.
// Founder also referenced a fuller concept -- a little house, a chair, a
// campfire, a bed -- that isn't captured in this repo anywhere (searched;
// not found). This bounded-nook version is a real step toward that ("a
// place she belongs" rather than free-roam) but is not that full scene --
// named honestly, not presented as the same thing.
let homeNookSize: CGFloat = 320
var wanderTargets: [NSPoint] = []
var wanderNextChangeAt: [TimeInterval] = []

func homeRect(for screen: NSScreen) -> NSRect {
    // Bottom-left, not bottom-right: macOS stacks notification banners down
    // from the top-right corner, and a long queue of them (real problem hit
    // live tonight -- 11+ stacked "Login Item Added" banners from repeated
    // dev relaunches) can reach far enough down to cover a bottom-right
    // nook entirely. Bottom-left has no standard system UI that claims it.
    let sf = screen.visibleFrame
    return NSRect(x: sf.minX + 20, y: sf.minY + 20, width: homeNookSize, height: homeNookSize)
}

func pickWanderTarget(in home: NSRect, windowSize: NSSize) -> NSPoint {
    let usable = home.insetBy(dx: windowSize.width / 2, dy: windowSize.height / 2)
    guard usable.width > 0, usable.height > 0 else {
        return NSPoint(x: home.midX, y: home.midY)
    }
    return NSPoint(x: CGFloat.random(in: usable.minX...usable.maxX),
                    y: CGFloat.random(in: usable.minY...usable.maxY))
}

func makeOverlayWindow(for screen: NSScreen) -> OverlayWindow {
    let screenFrame = screen.frame
    let windowRect = NSRect(
        x: screenFrame.minX + 40, // bottom-left, matches homeRect -- avoids the notification-stack corner
        y: screenFrame.minY + 100,
        width: initialSize,
        height: initialSize
    )

    let window = OverlayWindow(
        contentRect: windowRect,
        styleMask: [.borderless],
        backing: .buffered,
        defer: false
    )
    window.isOpaque = false
    window.backgroundColor = .clear
    // REVERTED 2026-08-10: .maximumWindow (the actual CGWindowLevel ceiling,
    // reserved for things like the lock screen) was tried and rolled back
    // immediately -- the two external monitors dropped out of
    // `system_profiler`'s display list (3 -> 1, built-in only) right after
    // switching to it. Not proven as the cause, but treated as guilty until
    // proven innocent rather than left active while investigating further at
    // this hour. .screenSaver is the safe known-good level -- real
    // improvement over .floating, imperfect (an IDE panel could still
    // partially cover her), but with no observed side effects.
    window.level = .screenSaver
    window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
    window.hasShadow = true
    window.isMovableByWindowBackground = false // ContainerView handles drag/resize itself
    window.minSize = NSSize(width: ContainerView.minSize, height: ContainerView.minSize)

    let container = ContainerView(frame: NSRect(origin: .zero, size: windowRect.size))
    window.contentView = container
    window.ignoresMouseEvents = clickThrough

    window.makeKeyAndOrderFront(nil)
    return window
}

func rebuildOverlaysForAllScreens() {
    overlayWindows.forEach { $0.orderOut(nil) }
    let screens = NSScreen.screens
    overlayWindows = screens.map { makeOverlayWindow(for: $0) }
    let now = ProcessInfo.processInfo.systemUptime
    wanderTargets = zip(overlayWindows, screens).map { window, screen in
        pickWanderTarget(in: homeRect(for: screen), windowSize: window.frame.size)
    }
    wanderNextChangeAt = overlayWindows.map { _ in now + Double.random(in: 3...7) }
    FileHandle.standardError.write(
        "Taloa overlay: \(overlayWindows.count) window(s), one per monitor, wandering enabled.\n".data(using: .utf8)!
    )
}

rebuildOverlaysForAllScreens()

Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { _ in
    let now = ProcessInfo.processInfo.systemUptime
    for i in 0..<overlayWindows.count {
        guard i < wanderTargets.count, i < wanderNextChangeAt.count else { continue }
        let window = overlayWindows[i]
        guard let container = window.contentView as? ContainerView else { continue }
        if container.isUserInteracting || container.isExpanded { continue }

        if now >= wanderNextChangeAt[i], let screen = window.screen ?? NSScreen.screens.first {
            wanderTargets[i] = pickWanderTarget(in: homeRect(for: screen), windowSize: window.frame.size)
            wanderNextChangeAt[i] = now + Double.random(in: 4...9)
        }

        let frame = window.frame
        let target = wanderTargets[i]
        let currentCenter = NSPoint(x: frame.midX, y: frame.midY)
        let dx = target.x - currentCenter.x
        let dy = target.y - currentCenter.y
        if abs(dx) < 0.5, abs(dy) < 0.5 { continue }

        let ease: CGFloat = 0.015 // slow, graceful drift, not a snap
        let newCenter = NSPoint(x: currentCenter.x + dx * ease, y: currentCenter.y + dy * ease)
        window.setFrameOrigin(NSPoint(x: newCenter.x - frame.width / 2, y: newCenter.y - frame.height / 2))
    }
}

// Rebuild on monitor connect/disconnect/resolution change so the overlay
// doesn't silently vanish or end up stranded off a screen that went away.
NotificationCenter.default.addObserver(
    forName: NSApplication.didChangeScreenParametersNotification,
    object: nil,
    queue: .main
) { _ in
    rebuildOverlaysForAllScreens()
}

// Phase 5: click-through toggle (Cmd+Shift+T) so the overlay can be made
// non-interactive, across all monitors at once, without quitting it.
NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
    if event.modifierFlags.contains([.command, .shift]),
       event.charactersIgnoringModifiers?.lowercased() == "t" {
        clickThrough.toggle()
        overlayWindows.forEach { $0.ignoresMouseEvents = clickThrough }
        FileHandle.standardError.write("click-through: \(clickThrough)\n".data(using: .utf8)!)
        return nil
    }
    return event
}

FileHandle.standardError.write(
    "Taloa overlay running on every monitor -- drag any edge/corner to resize, past ~160pt it loads the real LifeOS app. Cmd+Shift+T toggles click-through.\n".data(using: .utf8)!
)

// Phase 5: launch-at-login, real only when running from an installed .app
// bundle (SMAppService requires it -- a bare swiftc binary will legitimately
// fail here, which is reported honestly rather than silently swallowed).
if #available(macOS 13.0, *), Bundle.main.bundleURL.pathExtension == "app" {
    do {
        if SMAppService.mainApp.status != .enabled {
            try SMAppService.mainApp.register()
            FileHandle.standardError.write("launch-at-login: registered\n".data(using: .utf8)!)
        } else {
            FileHandle.standardError.write("launch-at-login: already enabled\n".data(using: .utf8)!)
        }
    } catch {
        FileHandle.standardError.write("launch-at-login: FAILED - \(error)\n".data(using: .utf8)!)
    }
} else {
    FileHandle.standardError.write("launch-at-login: skipped (not running from a .app bundle)\n".data(using: .utf8)!)
}

app.run()
