import numpy as np
from sklearn.externals import joblib

class AnomalyDetector:
    def __init__(self, model_path):
        self.model = joblib.load(model_path)
    
    def detect_anomaly(self, data):
        try:
            anomaly_score = self.model.decision_function(data)
            return anomaly_score
        except Exception as e:
            print(f"Error during anomaly detection: {e}")
            return None

# Example usage
if __name__ == "__main__":
    detector = AnomalyDetector("path/to/anomaly_model.pkl")
    example_data = np.array([[0.1, 0.2, 0.3]])
    score = detector.detect_anomaly(example_data)
    print(f"Anomaly Score: {score}")
#