```python
from xgboost import XGBClassifier
import tensorflow as tf

class EnsembleModel:
    def __init__(self, xgb_model_path, lstm_model_path):
        self.xgb_model = XGBClassifier()
        self.xgb_model.load_model(xgb_model_path)
        
        self.lstm_model = tf.keras.models.load_model(lstm_model_path)

    def predict(self, features):
        xgb_pred = self.xgb_model.predict(features)
        lstm_pred = self.lstm_model.predict(features)
        
        # Simple ensemble strategy
        final_prediction = (xgb_pred + lstm_pred) / 2
        return final_prediction

# Example usage
# ensemble = EnsembleModel('xgb_model.json', 'lstm_model.h5')
# prediction = ensemble.predict(features)
```