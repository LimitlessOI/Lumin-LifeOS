// SYNOPSIS: Taloa overlay -- the "show" half of the screen agent.
// Founder directive 2026-08-11: "I want to see it demonstrated to me, click on
// things, show things on our display." Drawing on screen needs no Accessibility
// trust -- only synthesizing input does -- so this half works today while the
// signing/trust problem that blocks clicking is still open. It is also the
// safety story for the other half: an agent that can point at what it is about
// to click, before it clicks, is auditable by eye.
//
// Coordinate space: every public call takes CG global coordinates -- top-left
// origin, y down, spanning all displays -- the SAME space `moveMouseAndClick`
// and `CGDisplayBounds` already use. That is deliberate: "highlight this, then
// click it" must not require a coordinate conversion at the call site, because
// a silent flip between the two is exactly how an agent ends up clicking
// something it never showed anyone.
// @ssot docs/products/lifeos/PRODUCT_HOME.md
import Cocoa

enum TaloaShow {
    private static var live: [AnnotationWindow] = []

    static let accent = NSColor(calibratedRed: 0.31, green: 0.85, blue: 1.0, alpha: 1.0)

    /// The display whose Cocoa origin is (0,0) defines the shared CG origin;
    /// its height is what flips y between the two spaces.
    private static var primaryHeight: CGFloat {
        let primary = NSScreen.screens.first(where: { $0.frame.origin == .zero }) ?? NSScreen.screens.first
        return primary?.frame.height ?? 0
    }

    static func cocoaRect(fromCG rect: CGRect) -> NSRect {
        NSRect(x: rect.origin.x,
               y: primaryHeight - rect.origin.y - rect.height,
               width: rect.width,
               height: rect.height)
    }

    // MARK: - Public surface

    /// Outlines a region and labels it. `rect` is in CG global coordinates.
    @discardableResult
    static func highlight(rect: CGRect, label: String, seconds: Double = 3.0) -> Bool {
        guard rect.width > 0, rect.height > 0 else { return false }
        let pad: CGFloat = 52
        let outer = rect.insetBy(dx: -pad, dy: -pad)
        present(kind: .box(target: CGRect(x: pad, y: pad, width: rect.width, height: rect.height), label: label),
                cgFrame: outer,
                seconds: seconds)
        TaloaLog.write("show.highlight", "rect=\(Int(rect.origin.x)),\(Int(rect.origin.y)),\(Int(rect.width)),\(Int(rect.height)) label=\(label)")
        return true
    }

    /// Rings and crosshairs a single point -- what a click target looks like
    /// before the click happens.
    @discardableResult
    static func point(at p: CGPoint, label: String, seconds: Double = 3.0) -> Bool {
        let side: CGFloat = 260
        let frame = CGRect(x: p.x - side / 2, y: p.y - side / 2, width: side, height: side)
        present(kind: .point(center: CGPoint(x: side / 2, y: side / 2), label: label),
                cgFrame: frame,
                seconds: seconds)
        TaloaLog.write("show.point", "at=\(Int(p.x)),\(Int(p.y)) label=\(label)")
        return true
    }

    /// A caption chip near the bottom of whichever display contains `near`
    /// (main display when omitted) -- how she says what she is doing.
    @discardableResult
    static func caption(_ text: String, seconds: Double = 4.0, near: CGPoint? = nil) -> Bool {
        let bounds = displayBoundsContaining(near) ?? CGRect(x: 0, y: 0, width: 1440, height: 900)
        let width = min(max(360, CGFloat(text.count) * 9.0 + 72), bounds.width - 80)
        let height: CGFloat = 96
        let frame = CGRect(x: bounds.midX - width / 2,
                           y: bounds.maxY - height - 96,
                           width: width,
                           height: height)
        present(kind: .caption(text: text), cgFrame: frame, seconds: seconds)
        TaloaLog.write("show.caption", text)
        return true
    }

    /// Dims an entire display except one cut-out region. Where `highlight`
    /// says "this one", spotlight says "only this one" -- the difference
    /// matters on a 1920x1080 panel full of windows, where a thin outline is
    /// easy to miss and everything around it competes for attention.
    @discardableResult
    static func spotlight(rect: CGRect, label: String, seconds: Double = 4.0) -> Bool {
        guard rect.width > 0, rect.height > 0 else { return false }
        let center = CGPoint(x: rect.midX, y: rect.midY)
        guard let screen = displayBoundsContaining(center) else { return false }
        let hole = CGRect(x: rect.origin.x - screen.origin.x,
                          y: rect.origin.y - screen.origin.y,
                          width: rect.width, height: rect.height)
        present(kind: .spotlight(hole: hole, label: label), cgFrame: screen, seconds: seconds)
        TaloaLog.write("show.spotlight", "rect=\(Int(rect.origin.x)),\(Int(rect.origin.y)),\(Int(rect.width)),\(Int(rect.height)) label=\(label)")
        return true
    }

    /// Draws an arrow between two points, which may sit on different displays
    /// -- the window is sized to the union, so "this control affects that
    /// panel over there" is expressible across the whole desk.
    @discardableResult
    static func arrow(from: CGPoint, to: CGPoint, label: String, seconds: Double = 4.0) -> Bool {
        let pad: CGFloat = 90
        let frame = CGRect(x: min(from.x, to.x) - pad,
                           y: min(from.y, to.y) - pad,
                           width: abs(to.x - from.x) + pad * 2,
                           height: abs(to.y - from.y) + pad * 2)
        let localFrom = CGPoint(x: from.x - frame.origin.x, y: from.y - frame.origin.y)
        let localTo = CGPoint(x: to.x - frame.origin.x, y: to.y - frame.origin.y)
        present(kind: .arrow(from: localFrom, to: localTo, label: label), cgFrame: frame, seconds: seconds)
        TaloaLog.write("show.arrow", "from=\(Int(from.x)),\(Int(from.y)) to=\(Int(to.x)),\(Int(to.y)) label=\(label)")
        return true
    }

    static func clear() {
        live.forEach { $0.dismissNow() }
        live.removeAll()
        TaloaLog.write("show.clear")
    }

    /// CG bounds of every active display, in capture order -- index matches
    /// `screencapture -D <index>` so a captured frame's pixels can be mapped
    /// back into the global space the click API speaks.
    static func displayBounds() -> [(index: Int, bounds: CGRect, name: String)] {
        var count: UInt32 = 0
        guard CGGetActiveDisplayList(0, nil, &count) == .success, count > 0 else { return [] }
        var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
        guard CGGetActiveDisplayList(count, &ids, &count) == .success else { return [] }
        return ids.enumerated().map { offset, id in
            let bounds = CGDisplayBounds(id)
            let screen = NSScreen.screens.first { screen in
                (screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == id
            }
            return (offset + 1, bounds, screen?.localizedName ?? "display-\(offset + 1)")
        }
    }

    private static func displayBoundsContaining(_ p: CGPoint?) -> CGRect? {
        let all = displayBounds()
        guard let p = p else { return all.first?.bounds }
        return all.first(where: { $0.bounds.contains(p) })?.bounds ?? all.first?.bounds
    }

    // MARK: - Window plumbing

    private static func present(kind: AnnotationKind, cgFrame: CGRect, seconds: Double) {
        let window = AnnotationWindow(kind: kind, contentRect: cocoaRect(fromCG: cgFrame))
        live.append(window)
        window.show(for: seconds) {
            live.removeAll { $0 === window }
        }
    }
}

enum AnnotationKind {
    case box(target: CGRect, label: String)
    case point(center: CGPoint, label: String)
    case caption(text: String)
    case spotlight(hole: CGRect, label: String)
    case arrow(from: CGPoint, to: CGPoint, label: String)
}

final class AnnotationWindow: NSWindow {
    private let view: AnnotationView

    init(kind: AnnotationKind, contentRect: NSRect) {
        view = AnnotationView(kind: kind, frame: NSRect(origin: .zero, size: contentRect.size))
        super.init(contentRect: contentRect, styleMask: [.borderless], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        // Never intercept a real click: this layer exists to be looked
        // through, and the founder is still working underneath it.
        ignoresMouseEvents = true
        // .screenSaver matches the character window. .maximumWindow was tried
        // on 2026-08-10 for the character and rolled back after the two
        // external displays dropped out of the display list -- not repeating
        // that experiment here.
        level = .screenSaver
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        alphaValue = 0
        contentView = view
    }

    func show(for seconds: Double, onDone: @escaping () -> Void) {
        orderFrontRegardless()
        view.startAnimating()
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.14
            animator().alphaValue = 1
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { [weak self] in
            guard let self = self else { return }
            NSAnimationContext.runAnimationGroup({ context in
                context.duration = 0.28
                self.animator().alphaValue = 0
            }, completionHandler: {
                self.view.stopAnimating()
                self.orderOut(nil)
                onDone()
            })
        }
    }

    func dismissNow() {
        view.stopAnimating()
        orderOut(nil)
    }
}

final class AnnotationView: NSView {
    private let kind: AnnotationKind
    private var phase: CGFloat = 0
    private var timer: Timer?

    override var isFlipped: Bool { true } // top-left origin, same as the CG space callers use

    init(kind: AnnotationKind, frame: NSRect) {
        self.kind = kind
        super.init(frame: frame)
        wantsLayer = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    /// 20fps only while an annotation is actually on screen, and torn down the
    /// moment it fades -- the opposite of the always-on 30fps timers that were
    /// measured holding this process at 64% of a core on 2026-08-11.
    func startAnimating() {
        guard timer == nil else { return }
        let t = Timer(timeInterval: 1.0 / 20.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.phase += 1.0 / 20.0
            self.needsDisplay = true
        }
        t.tolerance = 0.02
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    func stopAnimating() {
        timer?.invalidate()
        timer = nil
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let ctx = NSGraphicsContext.current?.cgContext else { return }
        let pulse = 0.72 + 0.28 * sin(phase * 3.0)

        switch kind {
        case let .box(target, label):
            drawBox(ctx: ctx, target: target, label: label, pulse: pulse)
        case let .point(center, label):
            drawPoint(ctx: ctx, center: center, label: label, pulse: pulse)
        case let .caption(text):
            drawCaption(text: text)
        case let .spotlight(hole, label):
            drawSpotlight(hole: hole, label: label, pulse: pulse)
        case let .arrow(from, to, label):
            drawArrow(from: from, to: to, label: label, pulse: pulse)
        }
    }

    private func drawSpotlight(hole: CGRect, label: String, pulse: CGFloat) {
        // Even-odd fill punches a real transparent hole rather than painting a
        // lighter rectangle over the target, so what is underneath stays
        // exactly as bright and as readable as it was.
        let path = NSBezierPath(rect: bounds)
        path.append(NSBezierPath(roundedRect: hole, xRadius: 10, yRadius: 10))
        path.windingRule = .evenOdd
        NSColor(calibratedWhite: 0, alpha: 0.58).setFill()
        path.fill()

        let border = NSBezierPath(roundedRect: hole, xRadius: 10, yRadius: 10)
        TaloaShow.accent.withAlphaComponent(0.55 + 0.45 * pulse).setStroke()
        border.lineWidth = 2.5
        border.stroke()

        if !label.isEmpty {
            let chipY = hole.minY >= 34 ? hole.minY - 34 : hole.maxY + 10
            drawChip(label, at: CGPoint(x: hole.minX, y: chipY))
        }
    }

    private func drawArrow(from: CGPoint, to: CGPoint, label: String, pulse: CGFloat) {
        let accent = TaloaShow.accent
        let dx = to.x - from.x, dy = to.y - from.y
        let length = max(sqrt(dx * dx + dy * dy), 1)
        let ux = dx / length, uy = dy / length

        // Stop short of the target so the head points at it rather than
        // covering it, and start clear of the origin marker.
        let start = CGPoint(x: from.x + ux * 14, y: from.y + uy * 14)
        let head = CGPoint(x: to.x - ux * 16, y: to.y - uy * 16)

        let shaft = NSBezierPath()
        shaft.move(to: start)
        shaft.line(to: head)
        shaft.lineWidth = 3
        shaft.lineCapStyle = .round
        accent.withAlphaComponent(0.55 + 0.45 * pulse).setStroke()
        shaft.stroke()

        let wing: CGFloat = 15
        let left = CGPoint(x: head.x - ux * wing - uy * wing * 0.6, y: head.y - uy * wing + ux * wing * 0.6)
        let right = CGPoint(x: head.x - ux * wing + uy * wing * 0.6, y: head.y - uy * wing - ux * wing * 0.6)
        let arrowhead = NSBezierPath()
        arrowhead.move(to: left)
        arrowhead.line(to: CGPoint(x: to.x - ux * 2, y: to.y - uy * 2))
        arrowhead.line(to: right)
        arrowhead.close()
        accent.setFill()
        arrowhead.fill()

        let origin = NSBezierPath(ovalIn: CGRect(x: from.x - 6, y: from.y - 6, width: 12, height: 12))
        accent.withAlphaComponent(0.9).setFill()
        origin.fill()

        if !label.isEmpty {
            drawChip(label, at: CGPoint(x: (from.x + to.x) / 2 - 20, y: (from.y + to.y) / 2 - 34))
        }
    }

    private func drawBox(ctx: CGContext, target: CGRect, label: String, pulse: CGFloat) {
        let accent = TaloaShow.accent
        let path = NSBezierPath(roundedRect: target, xRadius: 10, yRadius: 10)

        accent.withAlphaComponent(0.10).setFill()
        path.fill()

        ctx.saveGState()
        ctx.setShadow(offset: .zero, blur: 18, color: accent.withAlphaComponent(0.85 * pulse).cgColor)
        accent.withAlphaComponent(0.95).setStroke()
        path.lineWidth = 2.5
        path.stroke()
        ctx.restoreGState()

        // Corner ticks -- reads as a target reticle rather than a plain border,
        // and stays legible over busy content where a thin line disappears.
        let tick: CGFloat = min(18, min(target.width, target.height) / 4)
        accent.setStroke()
        let corners = NSBezierPath()
        corners.lineWidth = 4
        let cs: [(CGPoint, CGPoint, CGPoint)] = [
            (CGPoint(x: target.minX, y: target.minY + tick), CGPoint(x: target.minX, y: target.minY), CGPoint(x: target.minX + tick, y: target.minY)),
            (CGPoint(x: target.maxX - tick, y: target.minY), CGPoint(x: target.maxX, y: target.minY), CGPoint(x: target.maxX, y: target.minY + tick)),
            (CGPoint(x: target.minX, y: target.maxY - tick), CGPoint(x: target.minX, y: target.maxY), CGPoint(x: target.minX + tick, y: target.maxY)),
            (CGPoint(x: target.maxX - tick, y: target.maxY), CGPoint(x: target.maxX, y: target.maxY), CGPoint(x: target.maxX, y: target.maxY - tick)),
        ]
        for (a, b, c) in cs {
            corners.move(to: a); corners.line(to: b); corners.line(to: c)
        }
        corners.stroke()

        if !label.isEmpty {
            let chipY = target.minY >= 34 ? target.minY - 34 : target.maxY + 10
            drawChip(label, at: CGPoint(x: target.minX, y: chipY))
        }
    }

    private func drawPoint(ctx: CGContext, center: CGPoint, label: String, pulse: CGFloat) {
        let accent = TaloaShow.accent
        // Two rings expanding outward on a loop -- unmistakably "here", and it
        // survives being screenshotted for a receipt.
        for i in 0..<2 {
            let t = (phase * 0.9 + CGFloat(i) * 0.5).truncatingRemainder(dividingBy: 1.0)
            let radius = 16 + t * 58
            let alpha = (1.0 - t) * 0.75
            accent.withAlphaComponent(alpha).setStroke()
            let ring = NSBezierPath(ovalIn: CGRect(x: center.x - radius, y: center.y - radius,
                                                   width: radius * 2, height: radius * 2))
            ring.lineWidth = 2.5
            ring.stroke()
        }

        ctx.saveGState()
        ctx.setShadow(offset: .zero, blur: 14, color: accent.withAlphaComponent(0.9).cgColor)
        accent.withAlphaComponent(0.28).setFill()
        NSBezierPath(ovalIn: CGRect(x: center.x - 13, y: center.y - 13, width: 26, height: 26)).fill()
        accent.setStroke()
        let dot = NSBezierPath(ovalIn: CGRect(x: center.x - 13, y: center.y - 13, width: 26, height: 26))
        dot.lineWidth = 2.5 * pulse
        dot.stroke()
        ctx.restoreGState()

        let cross = NSBezierPath()
        cross.lineWidth = 1.5
        cross.move(to: CGPoint(x: center.x - 30, y: center.y)); cross.line(to: CGPoint(x: center.x - 18, y: center.y))
        cross.move(to: CGPoint(x: center.x + 18, y: center.y)); cross.line(to: CGPoint(x: center.x + 30, y: center.y))
        cross.move(to: CGPoint(x: center.x, y: center.y - 30)); cross.line(to: CGPoint(x: center.x, y: center.y - 18))
        cross.move(to: CGPoint(x: center.x, y: center.y + 18)); cross.line(to: CGPoint(x: center.x, y: center.y + 30))
        accent.withAlphaComponent(0.9).setStroke()
        cross.stroke()

        if !label.isEmpty {
            drawChip(label, at: CGPoint(x: center.x - 30, y: center.y + 42))
        }
    }

    private func drawCaption(text: String) {
        let inset = bounds.insetBy(dx: 8, dy: 8)
        let path = NSBezierPath(roundedRect: inset, xRadius: 16, yRadius: 16)
        NSColor(calibratedWhite: 0.06, alpha: 0.92).setFill()
        path.fill()
        TaloaShow.accent.withAlphaComponent(0.55).setStroke()
        path.lineWidth = 1.5
        path.stroke()

        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 15, weight: .medium),
            .foregroundColor: NSColor.white,
        ]
        let str = NSAttributedString(string: text, attributes: attrs)
        let textRect = inset.insetBy(dx: 20, dy: 0)
        let size = str.boundingRect(with: NSSize(width: textRect.width, height: .greatestFiniteMagnitude),
                                    options: [.usesLineFragmentOrigin])
        str.draw(with: NSRect(x: textRect.minX,
                              y: inset.midY - size.height / 2,
                              width: textRect.width,
                              height: size.height + 4),
                 options: [.usesLineFragmentOrigin])
    }

    private func drawChip(_ label: String, at origin: CGPoint) {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 13, weight: .semibold),
            .foregroundColor: NSColor.white,
        ]
        let str = NSAttributedString(string: label, attributes: attrs)
        let textSize = str.size()
        let chip = NSRect(x: origin.x, y: origin.y, width: textSize.width + 20, height: 24)
        let path = NSBezierPath(roundedRect: chip, xRadius: 7, yRadius: 7)
        NSColor(calibratedWhite: 0.04, alpha: 0.90).setFill()
        path.fill()
        TaloaShow.accent.withAlphaComponent(0.8).setStroke()
        path.lineWidth = 1
        path.stroke()
        str.draw(at: CGPoint(x: chip.minX + 10, y: chip.minY + 4))
    }
}
