```python
from celery import Celery
from backend.services.code_analyzer import CodeAnalyzer
from backend.database import SessionLocal
from backend.models.code_review import CodeReview, ReviewHistory

app = Celery('code_review_tasks', broker='redis://localhost:6379/0')

@app.task
def process_code_review(review_id: int):
    db = SessionLocal()
    review = db.query(CodeReview).filter(CodeReview.id == review_id).first()
    if review:
        analyzer = CodeAnalyzer(api_key='your_openai_api_key')
        feedback = analyzer.analyze_code(review.code)
        review.status = 'completed'
        history = ReviewHistory(code_review_id=review.id, feedback=feedback)
        db.add(history)
        db.commit()
    db.close()
```