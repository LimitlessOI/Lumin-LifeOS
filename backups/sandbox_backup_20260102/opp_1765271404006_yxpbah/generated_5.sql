from channels.generic.websocket import JsonWebsocketConsumer
import json

class ScenariosConsumer(JsonWebsocketConsumer):
    def connect(self):
        self.accept()
    
    async def disconnect(self, close_code):
        pass  # Handle closing the connection if needed.
    
    async def receive_json(self, content, **kwargs):
        message = json.loads(content)
        
        scenario_id = str(message['scenario_id'])
        await self.send(text_data=json.dumps({'event': 'update', 'payload': {'newStatus': message.get('status')}}))  # Simulated real-time update payload for the websocket connection.