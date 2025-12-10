from fastapi import FastAPI
from transformers import pipeline
import torch

app = FastAPI()

# Initialize model
model = pipeline('text-generation', model='gpt2', device=0 if torch.cuda.is_available() else -1)

@app.get("/generate/")
async def generate_text(prompt: str):
    try:
        result = model(prompt, max_length=50)
        return {"generated_text": result}
    except Exception as e:
        return {"error": str(e)}