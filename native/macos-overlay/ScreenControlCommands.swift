// SYNOPSIS: Taloa overlay -- structured command channel + display-aware capture.
// Replaces the temporary one-shot `/tmp/taloa-test-*` marker files (which took
// a bare "x,y" string, had no request id, no error reporting, and could only
// ever capture the main display) with a single JSON channel that answers every
// request with a receipt.
//
// Two real defects from the 2026-08-11 Layer B UAT are closed here:
//   * capture only ever saw display 1, while the founder works across three
//     displays and the cursor space spans all of them -- an agent reasoning
//     over one frame was blind to two thirds of the desk, with no way to tell.
//   * a dropped click reported nothing but `trusted=false` after the fact.
//     `click` now refuses up front when trust is missing, and can show its
//     target before acting so intent is visible rather than inferred.
// @ssot docs/products/lifeos/PRODUCT_HOME.md
import Cocoa

extension ScreenControl {
    private static var cmdPath: String { "/tmp/taloa-cmd" }
    private static var cmdResultPath: String { "/tmp/taloa-cmd-result" }

    /// Proven live 2026-08-11, and the reason this check exists: without Screen
    /// Recording permission `screencapture` does NOT fail. It writes a real,
    /// large, valid PNG containing the desktop wallpaper and the menu bar, with
    /// every application window silently absent, and exits 0. A capture of
    /// display 1 came back as 2MB of wallpaper while Safari was maximized on
    /// it. So exit status is worthless as evidence of sight here, and any
    /// "capture succeeded" claim not gated on this preflight is a false claim
    /// -- an agent would be reasoning confidently about an empty desk.
    static func screenRecordingGranted() -> Bool {
        CGPreflightScreenCaptureAccess()
    }

    /// Prompts once for Screen Recording. Like Accessibility, the actual grant
    /// is the founder's own click in System Settings -- a macOS security
    /// boundary, not a gap in this code.
    static func requestScreenRecording() {
        _ = CGRequestScreenCaptureAccess()
    }

    /// Captures one specific display by its capture index (1-based, matching
    /// `TaloaShow.displayBounds()` and `screencapture -D`). Returns the
    /// display's CG bounds alongside the file so a caller can map any pixel in
    /// the frame back to the global coordinate space clicks are expressed in.
    static func captureDisplay(index: Int, to path: String) -> (ok: Bool, bounds: CGRect?, blind: Bool) {
        let blind = !screenRecordingGranted()
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        task.arguments = ["-x", "-D", String(index), path]
        do {
            try task.run()
            task.waitUntilExit()
            let bounds = TaloaShow.displayBounds().first(where: { $0.index == index })?.bounds
            if blind {
                TaloaLog.write("capture.blind", "display=\(index) wrote wallpaper-only frame to \(path)")
            }
            return (task.terminationStatus == 0 && !blind, bounds, blind)
        } catch {
            TaloaLog.write("capture.error", "display=\(index) err=\(error.localizedDescription)")
            return (false, nil, blind)
        }
    }

    static func startCommandChannel() {
        let timer = Timer(timeInterval: 0.25, repeats: true) { _ in pumpCommandChannel() }
        timer.tolerance = 0.1
        RunLoop.main.add(timer, forMode: .common)
        TaloaLog.write("cmd.channel.started", "path=\(cmdPath) result=\(cmdResultPath)")
    }

    // MARK: - Pump

    private static func pumpCommandChannel() {
        guard let raw = try? String(contentsOfFile: cmdPath, encoding: .utf8) else { return }
        try? FileManager.default.removeItem(atPath: cmdPath)
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let data = trimmed.data(using: .utf8),
              let cmd = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            writeResult(["ok": false, "error": "unparseable_command", "raw": String(trimmed.prefix(240))])
            return
        }

        let op = (cmd["op"] as? String ?? "").lowercased()
        let requestId = cmd["request_id"] as? String ?? UUID().uuidString
        TaloaLog.write("cmd.recv", "op=\(op) id=\(requestId)")

        switch op {
        case "state":
            writeResult([
                "ok": true, "op": op, "request_id": requestId,
                "accessibility_trusted": isAccessibilityTrusted(),
                "screen_recording_granted": screenRecordingGranted(),
                "can_click": isAccessibilityTrusted(),
                "can_see": screenRecordingGranted(),
                "can_show": true,
                "pid": ProcessInfo.processInfo.processIdentifier,
                "log_file": TaloaLog.logFile.path,
                "displays": TaloaShow.displayBounds().map { d -> [String: Any] in
                    ["index": d.index, "name": d.name,
                     "x": d.bounds.origin.x, "y": d.bounds.origin.y,
                     "width": d.bounds.width, "height": d.bounds.height]
                },
            ])

        case "highlight":
            guard let rect = rect(from: cmd) else {
                writeResult(["ok": false, "op": op, "request_id": requestId, "error": "rect_required"])
                return
            }
            let ok = TaloaShow.highlight(rect: rect,
                                         label: cmd["label"] as? String ?? "",
                                         seconds: number(cmd["seconds"]) ?? 3.0)
            writeResult(["ok": ok, "op": op, "request_id": requestId,
                         "rect": [rect.origin.x, rect.origin.y, rect.width, rect.height]])

        case "point":
            guard let x = number(cmd["x"]), let y = number(cmd["y"]) else {
                writeResult(["ok": false, "op": op, "request_id": requestId, "error": "x_and_y_required"])
                return
            }
            let ok = TaloaShow.point(at: CGPoint(x: x, y: y),
                                     label: cmd["label"] as? String ?? "",
                                     seconds: number(cmd["seconds"]) ?? 3.0)
            writeResult(["ok": ok, "op": op, "request_id": requestId, "x": x, "y": y])

        case "caption":
            let text = cmd["text"] as? String ?? ""
            guard !text.isEmpty else {
                writeResult(["ok": false, "op": op, "request_id": requestId, "error": "text_required"])
                return
            }
            var near: CGPoint?
            if let x = number(cmd["x"]), let y = number(cmd["y"]) { near = CGPoint(x: x, y: y) }
            let ok = TaloaShow.caption(text, seconds: number(cmd["seconds"]) ?? 4.0, near: near)
            writeResult(["ok": ok, "op": op, "request_id": requestId])

        case "clear":
            TaloaShow.clear()
            writeResult(["ok": true, "op": op, "request_id": requestId])

        case "capture":
            let path = cmd["path"] as? String ?? "/tmp/taloa-capture.png"
            let index = number(cmd["display"]).map { Int($0) } ?? 1
            let result = captureDisplay(index: index, to: path)
            var payload: [String: Any] = ["ok": result.ok, "op": op, "request_id": requestId,
                                          "path": path, "display": index,
                                          "screen_recording_granted": !result.blind]
            if let b = result.bounds {
                payload["display_bounds"] = [b.origin.x, b.origin.y, b.width, b.height]
            }
            if result.blind {
                payload["error"] = "screen_recording_permission_missing"
                payload["frame_contains"] = "desktop_wallpaper_and_menu_bar_only_no_windows"
                payload["remedy"] = "System Settings > Privacy & Security > Screen Recording > enable Taloa"
            }
            writeResult(payload)

        case "capture_all":
            let dir = cmd["dir"] as? String ?? "/tmp/taloa-frames"
            try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
            var frames: [[String: Any]] = []
            var allOK = true
            var blind = false
            for display in TaloaShow.displayBounds() {
                let path = "\(dir)/display-\(display.index).png"
                let result = captureDisplay(index: display.index, to: path)
                allOK = allOK && result.ok
                blind = blind || result.blind
                frames.append([
                    "index": display.index, "name": display.name, "path": path, "ok": result.ok,
                    "x": display.bounds.origin.x, "y": display.bounds.origin.y,
                    "width": display.bounds.width, "height": display.bounds.height,
                ])
            }
            var payload: [String: Any] = ["ok": allOK, "op": op, "request_id": requestId,
                                          "frames": frames,
                                          "screen_recording_granted": !blind]
            if blind {
                payload["error"] = "screen_recording_permission_missing"
                payload["frame_contains"] = "desktop_wallpaper_and_menu_bar_only_no_windows"
                payload["remedy"] = "System Settings > Privacy & Security > Screen Recording > enable Taloa"
            }
            writeResult(payload)

        case "click":
            guard let x = number(cmd["x"]), let y = number(cmd["y"]) else {
                writeResult(["ok": false, "op": op, "request_id": requestId, "error": "x_and_y_required"])
                return
            }
            let target = CGPoint(x: x, y: y)
            let trusted = isAccessibilityTrusted()
            let label = cmd["label"] as? String ?? "click here"
            let showFirst = (cmd["show_first"] as? Bool) ?? true

            // Refuse up front rather than posting events the OS will silently
            // drop and then reporting a success the founder can't verify.
            guard trusted else {
                if showFirst {
                    TaloaShow.point(at: target, label: "blocked: no Accessibility trust", seconds: 2.5)
                }
                TaloaLog.write("click.refused", "no_accessibility_trust at=\(Int(x)),\(Int(y))")
                writeResult(["ok": false, "op": op, "request_id": requestId,
                             "error": "accessibility_trust_missing",
                             "accessibility_trusted": false,
                             "shown": showFirst,
                             "remedy": "Taloa is ad-hoc signed, so each rebuild voids the existing grant. A stable signing identity is required for this to persist."])
                return
            }

            if showFirst { TaloaShow.point(at: target, label: label, seconds: 1.4) }
            let before = currentMouseLocation()
            DispatchQueue.main.asyncAfter(deadline: .now() + (showFirst ? 0.9 : 0)) {
                moveMouseAndClick(to: target)
                usleep(120_000)
                let after = currentMouseLocation()
                let landed = after.map { abs($0.x - x) < 3 && abs($0.y - y) < 3 } ?? false
                TaloaLog.write("click.done", "at=\(Int(x)),\(Int(y)) landed=\(landed)")
                writeResult(["ok": landed, "op": op, "request_id": requestId,
                             "accessibility_trusted": true,
                             "cursor_landed_on_target": landed,
                             "before": before.map { [$0.x, $0.y] } ?? [],
                             "after": after.map { [$0.x, $0.y] } ?? []])
            }

        case "type":
            let text = cmd["text"] as? String ?? ""
            guard isAccessibilityTrusted() else {
                writeResult(["ok": false, "op": op, "request_id": requestId,
                             "error": "accessibility_trust_missing"])
                return
            }
            if let x = number(cmd["x"]), let y = number(cmd["y"]) {
                moveMouseAndClick(to: CGPoint(x: x, y: y))
                usleep(200_000)
            }
            typeText(text)
            if (cmd["press_return"] as? Bool) == true {
                usleep(120_000)
                pressReturn()
            }
            writeResult(["ok": true, "op": op, "request_id": requestId, "typed_characters": text.count])

        default:
            writeResult(["ok": false, "op": op, "request_id": requestId,
                         "error": "unknown_op",
                         "supported": ["state", "highlight", "point", "caption", "clear",
                                       "capture", "capture_all", "click", "type"]])
        }
    }

    // MARK: - Helpers

    private static func number(_ value: Any?) -> Double? {
        if let d = value as? Double { return d }
        if let i = value as? Int { return Double(i) }
        if let n = value as? NSNumber { return n.doubleValue }
        if let s = value as? String { return Double(s) }
        return nil
    }

    private static func rect(from cmd: [String: Any]) -> CGRect? {
        if let array = cmd["rect"] as? [Any], array.count == 4 {
            let values = array.compactMap { number($0) }
            guard values.count == 4 else { return nil }
            return CGRect(x: values[0], y: values[1], width: values[2], height: values[3])
        }
        guard let x = number(cmd["x"]), let y = number(cmd["y"]),
              let w = number(cmd["width"]), let h = number(cmd["height"]) else { return nil }
        return CGRect(x: x, y: y, width: w, height: h)
    }

    private static func writeResult(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted]),
              let text = String(data: data, encoding: .utf8) else { return }
        try? (text + "\n").write(toFile: cmdResultPath, atomically: true, encoding: .utf8)
        TaloaLog.write("cmd.result", "ok=\(payload["ok"] ?? "?") op=\(payload["op"] ?? "?")")
    }
}
