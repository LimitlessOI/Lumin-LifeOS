```python
import tensorflow as tf
import json
from kafka import KafkaConsumer, KafkaProducer

def load_model():
    # Load the pre-trained TensorFlow model
    model = tf.keras.models.load_model('path/to/your/model')
    return model

def analyze_data(data, model):
    # Process and predict using the model
    prediction = model.predict(data)
    return prediction

def main():
    consumer = KafkaConsumer(
        'wildlife-data',
        bootstrap_servers='localhost:9092',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    producer = KafkaProducer(
        bootstrap_servers='localhost:9092',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    model = load_model()
    
    for message in consumer:
        data = message.value
        prediction = analyze_data(data['data'], model)
        
        alert = {
            'observation_id': data.get('observation_id'),
            'alert_type': 'Potential threat detected',
            'severity': int(prediction[0] * 100),  # Example severity scoring
            'message': f'Threat level: {prediction[0]}'
        }
        
        producer.send('conservation-alerts', alert)
        print(f'Sent alert: {alert}')

if __name__ == "__main__":
    main()
```