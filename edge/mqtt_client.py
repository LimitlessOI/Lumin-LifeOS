```python
import paho.mqtt.client as mqtt

class MQTTClient:
    def __init__(self, broker_address, topic):
        self.client = mqtt.Client()
        self.broker_address = broker_address
        self.topic = topic

    def connect(self):
        self.client.connect(self.broker_address)

    def publish(self, message):
        self.client.publish(self.topic, message)

    def subscribe(self, on_message):
        self.client.on_message = on_message
        self.client.subscribe(self.topic)
        self.client.loop_start()

# Usage example:
# client = MQTTClient("mqtt_broker_address", "sensor/data")
# client.connect()
# client.publish("Sample message")
```