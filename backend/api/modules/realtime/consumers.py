import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

class BaseRealtimeConsumer(AsyncWebsocketConsumer):
    """
    Base consumer providing common functionality like heartbeat (ping/pong)
    and user-specific group management.
    """
    channel_type = "base"

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs'].get('user_id')
        if not self.user_id:
            await self.close()
            return

        self.group_name = f"{self.channel_type}_{self.user_id}"
        
        # Log connection attempt
        logger.info(f"[WS] Connecting {self.channel_type} for user {self.user_id} | Group: {self.group_name}")
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"[WS] Accepted {self.channel_type} for user {self.user_id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            logger.info(f"[WS] Disconnecting {self.channel_type} for user {self.user_id} | Code: {close_code}")
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            # Standard heartbeat
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                await self.handle_custom_event(data)
        except json.JSONDecodeError:
            logger.warning(f"[WS] Invalid JSON received from user {self.user_id}")

    async def handle_custom_event(self, data):
        """Override in subclasses to handle client-sent events"""
        pass

class NotificationConsumer(BaseRealtimeConsumer):
    channel_type = "notifications"

    async def send_notification(self, event):
        """Handler for 'send_notification' group messages"""
        await self.send(text_data=json.dumps(event['content']))

class ChatConsumer(BaseRealtimeConsumer):
    channel_type = "chat"

    async def handle_custom_event(self, data):
        # Handle typing indicators etc.
        if data.get('type') == 'typing':
            # Relay to other user... (logic would go here)
            pass

    async def send_message(self, event):
        """Handler for 'send_message' group messages"""
        await self.send(text_data=json.dumps(event['content']))

class CallConsumer(BaseRealtimeConsumer):
    channel_type = "call"

    async def incoming_call(self, event):
        """Handler for 'incoming_call' group messages (Incoming alert)"""
        await self.send(text_data=json.dumps(event['content']))

class CallRoomConsumer(AsyncWebsocketConsumer):
    """
    Handles WebRTC signaling within a specific call room.
    """
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'call_room_{self.room_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"[WS] Call Room {self.room_id} connected")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Broadcast signaling message to others in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data
            }
        )

    async def signal_message(self, event):
        # Send signal to WebSocket
        await self.send(text_data=json.dumps(event['message']))
