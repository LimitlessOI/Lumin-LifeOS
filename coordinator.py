```python
import syft as sy
import tensorflow as tf
from syft.frameworks.tensorflow.fl import FederatedLearningHook

hook = FederatedLearningHook(tf)
clients = ["client1", "client2"]

def create_model():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(128, activation='relu', input_shape=(784,)),
        tf.keras.layers.Dense(10, activation='softmax')
    ])
    return model

model = create_model()

def start_federated_learning():
    for epoch in range(10):
        for client in clients:
            # Simulate federated learning
            print(f"Training with {client}")
            # Model training logic goes here

start_federated_learning()
```