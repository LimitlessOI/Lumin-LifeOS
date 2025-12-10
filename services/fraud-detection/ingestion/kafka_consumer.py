import logging
from kafka import KafkaConsumer
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TransactionIngestionService:
    def __init__(self, kafka_broker, topic):
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=[kafka_broker],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            group_id='fraud-detection-consumer-group'
        )
    
    def validate_transaction(self, transaction):
        # Implement basic validation logic
        required_fields = ['transaction_id', 'amount', 'timestamp', 'account_id']
        for field in required_fields:
            if field not in transaction:
                logger.error(f"Transaction missing required field: {field}")
                return False
        return True

    def consume_transactions(self):
        logger.info("Starting transaction consumption...")
        for message in self.consumer:
            transaction = message.value
            if self.validate_transaction(transaction):
                logger.info(f"Valid transaction received: {transaction}")
                # Forward to the next stage (e.g., send to feature engineering)
                self.forward_to_pipeline(transaction)
            else:
                logger.warning(f"Invalid transaction skipped: {transaction}")

    def forward_to_pipeline(self, transaction):
        # Placeholder for forwarding logic
        logger.info(f"Forwarding transaction to pipeline: {transaction}")

if __name__ == "__main__":
    kafka_broker = 'localhost:9092'
    topic = 'transactions'
    service = TransactionIngestionService(kafka_broker, topic)
    service.consume_transactions()