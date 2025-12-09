```python
import tensorflow as tf
import numpy as np

class EdgeInference:
    def __init__(self, model_path):
        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()

    def predict(self, input_data):
        input_details = self.interpreter.get_input_details()
        output_details = self.interpreter.get_output_details()
        
        self.interpreter.set_tensor(input_details[0]['index'], input_data)
        self.interpreter.invoke()
        output_data = self.interpreter.get_tensor(output_details[0]['index'])
        return output_data

# Example usage
# edge_inference = EdgeInference('model.tflite')
# prediction = edge_inference.predict(np.array([input_data], dtype=np.float32))
```