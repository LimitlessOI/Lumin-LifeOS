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

// Homing, not wandering (2026-08-10). History: started as free-roam
// ("can you make it walk around?"), corrected same session to a bounded
// home-nook wander ("don't have her interrupt where we're at"), then
// stopped entirely per direct founder ask: "have her in a set place not
// floting around please." She now eases to and stays at one fixed point
// (the center of her home corner) -- the timer/easing machinery below is
// unchanged (still real, still used for the settle-after-drag-snap
// animation), only the target is now constant instead of re-randomized.
// Founder also referenced a fuller concept -- a little house, a chair, a
// campfire, a bed -- that isn't captured in this repo anywhere (searched;
// not found). Still an honest gap, independent of this simplification.
let homeNookSize: CGFloat = 320
var wanderTargets: [NSPoint] = []
var wanderNextChangeAt: [TimeInterval] = []

// Corner-snap home positions (2026-08-10, founder's own description of the
// interaction he wants: "you can move it around any way you want to. It
// can stay in some standard places... one of the four corners maybe...
// somewhere out of the way"). Persisted so the choice sticks across
// relaunches, not just for this run.
//
// Per-screen, not global (2026-08-10, real gap found -- founder: "I am on
// my laptop only [right now], I often work in my office with 2 other
// monitors connected, you are going to have to solve that one"). A single
// global HomeCorner would mean snapping her to a corner on one monitor
// silently retargets her on every OTHER monitor too the next time each one
// re-homes -- wrong for a 3-screen office setup where each display likely
// wants its own corner. Keyed on NSScreen.localizedName, which macOS keeps
// stable for the same physical display across reconnects/power cycles
// (unlike screen INDEX, which can reshuffle depending on connect order) --
// so the office setup remembers per-monitor even though only the laptop
// panel is connected and testable right now.
enum HomeCorner: String, CaseIterable {
    case bottomLeft, bottomRight, topLeft, topRight

    private static let defaultsKeyPrefix = "taloa_home_corner_"
    private static let legacyGlobalKey = "taloa_home_corner" // pre-per-screen value; honored once as a migration fallback

    private static func defaultsKey(for screen: NSScreen) -> String {
        defaultsKeyPrefix + screen.localizedName.replacingOccurrences(of: " ", with: "_")
    }

    static func current(for screen: NSScreen) -> HomeCorner {
        if let raw = UserDefaults.standard.string(forKey: defaultsKey(for: screen)), let c = HomeCorner(rawValue: raw) {
            return c
        }
        if let raw = UserDefaults.standard.string(forKey: legacyGlobalKey), let c = HomeCorner(rawValue: raw) {
            return c
        }
        return .bottomLeft // known-good default: not the notification-stack corner (see below)
    }

    static func setCurrent(_ corner: HomeCorner, for screen: NSScreen) {
        UserDefaults.standard.set(corner.rawValue, forKey: defaultsKey(for: screen))
    }

    /// Nearest corner to a window's current center, for real drag-to-snap.
    static func nearest(to windowCenter: NSPoint, on screen: NSScreen) -> HomeCorner {
        let sf = screen.visibleFrame
        let right = windowCenter.x >= sf.midX
        let top = windowCenter.y >= sf.midY
        switch (right, top) {
        case (false, false): return .bottomLeft
        case (true, false): return .bottomRight
        case (false, true): return .topLeft
        case (true, true): return .topRight
        }
    }

    func origin(in screen: NSScreen, size: CGFloat, margin: CGFloat) -> NSPoint {
        let sf = screen.visibleFrame
        switch self {
        case .bottomLeft: return NSPoint(x: sf.minX + margin, y: sf.minY + margin)
        case .bottomRight: return NSPoint(x: sf.maxX - margin - size, y: sf.minY + margin)
        case .topLeft: return NSPoint(x: sf.minX + margin, y: sf.maxY - margin - size)
        case .topRight: return NSPoint(x: sf.maxX - margin - size, y: sf.maxY - margin - size)
        }
    }
}

func homeRect(for screen: NSScreen) -> NSRect {
    // Default corner is bottom-left, not bottom-right: macOS stacks
    // notification banners down from the top-right corner, and a long
    // queue of them (real problem hit live earlier tonight -- 11+ stacked
    // "Login Item Added" banners from repeated dev relaunches) can reach
    // far enough down to cover a bottom-right nook entirely. All four
    // corners are real, available choices (HomeCorner) -- bottom-left is
    // just the safe starting default, not the only option.
    let origin = HomeCorner.current(for: screen).origin(in: screen, size: homeNookSize, margin: 20)
    return NSRect(origin: origin, size: NSSize(width: homeNookSize, height: homeNookSize))
}

/// Real drag-to-snap: called when the founder finishes dragging her (not a
/// click) -- picks whichever of the four corners she's now closest to as
/// the new, persisted home, and animates a real snap there rather than
/// waiting for the slow wander drift to catch up.
func snapToNearestCorner(window: OverlayWindow) {
    guard let screen = window.screen ?? NSScreen.screens.first else { return }
    let frame = window.frame
    let center = NSPoint(x: frame.midX, y: frame.midY)
    let corner = HomeCorner.nearest(to: center, on: screen)
    HomeCorner.setCurrent(corner, for: screen)
    let target = corner.origin(in: screen, size: frame.width, margin: 20)
    window.setFrame(NSRect(origin: target, size: frame.size), display: true, animate: true)
    if let idx = overlayWindows.firstIndex(where: { $0 === window }) {
        wanderTargets[idx] = pickWanderTarget(in: homeRect(for: screen), windowSize: frame.size)
        wanderNextChangeAt[idx] = ProcessInfo.processInfo.systemUptime + Double.random(in: 4...9)
    }
    FileHandle.standardError.write("Taloa: snapped home to \(corner)\n".data(using: .utf8)!)
}

/// Real simplification, founder direct (2026-08-10): "have her in a set
/// place not floting around please." Random wandering-within-the-nook is
/// removed -- she now always settles at (and stays at) the exact center of
/// her home corner. Kept as a function (not inlined) because the smooth
/// ease-toward-target animation in the timer below, and the settle-after-
/// drag-snap follow-up, both still legitimately need a target point to
/// converge on; only the RANDOMNESS is gone, not the underlying mechanism.
func pickWanderTarget(in home: NSRect, windowSize: NSSize) -> NSPoint {
    NSPoint(x: home.midX, y: home.midY)
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

// 10Hz, not 30Hz: each tick moves three borderless transparent windows, which
// forces the compositor to recomposite every display it touches. See the CPU
// note in TaloaImageCharacterView -- `ease` below is re-derived for this rate
// so the drift travels at exactly the same speed as before.
let wanderTimer = Timer(timeInterval: 1.0 / 10.0, repeats: true) { _ in
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

        let ease: CGFloat = 0.044 // same per-second glide as 0.015 did at 30Hz
        let newCenter = NSPoint(x: currentCenter.x + dx * ease, y: currentCenter.y + dy * ease)
        window.setFrameOrigin(NSPoint(x: newCenter.x - frame.width / 2, y: newCenter.y - frame.height / 2))
    }
}
wanderTimer.tolerance = 0.05
RunLoop.main.add(wanderTimer, forMode: .common)

// Rebuild on monitor connect/disconnect/resolution change so the overlay
// doesn't silently vanish or end up stranded off a screen that went away.
NotificationCenter.default.addObserver(
    forName: NSApplication.didChangeScreenParametersNotification,
    object: nil,
    queue: .main
) { _ in
    rebuildOverlaysForAllScreens()
}

// Corner-snap on real drag-end -- see snapToNearestCorner above.
NotificationCenter.default.addObserver(
    forName: .taloaDidFinishDrag,
    object: nil,
    queue: .main
) { note in
    guard let window = note.object as? OverlayWindow else { return }
    snapToNearestCorner(window: window)
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

// Real cursor control + full-screen vision (2026-08-10) -- see
// ScreenControl.swift header for the founder quotes and the two real
// permission boundaries this depends on. Requesting trust here (not lazily
// on first use) so the System Settings entry exists immediately at launch,
// not only after some future feature first tries to use it.
ScreenControl.requestAccessibilityTrust()
ScreenControl.startDebugTriggerPolling()
ScreenControl.startCommandChannel()
// Screen Recording is a separate grant from Accessibility and fails silently
// rather than loudly -- see the note on screenRecordingGranted(). Asking at
// launch means both prompts appear in one sitting instead of the app quietly
// producing wallpaper screenshots for weeks.
ScreenControl.requestScreenRecording()
TaloaLog.write("app.launched", "windows=\(overlayWindows.count) displays=\(TaloaShow.displayBounds().count) can_click=\(ScreenControl.isAccessibilityTrusted()) can_see=\(ScreenControl.screenRecordingGranted()) can_show=true")
for display in TaloaShow.displayBounds() {
    TaloaLog.write("app.display", "index=\(display.index) name=\(display.name) bounds=\(Int(display.bounds.origin.x)),\(Int(display.bounds.origin.y)),\(Int(display.bounds.width)),\(Int(display.bounds.height))")
}
if !ScreenControl.isAccessibilityTrusted() {
    TaloaLog.write("app.accessibility_missing", "real cursor control needs Accessibility checked in System Settings > Privacy & Security")
}
if !ScreenControl.screenRecordingGranted() {
    TaloaLog.write("app.screen_recording_missing", "captures will contain wallpaper only -- every window silently absent")
    TaloaShow.caption("I cannot see your screen yet — enable Taloa under Privacy & Security > Screen Recording", seconds: 10)
}

app.run()
