```python
import numpy as np
from fastapi import FastAPI
from sklearn.linear_model import LinearRegression
import uvicorn

app = FastAPI()

# Example model and data
model = LinearRegression()
# Dummy data for example purposes
X = np.array([[1], [2], [3]])
y = np.array([1, 2, 3])
model.fit(X, y)

@app.post("/predict")
async def predict(input_data: float):
    prediction = model.predict(np.array([[input_data]]))
    return {"prediction": prediction[0]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```