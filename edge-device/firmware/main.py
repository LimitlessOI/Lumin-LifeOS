```python
import time
from sensors import read_temperature_and_humidity
from offline_storage import store_data

def main():
    while True:
        temperature, humidity = read_temperature_and_humidity()
        store_data(temperature, humidity)
        time.sleep(60)

if __name__ == '__main__':
    main()
```