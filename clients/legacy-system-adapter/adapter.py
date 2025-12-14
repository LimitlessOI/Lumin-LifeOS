```python
class LegacySystemAdapter:
    def __init__(self, plc_address):
        self.plc_address = plc_address

    def read_data(self):
        # Simulate reading data from a PLC
        print(f"Reading data from PLC at {self.plc_address}")
        return {"status": "OK"}

    def send_command(self, command):
        # Simulate sending a command to a PLC
        print(f"Sending command to PLC at {self.plc_address}: {command}")

if __name__ == "__main__":
    adapter = LegacySystemAdapter("192.168.1.100")
    data = adapter.read_data()
    print("PLC Data:", data)
    adapter.send_command("START")
```