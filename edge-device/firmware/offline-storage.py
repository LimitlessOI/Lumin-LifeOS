```python
def store_data(temperature, humidity):
    with open('sensor_data.log', 'a') as file:
        file.write(f"Temperature: {temperature}, Humidity: {humidity}\n")
```