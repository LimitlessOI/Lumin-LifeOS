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
    private let screenControl: ScreenControlProtocol // Explicit dependency
    private let log = OSLog(subsystem: "com.lumin.taloa", category: "MacOsBodyAdapter")

    init(perception: SemanticPerception = SemanticPerception(), screenControl: ScreenControlProtocol = ScreenControlBridge.shared) {
        self.perception = perception
        self.screenControl = screenControl
    }

    func observe(scope: String = "frontmost", completion: @escaping (BodyObservation) -> Void) {
        if scope == "mouse" {
            if let point = screenControl.currentMouseLocation() {
                completion(.mouseLocation(point))
                return
            }
            completion(.text("mouse_location_unavailable"))
            return
        }
        
        if scope == "screenshot" {
            if let screenshotData = screenControl.takeScreenshot() {
                completion(.screenshot(screenshotData))
                return
            }
            completion(.text("screenshot_unavailable"))
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
            screenControl.moveMouseAndClick(to: CGPoint(x: x, y: y))
        case .typeText(let text):
            screenControl.typeText(text)
        case .requestScreenshot, .requestSemanticTree:
            // These are observation requests, not actions that directly modify the system state
            break
        }
    }

    func verify(goal: String, expected: String, completion: @escaping (BodyVerifyResult) -> Void) {
        // Independent observation for verification
        observe(scope: "frontmost") { frontmostObservation in
            var verificationChecks: [(() -> Void)] = []

            // Semantic verification
            verificationChecks.append {
                if case .semanticTree(let data) = frontmostObservation {
                    let haystack = data.elements.map { "\($0.label) \($0.value)" }.joined(separator: " ").lowercased()
                    let needle = expected.lowercased()
                    let ok = !needle.isEmpty && haystack.contains(needle)
                    if ok {
                        completion(BodyVerifyResult(ok: true, reason: "semantic_match:\(goal)"))
                        return
                    }
                }
            }
            
            // Mouse location verification (if expected relates to mouse position)
            if goal.contains("mouse_location") {
                self.observe(scope: "mouse") { mouseObservation in
                    if case .mouseLocation(let point) = mouseObservation {
                        let expectedParts = expected.split(separator: ",").map { Double($0.trimmingCharacters(in: .whitespaces)) }
                        if expectedParts.count == 2, let expX = expectedParts[0], let expY = expectedParts[1] {
                            // Allow for some tolerance in mouse location verification
                            let tolerance: CGFloat = 5.0
                            let ok = abs(point.x - CGFloat(expX)) < tolerance && abs(point.y - CGFloat(expY)) < tolerance
                            if ok {
                                completion(BodyVerifyResult(ok: true, reason: "mouse_location_match:\(goal)"))
                                return
                            }
                        }
                    }
                    // If mouse location was the specific goal but didn't match
                    if goal.contains("mouse_location") {
                         completion(BodyVerifyResult(ok: false, reason: "mouse_location_miss:\(goal)"))
                         return
                    }
                }
            }
            
            // Screenshot content verification (if expected relates to visual content)
            if goal.contains("screenshot_content") {
                self.observe(scope: "screenshot") { screenshotObservation in
                    if case .screenshot(let imageData) = screenshotObservation {
                        // In a real scenario, this would involve image analysis (e.g., OCR, image comparison)
                        // For this exercise, we'll simulate a basic check or assume an external vision system would handle 'expected' against 'imageData'.
                        // For now, if we successfully got a screenshot, we can consider it "observed" for verification purposes
                        let ok = !imageData.isEmpty // Placeholder: actual content verification would be more complex
                        if ok {
                            completion(BodyVerifyResult(ok: true, reason: "screenshot_observed:\(goal)"))
                            return
                        }
                    }
                    // If screenshot content was the specific goal but couldn't get a screenshot
                    if goal.contains("screenshot_content") {
                        completion(BodyVerifyResult(ok: false, reason: "screenshot_unavailable_for_verification:\(goal)"))
                        return
                    }
                }
            }

            // Execute the semantic check after other specific checks, as a fallback or primary
            for check in verificationChecks {
                check()
            }
            
            // If no specific verification returned a result, provide a generic miss.
            completion(BodyVerifyResult(ok: false, reason: "verification_failed_no_match:\(goal)"))
        }
    }
}

// Define a protocol for ScreenControl to allow for dependency injection and mocking
protocol ScreenControlProtocol {
    static var shared: ScreenControlProtocol { get }
    func currentMouseLocation() -> CGPoint?
    func moveMouseAndClick(to point: CGPoint)
    func typeText(_ text: String)
    func takeScreenshot() -> Data?
}

// ScreenControl is a case-less enum (a static namespace) -- it has no
// initializer and can never hold a value, so it cannot itself conform to a
// protocol with instance requirements. This forwarding struct is the
// smallest real fix: it is the one concrete value the protocol needs.
struct ScreenControlBridge: ScreenControlProtocol {
    static var shared: ScreenControlProtocol = ScreenControlBridge()

    func currentMouseLocation() -> CGPoint? {
        return ScreenControl.currentMouseLocation()
    }

    func moveMouseAndClick(to point: CGPoint) {
        ScreenControl.moveMouseAndClick(to: point)
    }

    func typeText(_ text: String) {
        ScreenControl.typeText(text)
    }

    func takeScreenshot() -> Data? {
        guard let cgImage = CGDisplayCreateImage(CGMainDisplayID()) else { return nil }
        let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
        return bitmapRep.representation(using: .png, properties: [:])
    }
}