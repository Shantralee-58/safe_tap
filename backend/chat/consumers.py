import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatGroup, Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    # This consumer will only allow authenticated users to connect
    async def connect(self):
        # Channels provides the scope dictionary with the user if AuthMiddlewareStack is used
        if self.scope["user"].is_anonymous:
            # Reject connection if the user is not authenticated
            await self.close()
            return
            
        # The user is authenticated, accept the connection
        await self.accept()

        self.user = self.scope["user"]
        self.group_name = None  # We will define the group name later

        # Currently, we'll only allow one active chat group per user for simplicity
        # Find the first group the user is a member of (or create a default one)
        try:
            self.chat_group = await self.get_or_create_default_group()
        except Exception as e:
            print(f"Error finding/creating group: {e}")
            await self.close()
            return

        if self.chat_group:
            # Set the Channels group name based on the ChatGroup ID
            self.group_name = f'chat_{self.chat_group.id}'

            # Join room group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

    async def disconnect(self, close_code):
        # Leave room group
        if self.group_name:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_content = text_data_json['message']
        except (json.JSONDecodeError, KeyError):
            print("Invalid message format received.")
            return

        # Save the message to the database
        await self.save_message(self.user, self.chat_group, message_content)

        # Send message to room group
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat_message',
                'message': message_content,
                'username': self.user.username
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message_content = event['message']
        username = event['username']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message_content,
            'username': username
        }))

    # Helper function to get or create the default chat group
    @database_sync_to_async
    def get_or_create_default_group(self):
        # Assuming a default group is needed for all users
        group, created = ChatGroup.objects.get_or_create(name="Default Safety Circle")
        
        # Add the user to the group if they are not already a member
        if self.user not in group.members.all():
            group.members.add(self.user)
        
        return group

    # Helper function to save the message to the database
    @database_sync_to_async
    def save_message(self, user, group, content):
        Message.objects.create(
            sender=user,
            group=group,
            content=content
        )
