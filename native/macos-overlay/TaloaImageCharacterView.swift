// SYNOPSIS: Native small-state character view for the Taloa overlay -- a
// real generated character (image.pollinations.ai + local rembg for
// transparency, see Assets/) that now cross-fades between three real frames
// (idle / blink / speaking) instead of sitting as one frozen photo. Direct
// founder correction 2026-08-10: "it made it look more real, but it's not a
// character, it's an image." A still picture, however good, isn't alive --
// this adds real periodic blinking and a speaking frame swapped in during
// the same real cast-spell event as before, so something actually changes
// over time and in response to events, not just glow/breathe on one image.
// Known honest limit: blink timing is a local timer (like the earlier vector
// version had), not driven by real perception/conversation state -- that
// wiring still doesn't exist. Supersedes the single-image version of this
// same file.
// See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
import Cocoa

enum TaloaExpression: String {
    case neutral, happy, thoughtful, concerned, surprised
}

enum TaloaMode: String {
    case idle, listening, thinking, speaking, impatient
}

private enum FrameKind { case idle, blink, speak }

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

    private var castActive = false
    private var castStartedAt: CGFloat = 0
    private let castDuration: CGFloat = 0.9
    private var castParticles: [(angle: CGFloat, speed: CGFloat, size: CGFloat)] = []

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
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    private static func loadImage(named name: String) -> NSImage? {
        if let path = Bundle.main.path(forResource: name, ofType: "png") {
            return NSImage(contentsOfFile: path)
        }
        let devPath = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Assets/\(name).png").path
        return NSImage(contentsOfFile: devPath)
    }

    /// Trigger the cast-a-spell flourish + speaking frame. Call this from a
    /// real event (page navigation, layout change) -- never on a timer/loop.
    func castSpell() {
        FileHandle.standardError.write("Taloa: casting (real navigation event)\n".data(using: .utf8)!)
        castActive = true
        castStartedAt = phase
        castParticles = (0..<10).map { _ in
            (angle: CGFloat.random(in: 0..<(2 * .pi)), speed: CGFloat.random(in: 0.7...1.3), size: CGFloat.random(in: 2...4.5))
        }
    }

    private func tick() {
        let dt: CGFloat = 1.0 / 30.0
        phase += dt

        if castActive, phase - castStartedAt > castDuration {
            castActive = false
        }

        // Local idle-blink timer -- honest limitation: not driven by real
        // perception/conversation state, same as the vector version before it.
        if currentFrame != .blink, phase >= nextBlinkAt {
            blinkUntil = phase + 0.18
        }
        if phase < blinkUntil {
            setFrame(.blink)
        } else if castActive {
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
        let castT = castActive ? min(1.0, (phase - castStartedAt) / castDuration) : 0
        let castPulse = castActive ? sin(castT * .pi) : 0

        let breathe = 1.0 + 0.02 * sin(phase * 1.0) + 0.08 * castPulse
        let hover = sin(phase * 1.1) * bounds.height * 0.02

        let baseSize = bounds.insetBy(dx: bounds.width * 0.06, dy: bounds.height * 0.06).size
        let w = baseSize.width * breathe
        let h = baseSize.height * breathe
        let drawRect = NSRect(x: bounds.midX - w / 2, y: bounds.midY - h / 2 + hover, width: w, height: h)

        NSGraphicsContext.saveGraphicsState()
        let glow = NSShadow()
        glow.shadowColor = color.withAlphaComponent(0.65 + 0.3 * castPulse)
        glow.shadowBlurRadius = min(bounds.width, bounds.height) * (0.18 + 0.12 * castPulse)
        glow.shadowOffset = .zero
        glow.set()

        if blendProgress < 1, let prev = previousImage {
            prev.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0 - blendProgress)
            image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: blendProgress)
        } else {
            image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0)
        }
        NSGraphicsContext.restoreGraphicsState()

        if castActive {
            drawCastBurst(center: NSPoint(x: bounds.midX, y: bounds.midY + hover), t: castT, color: color)
        }
    }

    /// Particles bursting outward and a ring pulse -- reads as "she just did
    /// something," not ambient decoration, because it only ever plays for
    /// ~0.9s tied to a real triggering event.
    private func drawCastBurst(center: NSPoint, t: CGFloat, color: NSColor) {
        let sparkleColor = color.blended(withFraction: 0.7, of: .white) ?? .white
        let maxRadius = min(bounds.width, bounds.height) * 0.6
        let fade = 1.0 - t

        let ringRadius = maxRadius * t
        let ring = NSBezierPath(ovalIn: NSRect(x: center.x - ringRadius, y: center.y - ringRadius,
                                                width: ringRadius * 2, height: ringRadius * 2))
        ring.lineWidth = max(1.0, bounds.width * 0.015) * fade
        sparkleColor.withAlphaComponent(0.7 * fade).setStroke()
        ring.stroke()

        for p in castParticles {
            let dist = maxRadius * 0.8 * t * p.speed
            let x = center.x + cos(p.angle) * dist
            let y = center.y + sin(p.angle) * dist
            let dot = NSBezierPath(ovalIn: NSRect(x: x - p.size / 2, y: y - p.size / 2, width: p.size, height: p.size))
            sparkleColor.withAlphaComponent(fade).setFill()
            dot.fill()
        }
    }
}
