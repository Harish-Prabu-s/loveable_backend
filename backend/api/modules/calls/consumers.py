import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'call_{self.room_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # We just relay all signaling messages to others in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data
            }
        )

    # Receive message from room group
    async def signal_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))

class UserConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.user_group_name = f'user_{self.user_id}'
        print(f"AG_WS_DEBUG: Connecting user {self.user_id} | Group: {self.user_group_name}")

        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"AG_WS_DEBUG: Accepted user {self.user_id}")

    async def disconnect(self, close_code):
        print(f"AG_WS_DEBUG: Disconnecting user {self.user_id} | Code: {close_code}")
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def call_notification(self, event):
        # Event sent from services.py
        await self.send(text_data=json.dumps(event['content']))
