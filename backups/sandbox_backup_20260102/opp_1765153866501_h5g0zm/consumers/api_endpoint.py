```python
from kafka import KafkaConsumer
# Assume necessary imports for authentication and SSL are already done here

def consume_messages(topic):
    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=['kafka-broker:9092'],
        group_id='my-group',
        auto_offset_reset='earliest',
        security_protocol='SSL', ssl_cafile='/path/to/ca.pem'
    )
    
    for message in consumer:
        print(f"Received a message: {message.value.decode()}")
```