from flask import Blueprint, Response, stream_with_context
from models.db import redis_client
import json

stream_routes = Blueprint('stream', __name__, url_prefix='')

@stream_routes.route('/stream-data')
def stream_data():
    """
    SSE endpoint using Redis Pub/Sub.
    """
    def generate():
        if not redis_client:
            return 
            
        pubsub = redis_client.pubsub()
        pubsub.subscribe('sensors:stream')
        
        try:
            for message in pubsub.listen():
                if message['type'] == 'message':
                    # message['data'] is the JSON string payload
                    yield f"data: {message['data']}\n\n"
                
                # We could add a ping here if needed, but Redis keepalive usually works.
                # Or we can use a separate thread/mechanism to send pings if the connection is idle.
                # For simplicity, we rely on Redis messages. If silent for too long, browser reconnects.
        except GeneratorExit:
            print("🔌 Web client disconnected.")
            pubsub.unsubscribe()
        except Exception as e:
            print(f"❌ Error in stream: {e}")
            pubsub.unsubscribe()

    return Response(stream_with_context(generate()), mimetype='text/event-stream')