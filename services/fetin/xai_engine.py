```python
import shap
import lime
import lime.lime_tabular
import logging
import numpy as np

logging.basicConfig(level=logging.INFO)

class XAIEngine:
    def __init__(self, model):
        self.model = model
        self.explainer = shap.Explainer(self.model)

    def explain_with_shap(self, data):
        logging.info("Generating SHAP explanations.")
        shap_values = self.explainer(data)
        return shap_values

    def explain_with_lime(self, data, instance_index=0):
        logging.info("Generating LIME explanations.")
        explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data=np.array(data),
            feature_names=['feature1', 'feature2', 'feature3'],
            class_names=['class1', 'class2'],
            mode='classification'
        )
        exp = explainer.explain_instance(data.iloc[instance_index], self.model.predict_proba)
        return exp

# Example usage
if __name__ == "__main__":
    model = ...  # Define or load your model
    xai_engine = XAIEngine(model)
    data = ...  # Load your data
    shap_explanation = xai_engine.explain_with_shap(data)
    lime_explanation = xai_engine.explain_with_lime(data)