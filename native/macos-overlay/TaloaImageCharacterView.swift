// SYNOPSIS: Native small-state character view for the Taloa overlay -- a
// real generated character (image.pollinations.ai + local rembg for
// transparency, see Assets/) that cross-fades between three real frames
// (idle / blink / speaking) instead of sitting as one frozen photo. Direct
// founder correction 2026-08-10: "it made it look more real, but it's not a
// character, it's an image." A still picture, however good, isn't alive --
// this adds real periodic blinking and a speaking frame swapped in during
// real gesture events, so something actually changes over time and in
// response to events, not just glow/breathe on one image.
//
// Gesture vocabulary (2026-08-10, founder ask: spren/Way of Kings for
// "reacts and means something" vs. aimless wandering; then narrowed to
// Seons/Elantris -- a companion that forms a small shape to communicate --
// as the honestly-scoped alpha version, not a public release, "the
// animations and things we'll need" before a paid animation stack exists).
// Previously every real event produced the identical cast-a-spell pulse,
// which meant no event actually read as meaning anything distinct. This
// splits that into three real, differently-drawn reactions -- cast (neutral,
// "something is happening"), celebrate (bright, rising, traces a small
// checkmark -- the literal Seons touch), concern (duller, sinking, no
// trace).
//
// REAL BUG FOUND AND FIXED SAME DAY: cast/celebrate/concern were only ever
// triggered from ContainerView's WKNavigationDelegate callbacks, which only
// exist once she's expanded to full app size and a page is loading inside
// her -- meaning in her default small/badge form (how she's on screen
// essentially all the time) none of this could ever fire. Founder feedback,
// direct: "it looks exactly the same." Correct -- there was nothing to see.
// Fixed with a second, independent real trigger owned by this view directly:
// a periodic health check against the real production LifeOS endpoint
// (healthPollLoop below). It fires celebrate()/concern() only on the FIRST
// confirmed state and on real transitions (up->down, down->up) -- never on
// every poll -- so it stays "reacts to something true," not ambient
// decoration, and works regardless of the container's expanded state.
// Known honest limit: blink timing is a local timer, not driven by real
// perception/conversation state -- that wiring still doesn't exist. Full
// purposeful movement (walking to a spot, sitting, pushing a button) needs
// scene assets that don't exist anywhere in this repo yet (searched; not
// found, see main.swift) -- deliberately not attempted in this pass.
// See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
import Cocoa

enum TaloaExpression: String {
    case neutral, happy, thoughtful, concerned, surprised
}

enum TaloaMode: String {
    case idle, listening, thinking, speaking, impatient
}

private enum FrameKind { case idle, blink, speak }

/// Real, distinct reactions to real events -- not decoration. Each one is
/// only ever triggered from ContainerView's WKNavigationDelegate callbacks.
private enum TaloaGestureKind { case none, cast, celebrate, concern }

final class TaloaImageCharacterView: NSView {
    var expression: TaloaExpression = .neutral
    var mode: TaloaMode = .idle

    private var phase: CGFloat = 0
    private var timer: Timer?

    private let idleImage: NSImage?
    private let blinkImage: NSImage?
    private let speakImage: NSImage?

    private var currentFrame: FrameKind = .idle
    private var currentImage: NSImage?
    private var previousImage: NSImage?
    private var blendProgress: CGFloat = 1.0
    private let blendSpeed: CGFloat = 1.0 / 0.12 // ~120ms cross-fade

    private var nextBlinkAt: CGFloat = 0
    private var blinkUntil: CGFloat = 0

    private var gesture: TaloaGestureKind = .none
    private var gestureStartedAt: CGFloat = 0
    private var gestureDuration: CGFloat = 0.9
    private var gestureParticles: [(angle: CGFloat, speed: CGFloat, size: CGFloat)] = []

    // Real, independent trigger -- see header comment. Not tied to the
    // container's expanded/WebView state at all.
    private static let healthURL = URL(string: "https://lumin-web-production-e3a9.up.railway.app/health")!
    private static let healthPollInterval: TimeInterval = 30
    private var healthTimer: Timer?
    private var lastHealthOk: Bool?

    override init(frame frameRect: NSRect) {
        idleImage = TaloaImageCharacterView.loadImage(named: "TaloaCharacter")
        blinkImage = TaloaImageCharacterView.loadImage(named: "TaloaCharacterBlink")
        speakImage = TaloaImageCharacterView.loadImage(named: "TaloaCharacterSpeak")
        super.init(frame: frameRect)
        currentImage = idleImage
        wantsLayer = true
        layer?.masksToBounds = false
        nextBlinkAt = CGFloat.random(in: 2.5...5)

        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            self?.tick()
        }

        pollHealth()
        healthTimer = Timer.scheduledTimer(withTimeInterval: Self.healthPollInterval, repeats: true) { [weak self] _ in
            self?.pollHealth()
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    /// Real signal, independent of the container's expanded/WebView state:
    /// is the actual production LifeOS backend reachable right now. Fires a
    /// gesture on the first confirmed state and on any real transition --
    /// never on every poll, so this stays "reacts to something true" and
    /// not a repeating decoration.
    private func pollHealth() {
        var request = URLRequest(url: Self.healthURL)
        request.timeoutInterval = 8
        let task = URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            let ok = error == nil && (response as? HTTPURLResponse).map { $0.statusCode == 200 } == true
            DispatchQueue.main.async {
                guard let self = self else { return }
                let changed = self.lastHealthOk != ok
                self.lastHealthOk = ok
                guard changed else { return }
                if ok {
                    self.celebrate()
                } else {
                    self.concern()
                }
            }
        }
        task.resume()
    }

    private static func loadImage(named name: String) -> NSImage? {
        if let path = Bundle.main.path(forResource: name, ofType: "png") {
            return NSImage(contentsOfFile: path)
        }
        let devPath = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Assets/\(name).png").path
        return NSImage(contentsOfFile: devPath)
    }

    /// Neutral "something is happening" pulse. Call this from a real event
    /// (page navigation starting) -- never on a timer/loop.
    func castSpell() {
        beginGesture(.cast, duration: 0.9)
    }

    /// Real event: something the founder was watching for just succeeded
    /// (page finished loading). Brighter, rises, traces a small checkmark --
    /// the concrete Seons (Elantris) touch: a companion that forms a shape
    /// to communicate, not just glows. Deliberately drawn differently from
    /// `concern()` so success and failure don't read identically.
    func celebrate() {
        beginGesture(.celebrate, duration: 1.1)
    }

    /// Real event: navigation failed. Duller, sinks instead of rising, no
    /// trace -- reads as "something's wrong," not just "she's active."
    func concern() {
        beginGesture(.concern, duration: 1.1)
    }

    private func beginGesture(_ kind: TaloaGestureKind, duration: CGFloat) {
        FileHandle.standardError.write("Taloa: gesture \(kind) (real event)\n".data(using: .utf8)!)
        gesture = kind
        gestureStartedAt = phase
        gestureDuration = duration
        gestureParticles = (0..<10).map { _ in
            (angle: CGFloat.random(in: 0..<(2 * .pi)), speed: CGFloat.random(in: 0.7...1.3), size: CGFloat.random(in: 2...4.5))
        }
    }

    private func tick() {
        let dt: CGFloat = 1.0 / 30.0
        phase += dt

        if gesture != .none, phase - gestureStartedAt > gestureDuration {
            gesture = .none
        }

        // Local idle-blink timer -- honest limitation: not driven by real
        // perception/conversation state, same as the vector version before it.
        if currentFrame != .blink, phase >= nextBlinkAt {
            blinkUntil = phase + 0.18
        }
        if phase < blinkUntil {
            setFrame(.blink)
        } else if gesture != .none {
            setFrame(.speak)
        } else {
            if currentFrame == .blink, phase >= blinkUntil {
                nextBlinkAt = phase + CGFloat.random(in: 3...7)
            }
            setFrame(.idle)
        }

        if blendProgress < 1 {
            blendProgress = min(1, blendProgress + dt * blendSpeed)
        }

        needsDisplay = true
    }

    private func setFrame(_ kind: FrameKind) {
        guard kind != currentFrame else { return }
        if kind == .blink {
            FileHandle.standardError.write("Taloa: blink\n".data(using: .utf8)!)
        }
        currentFrame = kind
        previousImage = currentImage
        let target: NSImage?
        switch kind {
        case .idle: target = idleImage
        case .blink: target = blinkImage
        case .speak: target = speakImage
        }
        currentImage = target ?? idleImage
        blendProgress = 0
    }

    private func coreColor() -> NSColor {
        switch mode {
        case .idle: return NSColor(calibratedRed: 0.55, green: 0.85, blue: 1.0, alpha: 1.0)
        case .listening: return NSColor(calibratedRed: 0.45, green: 1.0, blue: 0.85, alpha: 1.0)
        case .thinking: return NSColor(calibratedRed: 1.0, green: 0.78, blue: 0.35, alpha: 1.0)
        case .speaking: return NSColor(calibratedRed: 0.55, green: 0.75, blue: 1.0, alpha: 1.0)
        case .impatient: return NSColor(calibratedRed: 1.0, green: 0.45, blue: 0.35, alpha: 1.0)
        }
    }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.set()
        dirtyRect.fill()

        guard let image = currentImage ?? idleImage else {
            // Fail visibly, not silently -- an empty transparent view would look
            // like "it's still not working" with no clue why.
            NSColor.red.withAlphaComponent(0.6).setFill()
            NSBezierPath(ovalIn: bounds.insetBy(dx: bounds.width * 0.3, dy: bounds.height * 0.3)).fill()
            return
        }

        let color = coreColor()
        let gestureActive = gesture != .none
        let gestureT = gestureActive ? min(1.0, (phase - gestureStartedAt) / gestureDuration) : 0
        let gesturePulse = gestureActive ? sin(gestureT * .pi) : 0

        let breathe = 1.0 + 0.02 * sin(phase * 1.0) + 0.08 * gesturePulse
        let hover = sin(phase * 1.1) * bounds.height * 0.02

        let baseSize = bounds.insetBy(dx: bounds.width * 0.06, dy: bounds.height * 0.06).size
        let w = baseSize.width * breathe
        let h = baseSize.height * breathe
        let drawRect = NSRect(x: bounds.midX - w / 2, y: bounds.midY - h / 2 + hover, width: w, height: h)

        NSGraphicsContext.saveGraphicsState()
        let glow = NSShadow()
        glow.shadowColor = color.withAlphaComponent(0.65 + 0.3 * gesturePulse)
        glow.shadowBlurRadius = min(bounds.width, bounds.height) * (0.18 + 0.12 * gesturePulse)
        glow.shadowOffset = .zero
        glow.set()

        if blendProgress < 1, let prev = previousImage {
            prev.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0 - blendProgress)
            image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: blendProgress)
        } else {
            image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0)
        }
        NSGraphicsContext.restoreGraphicsState()

        if gestureActive {
            drawGestureEffect(gesture, center: NSPoint(x: bounds.midX, y: bounds.midY + hover), t: gestureT, baseColor: color)
        }
    }

    /// Dispatches to a per-gesture look -- each one only ever plays for
    /// ~1s tied to a real triggering event, never ambient decoration.
    private func drawGestureEffect(_ kind: TaloaGestureKind, center: NSPoint, t: CGFloat, baseColor: NSColor) {
        let fade = 1.0 - t
        let maxRadius = min(bounds.width, bounds.height) * 0.6

        switch kind {
        case .none:
            return

        case .cast:
            let sparkle = baseColor.blended(withFraction: 0.7, of: .white) ?? .white
            drawRing(center: center, radius: maxRadius * t, fade: fade, color: sparkle, widthScale: 1.0)
            drawParticles(center: center, t: t, maxRadius: maxRadius, fade: fade, color: sparkle, verticalBias: 0)

        case .celebrate:
            let sparkle = baseColor.blended(withFraction: 0.85, of: .white) ?? .white
            drawRing(center: center, radius: maxRadius * t, fade: fade, color: sparkle, widthScale: 1.2)
            drawParticles(center: center, t: t, maxRadius: maxRadius, fade: fade, color: sparkle, verticalBias: 0.6)
            drawCheckTrace(center: center, t: t, color: sparkle)

        case .concern:
            // Deliberately duller/smaller/sinking, no trace -- the whole
            // point of splitting this from `cast` is that a failure should
            // not look like the same event as a success.
            let dull = NSColor(calibratedRed: 0.85, green: 0.45, blue: 0.25, alpha: 1)
            let sparkle = baseColor.blended(withFraction: 0.7, of: dull) ?? dull
            drawRing(center: center, radius: maxRadius * t * 0.6, fade: fade * 0.7, color: sparkle, widthScale: 0.7)
            drawParticles(center: center, t: t, maxRadius: maxRadius * 0.5, fade: fade * 0.7, color: sparkle, verticalBias: -0.5)
        }
    }

    private func drawRing(center: NSPoint, radius: CGFloat, fade: CGFloat, color: NSColor, widthScale: CGFloat) {
        guard radius > 0.5 else { return }
        let ring = NSBezierPath(ovalIn: NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
        ring.lineWidth = max(1.0, bounds.width * 0.015) * widthScale * fade
        color.withAlphaComponent(0.7 * fade).setStroke()
        ring.stroke()
    }

    private func drawParticles(center: NSPoint, t: CGFloat, maxRadius: CGFloat, fade: CGFloat, color: NSColor, verticalBias: CGFloat) {
        for p in gestureParticles {
            let dist = maxRadius * 0.8 * t * p.speed
            let x = center.x + cos(p.angle) * dist
            let y = center.y + sin(p.angle) * dist + maxRadius * verticalBias * t
            let dot = NSBezierPath(ovalIn: NSRect(x: x - p.size / 2, y: y - p.size / 2, width: p.size, height: p.size))
            color.withAlphaComponent(fade).setFill()
            dot.fill()
        }
    }

    /// A small checkmark traced progressively in light near her -- the
    /// literal Seons (Elantris) reference Adam asked for 2026-08-10: a
    /// companion that forms a shape to communicate, not just pulses.
    private func drawCheckTrace(center: NSPoint, t: CGFloat, color: NSColor) {
        let size = min(bounds.width, bounds.height) * 0.22
        let start = NSPoint(x: center.x - size * 0.35, y: center.y + size * 0.3)
        let mid = NSPoint(x: center.x - size * 0.05, y: center.y + size * 0.05)
        let top = NSPoint(x: center.x + size * 0.5, y: center.y + size * 0.55)

        // Traces in the first ~60% of the gesture, then holds briefly before fading.
        let revealT = min(1.0, t / 0.6)
        let path = NSBezierPath()
        path.lineWidth = max(1.5, bounds.width * 0.02)
        path.lineCapStyle = .round
        path.lineJoinStyle = .round

        if revealT <= 0.5 {
            path.move(to: start)
            path.line(to: lerp(start, mid, revealT / 0.5))
        } else {
            path.move(to: start)
            path.line(to: mid)
            path.line(to: lerp(mid, top, (revealT - 0.5) / 0.5))
        }

        color.withAlphaComponent(0.9 * min(1.0, (1.0 - t) + 0.3)).setStroke()
        path.stroke()
    }

    private func lerp(_ a: NSPoint, _ b: NSPoint, _ t: CGFloat) -> NSPoint {
        NSPoint(x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t)
    }
}
