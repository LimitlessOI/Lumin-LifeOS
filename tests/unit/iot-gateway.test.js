const { mqttClient } = require('../../services/energy/iot-gateway');

test('MQTT client should connect to broker', (done) => {
  mqttClient.on('connect', () => {
    expect(mqttClient.connected).toBe(true);
    done();
  });
});