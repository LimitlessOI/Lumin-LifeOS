```python
import tensorflow as tf
import logging

logging.basicConfig(level=logging.INFO)

def build_model(input_shape):
    model = tf.keras.Sequential([
        tf.keras.layers.InputLayer(input_shape=input_shape),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(1, activation='linear')
    ])
    model.compile(optimizer='adam', loss='mean_squared_error')
    logging.info("AI model built and compiled.")
    return model

def train_model(model, train_data, train_labels):
    model.fit(train_data, train_labels, epochs=10)
    logging.info("Model training complete.")

def predict(model, input_data):
    prediction = model.predict(input_data)
    logging.info(f"Model prediction: {prediction}")
    return prediction

if __name__ == "__main__":
    # Example usage
    model = build_model((10,))
    # Assume train_data and train_labels are available
    train_model(model, train_data, train_labels)
    # Assume input_data is available
    prediction = predict(model, input_data)
```