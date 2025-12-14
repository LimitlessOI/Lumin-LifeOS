```python
from fastapi import APIRouter, HTTPException
from app.services.event_detector import EventDetector

router = APIRouter()

@router.post("/detect")
async def detect_events(user_data: dict):
    try:
        detector = EventDetector(user_data)
        events = detector.detect_events()
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```