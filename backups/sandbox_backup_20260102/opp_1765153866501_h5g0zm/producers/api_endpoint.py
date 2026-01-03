```python
from kafka import KafkaProducer
# Assume necessary imports for authentication and SSL are already done here

def send_message(topic, value):
    producer = KafkaProducer(bootstrap_servers=['kafka-broker:9092'], security_protocol='SSL', ssl_cafile='/path/to/ca.pem')
    
    future = producer.send(topic, key=b'key', value=value)  # Send the message to Kafka
```