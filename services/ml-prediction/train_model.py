```python
import pika
import json
from sklearn.linear_model import LinearRegression
import numpy as np

def train_and_predict(data):
    # Example: Training a simple linear regression model
    X = np.array(data['features'])
    y = np.array(data['targets'])
    
    model = LinearRegression()
    model.fit(X, y)
    
    predictions = model.predict(X)
    return predictions.tolist()

def callback(ch, method, properties, body):
    message = json.loads(body)
    predictions = train_and_predict(message)
    
    print("Predictions:", predictions)
    
    # Here you would normally send the predictions back to a service or store them in a database

def start():
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    queue = 'ml_training_data'
    
    channel.queue_declare(queue=queue, durable=True)
    channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)
    
    print('Waiting for messages in', queue)
    channel.start_consuming()

if __name__ == '__main__':
    start()
```