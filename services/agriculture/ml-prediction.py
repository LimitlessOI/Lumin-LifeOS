```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.externals import joblib
import psycopg2
import os

app = FastAPI()

# Database connection
db_conn = psycopg2.connect(os.getenv('NEON_POSTGRESQL_URL'))

# Load pre-trained ML model
model = joblib.load('model.pkl')

class PredictionRequest(BaseModel):
    feature1: float
    feature2: float

@app.post("/predict/")
async def get_prediction(data: PredictionRequest):
    try:
        # Make prediction
        prediction = model.predict([[data.feature1, data.feature2]])
        
        # Log prediction to database
        cursor = db_conn.cursor()
        cursor.execute('INSERT INTO ml_predictions (feature1, feature2, prediction) VALUES (%s, %s, %s)', 
                       (data.feature1, data.feature2, prediction[0]))
        db_conn.commit()

        return {"prediction": prediction[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)