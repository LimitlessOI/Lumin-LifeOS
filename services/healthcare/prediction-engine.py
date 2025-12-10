```python
import tensorflow as tf
import psycopg2
import json

def load_model():
    return tf.keras.models.load_model('path/to/your/model.h5')

def predict(data):
    model = load_model()
    predictions = model.predict(data)
    return predictions

def store_predictions(patient_id, prediction):
    conn = psycopg2.connect("dbname=test user=postgres password=secret")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO healthcare_predictions (patient_id, prediction)
        VALUES (%s, %s)
    """, (patient_id, json.dumps(prediction)))
    conn.commit()
    cursor.close()
    conn.close()

# Example usage
# data = ... # Load or receive input data
# prediction = predict(data)
# store_predictions(patient_id, prediction)