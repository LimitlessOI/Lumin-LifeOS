```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from QuantumSimulationEngine import QuantumSimulationEngine
from ClassicalTradingEngine import ClassicalTradingEngine
from StrategyOrchestrator import StrategyOrchestrator

app = FastAPI()
strategy_orchestrator = StrategyOrchestrator()

class MarketData(BaseModel):
    features: list
    volatility: float

@app.post("/train-quantum-model/")
async def train_quantum_model(data: MarketData):
    try:
        result = strategy_orchestrator.executeStrategy(data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/advantage-score/")
async def get_advantage_score(data: MarketData):
    try:
        detector = QuantumAdvantageDetector()
        score = detector.evaluateMarketConditions(data)
        return {"advantage_score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Additional endpoints for strategy switching, simulation retrieval, and data preprocessing
```