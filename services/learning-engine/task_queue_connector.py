```python
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)

class TaskQueueConnector:
    def __init__(self, queue_url):
        self.queue_url = queue_url

    def enqueue_task(self, task):
        try:
            response = requests.post(self.queue_url, json=task)
            if response.status_code == 200:
                logging.info("Task enqueued successfully")
            else:
                logging.error(f"Failed to enqueue task: {response.status_code}")
        except Exception as e:
            logging.error(f"Error connecting to task queue: {e}")

# Example usage
if __name__ == "__main__":
    connector = TaskQueueConnector("http://execution-queue")
    connector.enqueue_task({"type": "analyze_data", "data": {"user_id": 1}})
```