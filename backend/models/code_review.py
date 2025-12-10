```python
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from backend.database import Base

class CodeReview(Base):
    __tablename__ = 'code_reviews'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    code = Column(Text, nullable=False)
    status = Column(String, default='pending')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    history = relationship('ReviewHistory', back_populates='code_review')

class ReviewHistory(Base):
    __tablename__ = 'review_history'
    id = Column(Integer, primary_key=True, index=True)
    code_review_id = Column(Integer, ForeignKey('code_reviews.id'), nullable=False)
    feedback = Column(Text)
    created_at = Column(DateTime, default=func.now())
    code_review = relationship('CodeReview', back_populates='history')
```