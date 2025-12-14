```python
from fastapi import APIRouter, HTTPException
from app.services.protocol_engine import ProtocolEngine

router = APIRouter()

@router.get("/")
async def list_protocols():
    engine = ProtocolEngine()
    return {"protocols": engine.list_protocols()}

@router.post("/{protocol_id}/activate")
async def activate_protocol(protocol_id: int):
    try:
        engine = ProtocolEngine()
        result = engine.activate_protocol(protocol_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```