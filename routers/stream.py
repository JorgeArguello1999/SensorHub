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
            
        # 1. Send Initial State (Current Cache)
        try:
            current_data = redis_client.hgetall("sensors:current")
            if current_data:
                for sensor_id, json_val in current_data.items():
                    # Check for legacy garbage strictly
                    try:
                        int(sensor_id) # Verify ID is int
                        # Re-wrap to ensure client parses same format
                        # json_val is likely already in correct format {"sensor_id":...}
                        # We send a "fake" message structure matching the stream
                        data_obj = json.loads(json_val)
                        
                        # Fix: Ensure we match the stream structure expected by app.js (msg.sensor_id && msg.data)
                        envelope = {
                            "sensor_id": int(sensor_id),
                            "data": data_obj,
                            "server_time": data_obj.get("server_time") or "Init"
                        }
                        
                        yield f"data: {json.dumps(envelope)}\n\n"
                    except (ValueError, json.JSONDecodeError):
                        continue
        except Exception as e:
            print(f"⚠️ Error sending initial state: {e}")

        # 2. Subscribe to enhancements
        pubsub = redis_client.pubsub()
        pubsub.subscribe('sensors:stream')
        
        try:
            for message in pubsub.listen():
                if message['type'] == 'message':
                    # message['data'] is the JSON string payload
                    yield f"data: {message['data']}\n\n"
        except GeneratorExit:
            print("🔌 Web client disconnected.")
            pubsub.unsubscribe()
        except Exception as e:
            print(f"❌ Error in stream: {e}")
            pubsub.unsubscribe()

    return Response(stream_with_context(generate()), mimetype='text/event-stream')