import numpy as np
from sklearn.externals import joblib

class ThreatDetector:
    def __init__(self, model_path):
        self.model = joblib.load(model_path)
    
    def predict(self, data):
        try:
            prediction = self.model.predict(data)
            return prediction
        except Exception as e:
            print(f"Error during prediction: {e}")
            return None

# Example usage
if __name__ == "__main__":
    detector = ThreatDetector("path/to/threat_model.pkl")
    example_data = np.array([[0.1, 0.2, 0.3]])
    result = detector.predict(example_data)
    print(f"Threat Prediction: {result}")
#