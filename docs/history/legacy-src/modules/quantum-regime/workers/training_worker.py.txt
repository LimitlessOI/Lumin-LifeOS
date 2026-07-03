from celery import Celery

app = Celery('training_worker', broker='redis://localhost:6379/0')

@app.task
def train_model_task(data):
    # Placeholder for training logic
    print("Training model asynchronously")
    return "Model trained"