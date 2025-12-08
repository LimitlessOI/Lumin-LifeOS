```python
import tensorflow as tf
import tensorflowjs as tfjs
import os

def convert_model_to_wasm(input_model_path, output_dir):
    try:
        model = tf.keras.models.load_model(input_model_path)
        tfjs.converters.save_keras_model(model, output_dir)
        print(f"Model converted to WASM and saved in {output_dir}")
    except Exception as e:
        print(f"Error converting model: {e}")

if __name__ == "__main__":
    input_path = "path/to/model.h5"
    output_directory = "path/to/output"
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)
    convert_model_to_wasm(input_path, output_directory)
```