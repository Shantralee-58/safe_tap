import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import CurrentLocation, PanicStatus

class SafetyConsumer(AsyncWebsocketConsumer):
    # This consumer will only allow authenticated users to connect
    async def connect(self):
        # Channels provides the scope dictionary with the user if AuthMiddlewareStack is used
        if self.scope["user"].is_anonymous:
            await self.close()
            return

        self.user = self.scope["user"]
        self.user_group_name = f'safety_{self.user.id}'
        
        # Accept the connection
        await self.accept()

        # Add the user's channel to their personal safety group (for receiving status updates)
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        # Optional: Add the user to a general 'emergency' group if they are a trusted contact 
        # (e.g., an authority or guardian monitoring multiple users)
        if self.user.is_trusted:
            await self.channel_layer.group_add(
                'safety_trusted_contacts',
                self.channel_name
            )

    async def disconnect(self, close_code):
        # Leave the user's personal safety group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
        
        # Leave the general 'emergency' group if they were a member
        if getattr(self, 'user', None) and self.user.is_trusted:
            await self.channel_layer.group_discard(
                'safety_trusted_contacts',
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        """
        Expects real-time location data or a panic status toggle.
        """
        try:
            data = json.loads(text_data)
            
            # --- Location Update ---
            if 'latitude' in data and 'longitude' in data:
                # 1. Update the database
                await self.update_location(data['latitude'], data['longitude'])
                
                # 2. Broadcast the update to their trusted contacts (if implemented)
                await self.channel_layer.group_send(
                    'safety_trusted_contacts',
                    {
                        'type': 'location_update',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'latitude': data['latitude'],
                        'longitude': data['longitude']
                    }
                )

            # --- Panic Status Toggle ---
            elif 'panic_active' in data:
                is_active = data['panic_active']
                
                # 1. Update the database status
                panic_event = await self.toggle_panic_status(is_active)
                
                # 2. Broadcast the panic event to their trusted contacts
                await self.channel_layer.group_send(
                    'safety_trusted_contacts',
                    {
                        'type': 'panic_status',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'status': 'ACTIVE' if is_active else 'RESOLVED',
                        'timestamp': panic_event.triggered_at.isoformat() if is_active else panic_event.resolved_at.isoformat()
                    }
                )

        except (json.JSONDecodeError, KeyError) as e:
            print(f"Invalid safety message format: {e}")
            
    # Receive location update from group
    async def location_update(self, event):
        # Send location update to the WebSocket of the receiving trusted user
        await self.send(text_data=json.dumps({
            'type': 'location',
            'user_id': event['user_id'],
            'username': event['username'],
            'latitude': event['latitude'],
            'longitude': event['longitude']
        }))

    # Receive panic status from group
    async def panic_status(self, event):
        # Send panic status update to the WebSocket of the receiving trusted user
        await self.send(text_data=json.dumps({
            'type': 'panic',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status'],
            'timestamp': event['timestamp']
        }))

    # Database Functions (Running synchronous DB queries in an async context)
    
    @database_sync_to_async
    def update_location(self, latitude, longitude):
        # Updates or creates the user's latest location
        CurrentLocation.objects.update_or_create(
            user=self.user,
            defaults={'latitude': latitude, 'longitude': longitude}
        )

    @database_sync_to_async
    def toggle_panic_status(self, is_active):
        if is_active:
            # Trigger a new panic event
            return PanicStatus.objects.create(
                user=self.user,
                is_active=True,
                # In a real app, you'd try to get the current location here
                location_on_trigger=f"{self.user.currentlocation.latitude}, {self.user.currentlocation.longitude}" if hasattr(self.user, 'currentlocation') else "Unknown"
            )
        else:
            # Resolve the latest active panic event
            latest_panic = PanicStatus.objects.filter(user=self.user, is_active=True).order_by('-triggered_at').first()
            if latest_panic:
                latest_panic.is_active = False
                latest_panic.resolved_at = timezone.now() # You'd need to import timezone
                latest_panic.save()
                return latest_panic
            # Return a placeholder if none was active
            return PanicStatus.objects.create(user=self.user, is_active=False)
