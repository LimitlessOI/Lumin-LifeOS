```python
import tensorflow as tf
import numpy as np

def load_model(model_path):
    model = tf.lite.Interpreter(model_path=model_path)
    model.allocate_tensors()
    return model

def predict_anomaly(model, data):
    input_details = model.get_input_details()
    output_details = model.get_output_details()

    model.set_tensor(input_details[0]['index'], data)
    model.invoke()

    output_data = model.get_tensor(output_details[0]['index'])
    return output_data

if __name__ == "__main__":
    model_path = "model.tflite"
    model = load_model(model_path)
    sample_data = np.array([[0.1, 0.2, 0.3]], dtype=np.float32)
    prediction = predict_anomaly(model, sample_data)
    print("Prediction:", prediction)
```