```python
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def send_notification(self, user_id: int, message: str):
        logger.info(f"Sending notification to user {user_id}: {message}")
        # Placeholder for notification logic
        return {"status": "success", "user_id": user_id, "message": message}
```