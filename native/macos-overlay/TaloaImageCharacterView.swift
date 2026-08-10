// SYNOPSIS: Native small-state character view for the Taloa overlay -- now a
// real generated character image instead of hand-coded vector shapes, direct
// response to founder feedback 2026-08-10: "give me what I want despite the
// limitation... figure the fuck this out." No image-generation tool was
// available to Claude directly or on this Mac (checked: no Draw Things, no
// local Stable Diffusion, Ollama models here are vision-understanding only,
// not generation) -- the actual unlock was a free, no-API-key public
// text-to-image endpoint (image.pollinations.ai) reachable via plain curl,
// plus local `rembg` (pip-installed, U2Net model) for background removal so
// the result composites as a real floating character, not a rectangle.
// Asset: Assets/TaloaCharacter.png (768x768 RGBA, verified transparent --
// corner alpha=0 checked directly, not assumed from a preview).
// Supersedes TaloaFairyView.swift.
// See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
import Cocoa

enum TaloaExpression: String {
    case neutral, happy, thoughtful, concerned, surprised
}

enum TaloaMode: String {
    case idle, listening, thinking, speaking, impatient
}

final class TaloaImageCharacterView: NSView {
    var expression: TaloaExpression = .neutral // not yet expressed by the static image -- see known gaps
    var mode: TaloaMode = .idle

    private var phase: CGFloat = 0
    private var timer: Timer?
    private let characterImage: NSImage?

    // "Casting a spell" flourish (2026-08-10, founder ask: "she can pretend
    // like she's doing a spell when she brings up a new page or a new
    // layout") -- tied to REAL WKNavigationDelegate events in ContainerView,
    // not a decorative loop, so it reads as her causing the change rather
    // than a random animation that happens to coincide with one.
    private var castActive = false
    private var castStartedAt: CGFloat = 0
    private let castDuration: CGFloat = 0.9
    private var castParticles: [(angle: CGFloat, speed: CGFloat, size: CGFloat)] = []

    override init(frame frameRect: NSRect) {
        self.characterImage = TaloaImageCharacterView.loadCharacterImage()
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.masksToBounds = false
        timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.phase += 1.0 / 30.0
            if self.castActive, self.phase - self.castStartedAt > self.castDuration {
                self.castActive = false
            }
            self.needsDisplay = true
        }
    }

    /// Trigger the cast-a-spell flourish. Call this from a real event (page
    /// navigation, layout change) -- never on a timer/loop, or it stops
    /// meaning anything.
    func castSpell() {
        FileHandle.standardError.write("Taloa: casting (real navigation event)\n".data(using: .utf8)!)
        castActive = true
        castStartedAt = phase
        castParticles = (0..<10).map { _ in
            (angle: CGFloat.random(in: 0..<(2 * .pi)), speed: CGFloat.random(in: 0.7...1.3), size: CGFloat.random(in: 2...4.5))
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    private static func loadCharacterImage() -> NSImage? {
        if let path = Bundle.main.path(forResource: "TaloaCharacter", ofType: "png") {
            return NSImage(contentsOfFile: path)
        }
        // Dev-run fallback (running the bare binary outside a bundle, e.g. via swiftc directly).
        let devPath = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Assets/TaloaCharacter.png").path
        return NSImage(contentsOfFile: devPath)
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

        guard let image = characterImage else {
            // Fail visibly, not silently -- an empty transparent view would look
            // like "it's still not working" with no clue why.
            NSColor.red.withAlphaComponent(0.6).setFill()
            NSBezierPath(ovalIn: bounds.insetBy(dx: bounds.width * 0.3, dy: bounds.height * 0.3)).fill()
            return
        }

        let color = coreColor()
        let castT = castActive ? min(1.0, (phase - castStartedAt) / castDuration) : 0
        let castPulse = castActive ? sin(castT * .pi) : 0 // 0 -> 1 -> 0 over the cast window

        let breathe = 1.0 + 0.02 * sin(phase * 1.0) + 0.08 * castPulse
        let hover = sin(phase * 1.1) * bounds.height * 0.02

        let baseSize = bounds.insetBy(dx: bounds.width * 0.06, dy: bounds.height * 0.06).size
        let w = baseSize.width * breathe
        let h = baseSize.height * breathe
        let drawRect = NSRect(x: bounds.midX - w / 2, y: bounds.midY - h / 2 + hover, width: w, height: h)

        // Soft mode-colored glow behind the character, brightened during a
        // cast, same language as every prior iteration so state changes
        // still read even though the art is now a fixed image.
        NSGraphicsContext.saveGraphicsState()
        let glow = NSShadow()
        glow.shadowColor = color.withAlphaComponent(0.65 + 0.3 * castPulse)
        glow.shadowBlurRadius = min(bounds.width, bounds.height) * (0.18 + 0.12 * castPulse)
        glow.shadowOffset = .zero
        glow.set()
        image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1.0)
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

        // Expanding ring.
        let ringRadius = maxRadius * t
        let ring = NSBezierPath(ovalIn: NSRect(x: center.x - ringRadius, y: center.y - ringRadius,
                                                width: ringRadius * 2, height: ringRadius * 2))
        ring.lineWidth = max(1.0, bounds.width * 0.015) * fade
        sparkleColor.withAlphaComponent(0.7 * fade).setStroke()
        ring.stroke()

        // Outward-flying particles.
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
