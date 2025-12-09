```cpp
#include <Arduino.h>

void setup() {
    Serial.begin(9600);
    pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
    // Proof of Physical Presence logic
    if (digitalRead(2) == HIGH) { // Assuming a sensor is connected to pin 2
        Serial.println("Presence detected");
        digitalWrite(LED_BUILTIN, HIGH);
    } else {
        digitalWrite(LED_BUILTIN, LOW);
    }
    delay(1000);
}
```