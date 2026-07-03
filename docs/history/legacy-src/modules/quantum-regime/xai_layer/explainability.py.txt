import shap
import lime
import lime.lime_tabular

def explain_with_shap(model, data):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(data)
    return shap_values

def explain_with_lime(model, data):
    explainer = lime.lime_tabular.LimeTabularExplainer(data, mode='classification')
    explanation = explainer.explain_instance(data.iloc[0], model.predict_proba)
    return explanation