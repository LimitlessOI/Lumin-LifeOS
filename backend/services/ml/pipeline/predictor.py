```python
import tensorflow as tf

def predict(input_data):
    # Load the trained model
    model = tf.keras.models.load_model('model.h5')
    predictions = model.predict(input_data)
    return predictions
```