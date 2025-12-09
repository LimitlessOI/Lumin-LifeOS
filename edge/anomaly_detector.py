```python
import tflite_runtime.interpreter as tflite
import numpy as np

class AnomalyDetector:
    def __init__(self, model_path):
        self.interpreter = tflite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()

    def predict(self, input_data):
        input_details = self.interpreter.get_input_details()
        output_details = self.interpreter.get_output_details()

        self.interpreter.set_tensor(input_details[0]['index'], input_data)
        self.interpreter.invoke()
        predictions = self.interpreter.get_tensor(output_details[0]['index'])
        
        # Simple anomaly detection logic
        return predictions > 0.5

# Usage example:
# detector = AnomalyDetector("model.tflite")
# result = detector.predict(np.array([[0.1, 0.2, 0.3]], dtype=np.float32))
```