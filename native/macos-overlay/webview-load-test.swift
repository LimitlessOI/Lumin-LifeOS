// SYNOPSIS: Standalone, non-interactive harness -- verifies the real /lifeos
// URL actually loads inside a WKWebView (the Phase 2/4 risk: network/ATS/cert
// issues that unit-level code review can't catch). Not part of the shipped
// overlay; exits with a pass/fail line and process code.
import Cocoa
import WebKit

final class LoadChecker: NSObject, WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("document.title") { title, _ in
            FileHandle.standardError.write("PASS: loaded, document.title=\(title ?? "nil")\n".data(using: .utf8)!)
            exit(0)
        }
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        FileHandle.standardError.write("FAIL(didFail): \(error)\n".data(using: .utf8)!)
        exit(1)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        FileHandle.standardError.write("FAIL(provisional): \(error)\n".data(using: .utf8)!)
        exit(1)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 400, height: 400))
let checker = LoadChecker()
webView.navigationDelegate = checker
let url = URL(string: "https://lumin-web-production-e3a9.up.railway.app/lifeos?native=1&layout=mobile&direct_system=1")!
webView.load(URLRequest(url: url))

// Hard timeout so this never hangs the harness.
DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
    FileHandle.standardError.write("FAIL(timeout): no navigation callback within 20s\n".data(using: .utf8)!)
    exit(2)
}

app.run()
