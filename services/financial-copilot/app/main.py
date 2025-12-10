```python
from fastapi import FastAPI
from app.routers import events, protocols, simulations, integrations

app = FastAPI()

# Include routers
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(protocols.router, prefix="/protocols", tags=["protocols"])
app.include_router(simulations.router, prefix="/simulations", tags=["simulations"])
app.include_router(integrations.router, prefix="/integrations", tags=["integrations"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Financial Copilot Service"}
```