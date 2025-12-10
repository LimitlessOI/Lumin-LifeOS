```javascript
const pulseSensor = require('pulse-sensor-js');

class BiometricProcessor {
    constructor() {
        this.pulseSensor = new pulseSensor();
        this.pulseSensor.on('pulse', (bpm) => {
            console.log('Heart rate:', bpm);
        });
    }

    processEEG(data) {
        console.log('Processing EEG data:', data);
    }

    processVoiceTone(toneData) {
        console.log('Processing voice tone:', toneData);
    }

    processMovement(movementData) {
        console.log('Processing movement data:', movementData);
    }
}

module.exports = new BiometricProcessor();
```