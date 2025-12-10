```python
import tensorflow as tf

def train_model(data):
    # Example TensorFlow model training
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(128, activation='relu', input_shape=(data.shape[1],)),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])

    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    model.fit(data['features'], data['labels'], epochs=10)
    
    model.save('model.h5')
    return model
```