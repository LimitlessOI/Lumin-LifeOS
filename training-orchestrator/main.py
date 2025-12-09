```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

app = FastAPI()

class ScenarioRequest(BaseModel):
    user_id: int
    preferences: dict

@app.post("/personalize")
async def personalize_scenario(request: ScenarioRequest):
    try:
        # AI-driven scenario personalization logic
        scenario = {"scenario_id": 123, "content": "Personalized content based on preferences"}
        return {"status": "success", "scenario": scenario}
    except Exception as e:
        logging.error(f"Error personalizing scenario: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/")
async def root():
    return {"message": "AI Orchestrator is running"}
```