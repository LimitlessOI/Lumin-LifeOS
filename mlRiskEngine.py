```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

app = FastAPI()
logging.basicConfig(level=logging.INFO)

class RiskAssessmentRequest(BaseModel):
    borrower_id: int
    loan_amount: float
    duration: int

@app.post("/assess-risk")
async def assess_risk(request: RiskAssessmentRequest):
    try:
        score = calculate_risk_score(request.borrower_id, request.loan_amount, request.duration)
        return {"risk_score": score}
    except Exception as e:
        logging.error(f"Error assessing risk: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

def calculate_risk_score(borrower_id, loan_amount, duration):
    # Dummy implementation of risk calculation
    return 0.5  # Placeholder for actual risk score logic
```