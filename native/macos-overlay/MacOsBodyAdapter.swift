/**
 * Overlay print §64 — macOS Universal Body adapter (observe/act/verify).
 * Uses SemanticPerception for observe; ScreenControl for act.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import Foundation
import AppKit
import ApplicationServices

enum MacOsBodyAction {
    case click(CGPoint)
    case typeText(String)
    case key(String)
}

final class MacOsBodyAdapter {
    private let perception: SemanticPerception

    init(perception: SemanticPerception = SemanticPerception()) {
        self.perception = perception
    }

    func observe(completion: @escaping (SemanticData) -> Void) {
        perception.observe(completion: completion)
    }

    func act(_ action: MacOsBodyAction) {
        switch action {
        case .click(let point):
            click(at: point)
        case .typeText(let text):
            typeText(text)
        case .key(let key):
            typeText(key)
        }
    }

    func verify(expectedLabel: String, completion: @escaping (Bool) -> Void) {
        observe { data in
            let ok = data.elements.contains { element in
                element.label.localizedCaseInsensitiveContains(expectedLabel)
            }
            completion(ok)
        }
    }

    private func click(at point: CGPoint) {
        let source = CGEventSource(stateID: .hidSystemState)
        let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left)
        let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)
    }

    private func typeText(_ text: String) {
        let source = CGEventSource(stateID: .hidSystemState)
        for ch in text.utf16 {
            var chars = [UniChar(ch)]
            let down = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true)
            let up = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false)
            down?.keyboardSetUnicodeString(stringLength: 1, unicodeString: &chars)
            up?.keyboardSetUnicodeString(stringLength: 1, unicodeString: &chars)
            down?.post(tap: .cghidEventTap)
            up?.post(tap: .cghidEventTap)
        }
    }
}
