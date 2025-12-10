```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.code_review import CodeReview, ReviewHistory
from backend.schemas import CodeReviewCreate, CodeReviewResponse, ReviewHistoryResponse

router = APIRouter()

@router.post('/submit', response_model=CodeReviewResponse)
def submit_code_review(code_review: CodeReviewCreate, db: Session = Depends(get_db)):
    new_review = CodeReview(user_id=code_review.user_id, code=code_review.code)
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.get('/reviews/{user_id}', response_model=List[CodeReviewResponse])
def get_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = db.query(CodeReview).filter(CodeReview.user_id == user_id).all()
    return reviews

@router.get('/history/{review_id}', response_model=List[ReviewHistoryResponse])
def get_review_history(review_id: int, db: Session = Depends(get_db)):
    history = db.query(ReviewHistory).filter(ReviewHistory.code_review_id == review_id).all()
    return history
```