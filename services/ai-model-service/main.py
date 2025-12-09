```python
from fastapi import FastAPI
from models.document_analyzer import analyze_document

app = FastAPI()

@app.post("/analyze")
async def analyze(content: str):
    result = analyze_document(content)
    return {"result": result}
```