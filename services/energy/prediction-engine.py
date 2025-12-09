import tensorflow as tf
import numpy as np
import requests
import logging

logging.basicConfig(level=logging.INFO)

OPENWEATHER_API_KEY = 'your_openweathermap_api_key'
GRID_DATA_API_URL = 'http://example.com/grid-data'

def fetch_weather_data(location):
    url = f'http://api.openweathermap.org/data/2.5/weather?q={location}&appid={OPENWEATHER_API_KEY}'
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error("Error fetching weather data", exc_info=True)
        return None

def fetch_grid_data():
    try:
        response = requests.get(GRID_DATA_API_URL)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logging.error("Error fetching grid data", exc_info=True)
        return None

def build_prediction_model(input_shape):
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=input_shape),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    return model

def predict_energy_usage(weather_data, grid_data):
    inputs = np.array([weather_data['temp'], grid_data['current_load']])
    model = build_prediction_model(input_shape=(2,))
    prediction = model.predict(inputs.reshape(1, -1))
    return prediction[0]

if __name__ == "__main__":
    location = "San Francisco"
    weather_data = fetch_weather_data(location)
    grid_data = fetch_grid_data()
    if weather_data and grid_data:
        prediction = predict_energy_usage(weather_data, grid_data)
        logging.info(f"Predicted energy usage: {prediction}")