```python
from fastapi import FastAPI, HTTPException
from models.recommendation_model import generate_recommendation

app = FastAPI()

@app.get("/recommendation/{packaging_id}")
async def get_recommendation(packaging_id: int):
    try:
        recommendation = generate_recommendation(packaging_id)
        return {"packaging_id": packaging_id, "recommendation": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```