import tensorflow as tf
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

# Load pre-trained model
model = tf.keras.models.load_model('path/to/model.h5')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    images = np.array(data['images'])
    predictions = model.predict(images)
    
    return jsonify({'predictions': predictions.tolist()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)