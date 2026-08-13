import Foundation
import os.log
import Combine

class MacOsBodyAdapter: BodyAdapter {
    private let screenControl: MacOsScreenControl
    private let semanticPerception: MacOsSemanticPerception
    private var cancellables = Set<AnyCancellable>()

    init(screenControl: MacOsScreenControl, semanticPerception: MacOsSemanticPerception) {
        self.screenControl = screenControl
        self.semanticPerception = semanticPerception
        os_log("MacOsBodyAdapter initialized.", log: OSLog.default, type: .info)
        observeScreenControl()
        observeSemanticPerception()
    }

    func act(action: BodyAction) {
        os_log("MacOsBodyAdapter received action: %@", log: OSLog.default, type: .info, String(describing: action))
        switch action {
        case .tap(let x, let y):
            screenControl.tap(atX: x, y: y)
        case .scroll(let dx, let dy):
            screenControl.scroll(byDx: dx, dy: dy)
        case .sendKeys(let keys):
            screenControl.sendKeys(keys)
        case .focusElement(let elementId):
            screenControl.focusElement(id: elementId)
        case .requestScreenshot:
            // The screenshot is provided via observation, not direct action response
            break
        case .requestSemanticTree:
            // The semantic tree is provided via observation, not direct action response
            break
        }
    }

    func observeScreenControl() {
        screenControl.screenshotPublisher
            .sink { [weak self] imageData in
                // This is the 'observe' part for screenshots
                // The 'verify' part would involve an independent mechanism checking if the screenshot
                // accurately reflects the current screen state, which is outside this adapter's scope.
                os_log("MacOsBodyAdapter observed new screenshot data.", log: OSLog.default, type: .debug)
                self?.notifyObservation(observation: .screenshot(imageData))
            }
            .store(in: &cancellables)
    }

    func observeSemanticPerception() {
        semanticPerception.semanticTreePublisher
            .sink { [weak self] semanticTreeData in
                // This is the 'observe' part for the semantic tree
                // The 'verify' part would involve an independent mechanism checking if the semantic tree
                // accurately represents the UI elements, which is outside this adapter's scope.
                os_log("MacOsBodyAdapter observed new semantic tree data.", log: OSLog.default, type: .debug)
                self?.notifyObservation(observation: .semanticTree(semanticTreeData))
            }
            .store(in: &cancellables)
    }

    private func notifyObservation(observation: BodyObservation) {
        // In a real system, this would publish to a central observation stream or a delegate.
        // For this factory-2 compilation, we'll just log it.
        os_log("MacOsBodyAdapter produced observation: %@", log: OSLog.default, type: .info, String(describing: observation))
    }
}