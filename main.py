```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class DeviceData(BaseModel):
    device_id: str
    data: dict

@app.post("/iot/data")
async def receive_data(device_data: DeviceData):
    # Process the incoming IoT data
    return {"status": "success", "device_id": device_data.device_id}

@app.get("/status")
async def read_root():
    return {"status": "running"}
```