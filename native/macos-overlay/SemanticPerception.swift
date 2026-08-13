import Foundation
import Cocoa

// MARK: - Semantic Perception System

class SemanticPerception {

    private let visionService: VisionService // Assuming a VisionService exists for image analysis

    init(visionService: VisionService) {
        self.visionService = visionService
    }

    /// Observes the macOS UI for semantic information, prioritizing AXUIElement tree and falling back to vision.
    /// - Parameter completion: A closure to be called with the perceived semantic data.
    func observe(completion: @escaping (SemanticData) -> Void) {
        // Attempt to get semantic data from the AXUIElement tree
        if let axData = getSemanticDataFromAXUIElementTree() {
            completion(axData)
        } else {
            // Fallback to vision model if AXUIElement tree is empty or provides no meaningful data
            print("AXUIElement tree empty or insufficient, falling back to vision model.")
            captureScreenAndAnalyzeWithVision { visionData in
                completion(visionData)
            }
        }
    }

    // MARK: - AXUIElement Tree Interaction

    private func getSemanticDataFromAXUIElementTree() -> SemanticData? {
        guard let frontmostApp = NSWorkspace.shared.frontmostApplication else { return nil }
        let pid = frontmostApp.processIdentifier
        let appRef = AXUIElementCreateApplication(pid)

        var axChildren: CFArray?
        let result = AXUIElementCopyAttributeValue(appRef, kAXChildrenAttribute as CFString, &axChildren)

        guard result == .success, let children = axChildren as? [AXUIElement] else {
            return nil
        }

        var elements: [SemanticElement] = []
        for child in children {
            if let element = processAXUIElement(child) {
                elements.append(element)
            }
        }

        if elements.isEmpty {
            return nil
        }
        return SemanticData(elements: elements, source: .axTree)
    }

    private func processAXUIElement(_ axElement: AXUIElement) -> SemanticElement? {
        var axRole: AnyObject?
        AXUIElementCopyAttributeValue(axElement, kAXRoleAttribute as CFString, &axRole)
        let role = (axRole as? String) ?? "unknown"

        var axTitle: AnyObject?
        AXUIElementCopyAttributeValue(axElement, kAXTitleAttribute as CFString, &axTitle)
        let title = (axTitle as? String) ?? ""

        var axDescription: AnyObject?
        AXUIElementCopyAttributeValue(axElement, kAXDescriptionAttribute as CFString, &axDescription)
        let description = (axDescription as? String) ?? ""

        var axValue: AnyObject?
        AXUIElementCopyAttributeValue(axElement, kAXValueAttribute as CFString, &axValue)
        let value = (axValue as? String) ?? ""

        var axPosition: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXPositionAttribute as CFString, &axPosition)
        var cgPoint = CGPoint.zero
        if let value = axPosition {
            AXValueGetValue(value as! AXValue, .cgPoint, &cgPoint)
        }

        var axSize: CFTypeRef?
        AXUIElementCopyAttributeValue(axElement, kAXSizeAttribute as CFString, &axSize)
        var cgSize = CGSize.zero
        if let value = axSize {
            AXValueGetValue(value as! AXValue, .cgSize, &cgSize)
        }
        let frame = CGRect(origin: cgPoint, size: cgSize)

        // Basic filtering for meaningful elements
        if role == "AXWindow" || role == "AXApplication" {
            // Skip top-level containers that don't add specific semantic value beyond their children
            return nil
        }

        return SemanticElement(
            id: UUID().uuidString, // Assign a unique ID for tracking
            type: role,
            label: title.isEmpty ? description : title,
            value: value,
            frame: frame
        )
    }

    // MARK: - Vision Model Fallback

    private func captureScreenAndAnalyzeWithVision(completion: @escaping (SemanticData) -> Void) {
        guard let screenShot = captureScreen() else {
            completion(SemanticData(elements: [], source: .visionModel)) // Return empty data if screenshot fails
            return
        }

        visionService.analyzeImage(screenShot) { result in
            switch result {
            case .success(let visionResults):
                let elements = visionResults.map { visionResult in
                    SemanticElement(
                        id: UUID().uuidString,
                        type: visionResult.type,
                        label: visionResult.label,
                        value: nil, // Vision model might not directly provide 'value' in the same way as AX
                        frame: visionResult.boundingBox
                    )
                }
                completion(SemanticData(elements: elements, source: .visionModel))
            case .failure(let error):
                print("Vision analysis failed: \(error.localizedDescription)")
                completion(SemanticData(elements: [], source: .visionModel))
            }
        }
    }

    private func captureScreen() -> NSImage? {
        guard let screen = NSScreen.main else { return nil }
        let screenRect = screen.frame
        guard let cgImage = CGDisplayCreateImage(CGMainDisplayID()) else { return nil }
        return NSImage(cgImage: cgImage, size: screenRect.size)
    }
}

// MARK: - Data Models

struct SemanticData {
    let elements: [SemanticElement]
    let source: SemanticSource
}

struct SemanticElement: Identifiable, Hashable {
    let id: String
    let type: String // e.g., "button", "text", "window"
    let label: String? // e.g., button title, text content
    let value: String? // e.g., current value of a slider, text field content
    let frame: CGRect? // Position and size on screen
}

enum SemanticSource {
    case axTree
    case visionModel
}

// MARK: - Vision Service Protocol (Mock/Placeholder)

/// A protocol for a service that can analyze images to extract semantic information.
protocol VisionService {
    func analyzeImage(_ image: NSImage, completion: @escaping (Result<[VisionResult], Error>) -> Void)
}

struct VisionResult {
    let type: String
    let label: String
    let boundingBox: CGRect
}

// MARK: - Example Vision Service Implementation (Placeholder)

class MockVisionService: VisionService {
    func analyzeImage(_ image: NSImage, completion: @escaping (Result<[VisionResult], Error>) -> Void) {
        // Simulate a vision model analyzing the image
        DispatchQueue.global().asyncAfter(deadline: .now() + 1.0) {
            let mockResults: [VisionResult] = [
                VisionResult(type: "button", label: "Submit", boundingBox: CGRect(x: 100, y: 100, width: 80, height: 30)),
                VisionResult(type: "text_field", label: "Search input", boundingBox: CGRect(x: 200, y: 150, width: 200, height: 25)),
                VisionResult(type: "image", label: "Company Logo", boundingBox: CGRect(x: 50, y: 50, width: 50, height: 50))
            ]
            completion(.success(mockResults))
        }
    }
}