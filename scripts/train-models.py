```python
import tensorflow as tf
from tensorflow import keras

def train_model(data, labels, model_save_path):
    model = keras.Sequential([
        keras.layers.Dense(128, activation='relu', input_shape=(data.shape[1],)),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dense(1)
    ])
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    model.fit(data, labels, epochs=10)
    model.save(model_save_path)

if __name__ == "__main__":
    # Load your data here
    # data, labels = load_data()
    train_model(data, labels, 'path/to/save/model')