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
//
// Shrink-back-to-circle (2026-08-10): founder's own description of the
// intended interaction model, direct quote -- "I should be able to move it
// over [to] not have it be front and center or I can shrink it when it
// goes back to the circle that always stays." Expanding already worked;
// there was no explicit way back except dragging the window's edge by hand.
// Added a real, visible shrink button in the drag strip (top-right, only
// while expanded) that collapses straight back to badge size. Repositioning
// out of the way without closing was already possible (drag the same top
// strip) -- not a new gap, just unlabeled.
//
// Real founder auto-login (2026-08-10): the WKWebView here has its own
// cookie/localStorage jar, entirely separate from Chrome -- expanding
// showed the real LifeOS sign-in screen, not the founder's actual chat.
// Founder, direct: "you login for me[,] dont make me do it" -- and no
// password is ever typed, stored, or seen by this app or by me. Uses the
// real, already-built, purpose-documented `POST /api/v1/lifeos/auth/
// operator/mint-browser-session` (its own response note: "Password never
// returned") -- the server reads the founder's vaulted Railway credentials,
// logs in server-side, and returns only a real session access_token. This
// app reads COMMAND_CENTER_KEY from the local, git-ignored .env file on
// disk (never hardcoded in source, never committed) to call that endpoint,
// then injects the returned token into the page's own localStorage and
// reloads -- the same storage key (`lifeos_access_token`) every other
// LifeOS surface already uses, so the app treats it exactly like a real
// login, because it is one.
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

    // Real founder auto-login -- see header comment.
    private static let mintSessionURL = URL(string: "https://lumin-web-production-e3a9.up.railway.app/api/v1/lifeos/auth/operator/mint-browser-session")!
    private static let localEnvPath = "/Users/adamhopkins/Projects/Lumin-LifeOS/.env"
    private var didAttemptAutoLogin = false

    // Shrink-back-to-circle -- see header comment.
    private static let badgeSize: CGFloat = 120 // matches main.swift's initialSize
    private static let shrinkButtonSize: CGFloat = 18
    private lazy var shrinkButton: NSButton = {
        let img = NSImage(systemSymbolName: "arrow.down.right.and.arrow.up.left.circle.fill",
                           accessibilityDescription: "Shrink back to circle")
        let b = NSButton(image: img ?? NSImage(), target: self, action: #selector(handleShrinkTapped))
        b.isBordered = false
        b.imageScaling = .scaleProportionallyUpOrDown
        b.contentTintColor = .white
        b.alphaValue = 0.85
        b.isHidden = true
        return b
    }()

    override init(frame frameRect: NSRect) {
        badgeView = TaloaImageCharacterView(frame: NSRect(origin: .zero, size: frameRect.size))
        super.init(frame: frameRect)
        wantsLayer = true
        addSubview(badgeView)
        addSubview(shrinkButton)
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
        shrinkButton.isHidden = !isExpanded
        if isExpanded {
            shrinkButton.frame = NSRect(
                x: bounds.width - Self.shrinkButtonSize - 6,
                y: bounds.height - Self.shrinkButtonSize - (Self.dragStripHeight - Self.shrinkButtonSize) / 2 - 2,
                width: Self.shrinkButtonSize, height: Self.shrinkButtonSize
            )
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

        // Auto-login always runs first, exactly once per launch, and this
        // load's result (likely the sign-in screen, pre-auth) is treated as
        // provisional -- a real reload follows once the founder session
        // token lands, and THAT load is the one that should open the chat.
        if !didAttemptAutoLogin {
            attemptAutoLogin(on: webView)
            return
        }

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

    /// Real founder auto-login -- see header comment. Never touches a
    /// password; reads only the operator command key from the local,
    /// git-ignored .env file to mint a real session server-side.
    private func attemptAutoLogin(on webView: WKWebView) {
        didAttemptAutoLogin = true
        guard let commandKey = Self.readLocalCommandKey() else {
            FileHandle.standardError.write("Taloa: auto-login skipped -- no COMMAND_CENTER_KEY found in local .env\n".data(using: .utf8)!)
            return
        }
        var request = URLRequest(url: Self.mintSessionURL)
        request.httpMethod = "POST"
        request.setValue(commandKey, forHTTPHeaderField: "x-command-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  json["ok"] as? Bool == true,
                  let token = json["access_token"] as? String, !token.isEmpty else {
                let status = (response as? HTTPURLResponse)?.statusCode ?? -1
                FileHandle.standardError.write("Taloa: auto-login mint-browser-session failed (http \(status), err=\(error?.localizedDescription ?? "none"))\n".data(using: .utf8)!)
                return
            }
            // Real bug found on the first attempt: lifeos-login.html's own
            // self-redirect-if-already-authenticated check reads
            // lifeos_refresh_token FIRST and returns immediately if it's
            // missing -- `if (!refresh) return;` -- before it ever looks at
            // whether the access token is valid. Injecting only the access
            // token left it silently stuck on the sign-in screen even
            // though the token itself was real and good. Both must be set.
            let refreshToken = json["refresh_token"] as? String
            DispatchQueue.main.async { [weak self] in
                guard let self = self, self.webView === webView else { return }
                FileHandle.standardError.write("Taloa: auto-login token acquired, injecting real session\n".data(using: .utf8)!)
                // JSON-encode each token so it's safely quoted for injection
                // regardless of exact character content -- never string-
                // interpolated raw into the JS literal.
                func jsLiteral(_ s: String) -> String? {
                    guard let d = try? JSONSerialization.data(withJSONObject: [s]),
                          let str = String(data: d, encoding: .utf8) else { return nil }
                    return String(str.dropFirst().dropLast()) // unwrap the [ ] JSONSerialization needs for a bare string
                }
                guard let accessLiteral = jsLiteral(token) else { return }
                var js = "localStorage.setItem('lifeos_access_token', \(accessLiteral));"
                if let refreshToken = refreshToken, let refreshLiteral = jsLiteral(refreshToken) {
                    js += " localStorage.setItem('lifeos_refresh_token', \(refreshLiteral));"
                }
                js += " location.reload();"
                webView.evaluateJavaScript(js)
            }
        }.resume()
    }

    /// Reads COMMAND_CENTER_KEY from the local, git-ignored .env file on
    /// disk -- never hardcoded in source, never committed. This app only
    /// runs on the founder's own machine, where that file already lives.
    private static func readLocalCommandKey() -> String? {
        guard let content = try? String(contentsOfFile: localEnvPath, encoding: .utf8) else { return nil }
        for line in content.split(separator: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("COMMAND_CENTER_KEY=") {
                let value = trimmed.dropFirst("COMMAND_CENTER_KEY=".count).trimmingCharacters(in: .whitespaces)
                return value.isEmpty ? nil : value
            }
        }
        return nil
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

    /// Shrink-back-to-circle -- see header comment. Keeps the same top-left
    /// corner anchored (rather than bottom-left) so shrinking doesn't make
    /// the window jump upward past wherever the founder actually dragged it.
    @objc private func handleShrinkTapped() {
        guard let window = self.window, isExpanded else { return }
        var f = window.frame
        let newSize = Self.badgeSize
        f.origin.y += f.size.height - newSize
        f.size = NSSize(width: newSize, height: newSize)
        window.setFrame(f, display: true, animate: true)
    }

    override func resetCursorRects() {
        let m = Self.resizeMargin
        addCursorRect(NSRect(x: 0, y: 0, width: m, height: bounds.height), cursor: .resizeLeftRight)
        addCursorRect(NSRect(x: bounds.width - m, y: 0, width: m, height: bounds.height), cursor: .resizeLeftRight)
        addCursorRect(NSRect(x: 0, y: 0, width: bounds.width, height: m), cursor: .resizeUpDown)
        addCursorRect(NSRect(x: 0, y: bounds.height - m, width: bounds.width, height: m), cursor: .resizeUpDown)
    }

    // MARK: - Real Accessibility conformance (2026-08-10)
    //
    // Real, root-caused finding, not a permission issue: `osascript -e 'tell
    // application "System Events" to tell process "Taloa" to get entire
    // contents of window 1'` came back completely empty -- this custom,
    // hand-drawn UI exposed ZERO elements to the Accessibility tree at all.
    // That's a real gap in the app itself (also means a VoiceOver user
    // couldn't use this window either, not just an automation tool), not an
    // unavoidable OS wall. Exposing the container as one real, actionable
    // AX button closes both gaps with the same fix: a real assistive
    // technology can now identify and press it, and so can System Events'
    // `click` action, routed through the exact same expand/shrink methods a
    // real mouse click already uses.
    override func isAccessibilityElement() -> Bool { true }

    override func accessibilityRole() -> NSAccessibility.Role? { .button }

    override func accessibilityLabel() -> String? {
        isExpanded ? "Shrink Taloa back to circle" : "Expand Taloa chat"
    }

    override func accessibilityPerformPress() -> Bool {
        if isExpanded {
            handleShrinkTapped()
        } else {
            expandToChat()
        }
        return true
    }
}
