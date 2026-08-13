// SYNOPSIS: factory-2 overlay keep-alive -- Taloa pings the live overlay
// shell and the overlay-host health route so a dead host is visible in
// taloa.log instead of silent. Native lane owns this file.
// @ssot docs/products/universal-overlay/PRODUCT_HOME.md
import Foundation

enum OverlayHostPing {
    private static let origin = URL(string: "https://lumin-web-production-e3a9.up.railway.app")!
    private static let envPath = "/Users/adamhopkins/Projects/Lumin-LifeOS/.env"

    static func start() {
        ping()
        Timer.scheduledTimer(withTimeInterval: 120, repeats: true) { _ in ping() }
    }

    private static func ping() {
        get(path: "/lifeos") { status in
            TaloaLog.write("overlay.ping.lifeos", "status=\(status)")
        }
        get(path: "/overlay/lifeos-app.html") { status in
            TaloaLog.write("overlay.ping.app", "status=\(status)")
        }
        var host = URLRequest(url: origin.appendingPathComponent("api/v1/taloa/overlay-host/health"))
        if let key = commandKey() {
            host.setValue(key, forHTTPHeaderField: "x-command-key")
        }
        fetch(host) { status in
            TaloaLog.write("overlay.ping.host", "status=\(status)")
        }
    }

    private static func get(path: String, done: @escaping (Int) -> Void) {
        guard let url = URL(string: path, relativeTo: origin) else { return }
        fetch(URLRequest(url: url), done: done)
    }

    private static func fetch(_ request: URLRequest, done: @escaping (Int) -> Void) {
        URLSession.shared.dataTask(with: request) { _, response, error in
            if error != nil {
                done(0)
                return
            }
            done((response as? HTTPURLResponse)?.statusCode ?? 0)
        }.resume()
    }

    private static func commandKey() -> String? {
        guard let body = try? String(contentsOfFile: envPath, encoding: .utf8) else { return nil }
        for raw in body.split(whereSeparator: \.isNewline) {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("COMMAND_CENTER_KEY=") {
                let value = line.dropFirst("COMMAND_CENTER_KEY=".count).trimmingCharacters(in: .whitespaces)
                return value.isEmpty ? nil : String(value)
            }
        }
        return nil
    }
}
