// SYNOPSIS: Root content view for the Taloa overlay window -- owns freeform
// edge/corner resize (Phase 1) and the size-continuum swap from the native
// BadgeView into a WKWebView loading the real /lifeos shell (Phase 2/4).
//
// Click-to-chat (2026-08-10): founder feedback, twice -- "it looks exactly
// the same" (a badge-only visual pass) then, after the gesture-vocabulary
// fix, "still not what we are looking for at least at this point... I do
// like the look of her though." Correct: the gesture work made her REACT,
// but she still couldn't DO anything real -- the actual real-chat capability
// (chair/founder-interface, driven by public/overlay/lifeos-app.html's own
// proven `luminSend()`) already exists the moment she's expanded, it was
// just never reachable from her small resting form without a manual
// resize-drag. A single click on her now (not a drag) grows the window to a
// real chat size and, once the real page finishes loading, opens Lumin's
// own chat drawer and focuses its input via the same `openLuminDrawer()`
// the web app's own Cmd+L shortcut already calls -- no new auth, no new
// chat UI, entirely the same already-live backend. Honest scope: this is
// the real chat/AI surface, not a bespoke native chat embedded in the badge
// itself (that would need a native auth story this pass doesn't build).
// See docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md §21.1.
import Cocoa
import WebKit

final class ContainerView: NSView, WKNavigationDelegate {
    static let expandThreshold: CGFloat = 160
    static let resizeMargin: CGFloat = 10
    static let dragStripHeight: CGFloat = 22
    static let minSize: CGFloat = 56

    // Production LifeOS host -- same canonical /lifeos shell the Capacitor
    // Android app and PWA already load (public/shared/lifeos-native-shell.js
    // getEntryUrl()). Not editing that file; this is a read-only reuse of
    // its URL pattern to avoid colliding with the parallel Android session.
    static let lifeosURL = URL(string: "https://lumin-web-production-e3a9.up.railway.app/lifeos?native=1&layout=mobile&direct_system=1")!

    let badgeView: TaloaImageCharacterView
    private var webView: WKWebView?
    private(set) var isExpanded = false

    /// True while the user is actively dragging/resizing this window --
    /// autonomous wandering (main.swift) must not fight a real drag.
    var isUserInteracting: Bool { dragMode != .none }

    private enum DragMode { case none, move, resizeL, resizeR, resizeT, resizeB, resizeTL, resizeTR, resizeBL, resizeBR }
    private var dragMode: DragMode = .none
    private var dragStartMouseScreen: NSPoint = .zero
    private var dragStartFrame: NSRect = .zero

    // Click-to-chat -- see header comment.
    private static let chatSize = NSSize(width: 420, height: 580)
    private static let clickMoveThreshold: CGFloat = 4
    private var pendingAutoOpenChat = false

    override init(frame frameRect: NSRect) {
        badgeView = TaloaImageCharacterView(frame: NSRect(origin: .zero, size: frameRect.size))
        super.init(frame: frameRect)
        wantsLayer = true
        addSubview(badgeView)
        layoutChildren()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    override func layout() {
        super.layout()
        layoutChildren()
    }

    private func layoutChildren() {
        let shouldExpand = bounds.width >= Self.expandThreshold || bounds.height >= Self.expandThreshold
        if shouldExpand != isExpanded {
            isExpanded = shouldExpand
            if isExpanded {
                installWebViewIfNeeded()
                badgeView.isHidden = true
                webView?.isHidden = false
            } else {
                badgeView.isHidden = false
                webView?.isHidden = true
            }
        }
        badgeView.frame = bounds
        if let wv = webView {
            wv.frame = NSRect(x: 0, y: 0, width: bounds.width, height: max(0, bounds.height - Self.dragStripHeight))
        }
        window?.invalidateCursorRects(for: self)
    }

    private func installWebViewIfNeeded() {
        guard webView == nil else { return }
        let wv = WKWebView(frame: .zero, configuration: WKWebViewConfiguration())
        wv.autoresizingMask = [.width, .height]
        wv.navigationDelegate = self
        addSubview(wv, positioned: .below, relativeTo: badgeView)
        webView = wv
        wv.load(URLRequest(url: Self.lifeosURL))
    }

    // MARK: - Real reactions to real page/layout events (2026-08-10)
    //
    // Previously every navigation event -- start, success, failure -- played
    // the identical cast-a-spell pulse, so no event actually read as meaning
    // anything distinct (the gap Adam named: "reacts and means something,"
    // spren/Way of Kings then Seons/Elantris for this alpha slice). Now
    // start still reads as "something is happening"; finish and failure
    // each get their own real, different reaction from
    // TaloaImageCharacterView's gesture vocabulary.

    private static let castBadgeSize: CGFloat = 56

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        badgeView.castSpell()
        flashBadgeIfExpanded()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        badgeView.celebrate()
        flashBadgeIfExpanded()
        if pendingAutoOpenChat {
            pendingAutoOpenChat = false
            // openLuminDrawer/#lumin-input are real globals in the already-live
            // public/overlay/lifeos-app.html -- same call its own Cmd+L
            // shortcut makes. Best-effort: if the page shape ever changes,
            // this silently does nothing rather than throwing in the app.
            webView.evaluateJavaScript(
                "try { if (window.openLuminDrawer) { window.openLuminDrawer({expand:true}); " +
                "var el = document.getElementById('lumin-input'); if (el) el.focus(); } } catch (e) {}"
            )
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        badgeView.concern()
        flashBadgeIfExpanded()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        badgeView.concern()
        flashBadgeIfExpanded()
    }

    /// She's normally hidden while the real app is showing -- surface a
    /// small corner version just long enough for the reaction to read, then
    /// let her step back so she isn't in the way of the app content.
    private func flashBadgeIfExpanded() {
        guard isExpanded else { return }
        badgeView.isHidden = false
        badgeView.frame = NSRect(x: 8, y: bounds.height - Self.castBadgeSize - Self.dragStripHeight - 8,
                                  width: Self.castBadgeSize, height: Self.castBadgeSize)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) { [weak self] in
            guard let self = self, self.isExpanded else { return }
            self.badgeView.isHidden = true
        }
    }

    // MARK: - Edge-zone detection (Phase 1)

    private func edgeZone(at point: NSPoint) -> DragMode {
        let m = Self.resizeMargin
        let nearLeft = point.x <= m
        let nearRight = point.x >= bounds.width - m
        let nearBottom = point.y <= m
        let nearTop = point.y >= bounds.height - m
        if nearLeft && nearBottom { return .resizeBL }
        if nearLeft && nearTop { return .resizeTL }
        if nearRight && nearBottom { return .resizeBR }
        if nearRight && nearTop { return .resizeTR }
        if nearLeft { return .resizeL }
        if nearRight { return .resizeR }
        if nearBottom { return .resizeB }
        if nearTop { return .resizeT }
        return .none
    }

    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        let zone = edgeZone(at: p)
        if zone != .none {
            dragMode = zone
        } else if !isExpanded {
            dragMode = .move
        } else if p.y >= bounds.height - Self.dragStripHeight {
            dragMode = .move
        } else {
            dragMode = .none
            super.mouseDown(with: event)
            return
        }
        dragStartMouseScreen = NSEvent.mouseLocation
        dragStartFrame = window?.frame ?? .zero
    }

    override func mouseDragged(with event: NSEvent) {
        guard let window = self.window, dragMode != .none else { return }
        let cur = NSEvent.mouseLocation
        let dx = cur.x - dragStartMouseScreen.x
        let dy = cur.y - dragStartMouseScreen.y
        var f = dragStartFrame

        switch dragMode {
        case .move:
            f.origin.x += dx
            f.origin.y += dy
        case .resizeL:
            f.origin.x += dx; f.size.width -= dx
        case .resizeR:
            f.size.width += dx
        case .resizeT:
            f.size.height += dy
        case .resizeB:
            f.origin.y += dy; f.size.height -= dy
        case .resizeTL:
            f.origin.x += dx; f.size.width -= dx; f.size.height += dy
        case .resizeTR:
            f.size.width += dx; f.size.height += dy
        case .resizeBL:
            f.origin.x += dx; f.size.width -= dx; f.origin.y += dy; f.size.height -= dy
        case .resizeBR:
            f.size.width += dx; f.origin.y += dy; f.size.height -= dy
        case .none:
            return
        }

        f.size.width = max(f.size.width, Self.minSize)
        f.size.height = max(f.size.height, Self.minSize)

        window.setFrame(f, display: true)
    }

    override func mouseUp(with event: NSEvent) {
        // A "move" that barely moved is a click, not a drag -- click-to-chat.
        if dragMode == .move, !isExpanded {
            let cur = NSEvent.mouseLocation
            let moved = hypot(cur.x - dragStartMouseScreen.x, cur.y - dragStartMouseScreen.y)
            FileHandle.standardError.write("Taloa: mouseUp dragMode=move moved=\(moved)\n".data(using: .utf8)!)
            if moved < Self.clickMoveThreshold {
                expandToChat()
            }
        }
        dragMode = .none
    }

    /// Click-to-chat -- see header comment. Grows from the current bottom-left
    /// anchor (matches how she's positioned/homed everywhere else) so this
    /// never jumps off-screen.
    private func expandToChat() {
        guard let window = self.window, !isExpanded else { return }
        pendingAutoOpenChat = true
        var f = window.frame
        f.size = Self.chatSize
        window.setFrame(f, display: true, animate: true)
    }

    override func resetCursorRects() {
        let m = Self.resizeMargin
        addCursorRect(NSRect(x: 0, y: 0, width: m, height: bounds.height), cursor: .resizeLeftRight)
        addCursorRect(NSRect(x: bounds.width - m, y: 0, width: m, height: bounds.height), cursor: .resizeLeftRight)
        addCursorRect(NSRect(x: 0, y: 0, width: bounds.width, height: m), cursor: .resizeUpDown)
        addCursorRect(NSRect(x: 0, y: bounds.height - m, width: bounds.width, height: m), cursor: .resizeUpDown)
    }
}
