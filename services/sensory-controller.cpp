```cpp
// sensory-controller.cpp
#include <iostream>
#include <string>

class SensoryController {
public:
    void updateDeviceConfig(int deviceId, const std::string& config) {
        // Logic to update device configuration
        std::cout << "Updating device " << deviceId << " with config: " << config << std::endl;
    }

    void activateHapticFeedback(int deviceId) {
        // Logic to activate haptic feedback
        std::cout << "Activating haptic feedback for device " << deviceId << std::endl;
    }

    void activateScentModule(int deviceId) {
        // Logic to activate scent module
        std::cout << "Activating scent module for device " << deviceId << std::endl;
    }
};