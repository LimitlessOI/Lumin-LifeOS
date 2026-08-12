// SYNOPSIS: Taloa overlay -- durable on-disk logging.
// Found live 2026-08-11 during Layer B UAT: the app wrote nothing to the
// unified log across ten minutes of operation, so the founder's primary
// interface had zero observability -- no way to answer "what did it just do"
// after the fact. stderr alone is lost because the app is launched with
// `open`, which discards it. Everything meaningful now lands in a real file
// that survives the process.
// @ssot docs/products/lifeos/PRODUCT_HOME.md
import Foundation

enum TaloaLog {
    private static let maxBytes = 2 * 1024 * 1024
    private static let queue = DispatchQueue(label: "org.hopkinsgroup.taloa.log")

    private static let logDirectory: URL = {
        let base = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Logs/Taloa", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }()

    static var logFile: URL { logDirectory.appendingPathComponent("taloa.log") }

    private static let stamp: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    /// Fire-and-forget. Serialized on its own queue so concurrent callers
    /// (three character views, the command channel, the webview delegates)
    /// can never interleave a half-written line.
    static func write(_ event: String, _ detail: String = "") {
        let line = "\(stamp.string(from: Date())) \(event)\(detail.isEmpty ? "" : " " + detail)\n"
        FileHandle.standardError.write(line.data(using: .utf8)!)
        queue.async {
            rotateIfNeeded()
            guard let data = line.data(using: .utf8) else { return }
            if let handle = try? FileHandle(forWritingTo: logFile) {
                handle.seekToEndOfFile()
                handle.write(data)
                try? handle.close()
            } else {
                try? data.write(to: logFile)
            }
        }
    }

    private static func rotateIfNeeded() {
        guard let size = try? FileManager.default
            .attributesOfItem(atPath: logFile.path)[.size] as? Int, size > maxBytes else { return }
        let previous = logDirectory.appendingPathComponent("taloa.log.1")
        try? FileManager.default.removeItem(at: previous)
        try? FileManager.default.moveItem(at: logFile, to: previous)
    }
}
