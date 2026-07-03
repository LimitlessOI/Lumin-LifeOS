```python
import tensorflow as tf
import numpy as np

# Sample training data
data = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
labels = np.array([0, 1])

model = tf.keras.Sequential([
    tf.keras.layers.Dense(8, activation='relu', input_shape=(3,)),
    tf.keras.layers.Dense(1, activation='linear')
])

model.compile(optimizer='adam', loss='mse')

model.fit(data, labels, epochs=100)

model.save('model.h5')
print("Model training complete and saved as model.h5")