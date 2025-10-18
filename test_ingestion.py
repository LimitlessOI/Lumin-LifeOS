import unittest
import json
import requests

class TestIngestionAPI(unittest.TestCase):
    BASE_URL = 'http://localhost:5000/api/v1/vault/ingest'

    def test_ingest_conversations(self):
        sample_conversations = [
            {'model': 'GPT-3', 'content': 'Hello, how can I help you?', 'context': 'Greeting'},
            {'model': 'GPT-3', 'content': 'I need assistance with my order.', 'context': 'Order Inquiry'},
            {'model': 'GPT-4', 'content': 'What is the weather today?', 'context': 'Weather Inquiry'},
            {'model': 'GPT-4', 'content': 'Tell me a joke.', 'context': 'Entertainment'},
            {'model': 'GPT-3', 'content': 'Can you recommend a book?', 'context': 'Book Recommendation'}
        ]

        for conversation in sample_conversations:
            response = requests.post(self.BASE_URL, json=conversation)
            self.assertEqual(response.status_code, 201)
            self.assertIn('message', response.json())

if __name__ == '__main__':
    unittest.main()