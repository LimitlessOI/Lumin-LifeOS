/**
 * Overlay print §64 — macOS semantic perception.
 * AXUIElement tree-walk primary; vision fallback hook when AX is empty.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import Foundation
import AppKit
import ApplicationServices
import Vision // Add Vision framework for potential future vision model integration

struct SemanticElement: Identifiable, Equatable {
    let id: String
    let type: String
    let label: String
    let value: String
    let frame: CGRect
}

struct SemanticData: Equatable {
    enum Source: String, Equatable {
        case axTree
        case visionModel
    }

    let elements: [SemanticElement]
    let source: Source
}

protocol VisionService {
    func analyzeImage(_ image: NSImage, completion: @escaping (Result<[SemanticElement], Error>) -> Void)
}

final class SemanticPerception {
    private let visionService: VisionService?

    init(visionService: VisionService? = nil) {
        self.visionService = visionService
    }

    func observe(completion: @escaping (SemanticData) -> Void) {
        if let axData = getSemanticDataFromAXUIElementTree(), !axData.elements.isEmpty {
            completion(axData)
            return
        }
        captureScreenAndAnalyzeWithVision(completion: completion)
    }

    private func getSemanticDataFromAXUIElementTree() -> SemanticData? {
        guard let frontmostApp = NSWorkspace.shared.frontmostApplication else { return nil }
        let appRef = AXUIElementCreateApplication(frontmostApp.processIdentifier)

        var childrenRef: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(appRef, kAXChildrenAttribute as CFString, &childrenRef)
        guard result == .success, let children = childrenRef as? [AXUIElement] else { return nil }

        var elements: [SemanticElement] = []
        for child in children {
            collectElements(from: child, into: &elements, depth: 0)
        }
        if elements.isEmpty { return nil }
        return SemanticData(elements: elements, source: .axTree)
    }

    private func collectElements(from axElement: AXUIElement, into elements: inout [SemanticElement], depth: Int) {
        if depth > 8 { return }

        var roleRef: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXRoleAttribute as CFString, &roleRef)
        let role = (roleRef as? String) ?? "unknown"

        var titleRef: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXTitleAttribute as CFString, &titleRef)
        let title = (titleRef as? String) ?? ""

        var descriptionRef: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXDescriptionAttribute as CFString, &descriptionRef)
        let description = (descriptionRef as? String) ?? ""

        var valueRef: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXValueAttribute as CFString, &valueRef)
        let value = (valueRef as? String) ?? String(describing: valueRef ?? "" as CFTypeRef)

        var positionRef: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXPositionAttribute as CFString, &positionRef)
        var point = CGPoint.zero
        if let positionRef, CFGetTypeID(positionRef) == AXValueGetTypeID() {
            AXValueGetValue(positionRef as! AXValue, .cgPoint, &point)
        }

        var sizeRef: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXSizeAttribute as CFString, &sizeRef)
        var size = CGSize.zero
        if let sizeRef, CFGetTypeID(sizeRef) == AXValueGetTypeID() {
            AXValueGetValue(sizeRef as! AXValue, .cgSize, &size)
        }

        let label = title.isEmpty ? description : title
        if role != "AXApplication" && (!label.isEmpty || !value.isEmpty) {
            elements.append(
                SemanticElement(
                    id: UUID().uuidString,
                    type: role,
                    label: label,
                    value: value,
                    frame: CGRect(origin: point, size: size)
                )
            )
        }

        var childRef: CFTypeRef?
        let childResult = AXUIElementCopyAttributeValue(axElement, kAXChildrenAttribute as CFString, &childRef)
        if childResult == .success, let children = childRef as? [AXUIElement] {
            for child in children {
                collectElements(from: child, into: &elements, depth: depth + 1)
            }
        }
    }

    private func captureScreenAndAnalyzeWithVision(completion: @escaping (SemanticData) -> Void) {
        guard let visionService, let image = captureScreen() else {
            completion(SemanticData(elements: [], source: .visionModel))
            return
        }
        visionService.analyzeImage(image) { result in
            switch result {
            case .success(let elements):
                completion(SemanticData(elements: elements, source: .visionModel))
            case .failure:
                completion(SemanticData(elements: [], source: .visionModel))
            }
        }
    }

    private func captureScreen() -> NSImage? {
        guard let cgImage = CGDisplayCreateImage(CGMainDisplayID()) else { return nil }
        return NSImage(cgImage: cgImage, size: NSSize(width: cgImage.width, height: cgImage.height))
    }
}