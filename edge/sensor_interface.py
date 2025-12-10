```python
import smbus
import time

class SensorInterface:
    def __init__(self, bus_number=1, mpu_address=0x68, mlx_address=0x5A):
        self.bus = smbus.SMBus(bus_number)
        self.mpu_address = mpu_address
        self.mlx_address = mlx_address

    def read_mpu6050(self):
        # Read accelerometer and gyroscope data
        acc_x = self.bus.read_byte_data(self.mpu_address, 0x3B)
        acc_y = self.bus.read_byte_data(self.mpu_address, 0x3D)
        acc_z = self.bus.read_byte_data(self.mpu_address, 0x3F)
        return (acc_x, acc_y, acc_z)

    def read_mlx90614(self):
        # Read temperature data
        temp = self.bus.read_word_data(self.mlx_address, 0x07)
        return temp * 0.02 - 273.15

# Example usage
# sensor = SensorInterface()
# acc_data = sensor.read_mpu6050()
# temp = sensor.read_mlx90614()
```