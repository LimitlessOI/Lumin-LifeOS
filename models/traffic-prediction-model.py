import tensorflow as tf
from tensorflow import keras
import numpy as np

# Generate dummy data
def generate_dummy_data():
    x_train = np.random.rand(1000, 10)
    y_train = np.random.rand(1000, 1)
    return x_train, y_train

# Define the model
def build_model():
    model = keras.Sequential([
        keras.layers.Dense(64, activation='relu', input_shape=(10,)),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dense(1)
    ])
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

# Train the model
x_train, y_train = generate_dummy_data()
model = build_model()
model.fit(x_train, y_train, epochs=10)

# Save the model
model.save('traffic_model.h5')