/**
 * Overlay print §64 — macOS Universal Body adapter.
 * observe / act / verify over ScreenControl + SemanticPerception.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import Foundation
import AppKit
import os.log

enum BodyAction: Equatable {
    case tap(x: Double, y: Double)
    case typeText(String)
    case requestScreenshot
    case requestSemanticTree
}

enum BodyObservation: Equatable {
    case screenshot(Data)
    case semanticTree(SemanticData)
    case mouseLocation(CGPoint)
    case text(String)
}

struct BodyVerifyResult: Equatable {
    let ok: Bool
    let reason: String
}

final class MacOsBodyAdapter {
    private let perception: SemanticPerception
    private let log = OSLog(subsystem: "com.lumin.taloa", category: "MacOsBodyAdapter")

    init(perception: SemanticPerception = SemanticPerception()) {
        self.perception = perception
    }

    func observe(scope: String = "frontmost", completion: @escaping (BodyObservation) -> Void) {
        if scope == "mouse" {
            if let point = ScreenControl.currentMouseLocation() {
                completion(.mouseLocation(point))
                return
            }
            completion(.text("mouse_location_unavailable"))
            return
        }
        perception.observe { data in
            completion(.semanticTree(data))
        }
    }

    func act(_ action: BodyAction) {
        os_log("act %{public}@", log: log, type: .info, String(describing: action))
        switch action {
        case .tap(let x, let y):
            ScreenControl.moveMouseAndClick(to: CGPoint(x: x, y: y))
        case .typeText(let text):
            ScreenControl.typeText(text)
        case .requestScreenshot, .requestSemanticTree:
            break
        }
    }

    func verify(goal: String, expected: String, completion: @escaping (BodyVerifyResult) -> Void) {
        observe(scope: "frontmost") { observation in
            switch observation {
            case .semanticTree(let data):
                let haystack = data.elements.map { "\($0.label) \($0.value)" }.joined(separator: " ").lowercased()
                let needle = expected.lowercased()
                let ok = !needle.isEmpty && haystack.contains(needle)
                completion(BodyVerifyResult(
                    ok: ok,
                    reason: ok ? "semantic_match:\(goal)" : "semantic_miss:\(goal)"
                ))
            case .text(let text):
                let ok = text.lowercased().contains(expected.lowercased())
                completion(BodyVerifyResult(ok: ok, reason: ok ? "text_match" : "text_miss"))
            default:
                completion(BodyVerifyResult(ok: false, reason: "unsupported_observation"))
            }
        }
    }
}
