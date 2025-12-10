from flask import Blueprint, Response, stream_with_context
import json
from services.broadcaster import register_client, remove_client

stream_routes = Blueprint('stream', __name__, url_prefix='')

@stream_routes.route('/stream-data')
def stream_data():
    """
    SSE endpoint that keeps the connection open with the browser.
    Receives data from in-memory broadcaster (services/broadcaster.py).
    """
    def generate():
        q = register_client()
        try:
            while True:
                try:
                    # Wait for new data in the queue (timeout used as keep-alive)
                    data = q.get(timeout=10)
                    yield f"data: {json.dumps(data)}\n\n"
                except Exception:
                    # Send ping to keep the connection alive
                    yield ": keep-alive\n\n"
        except GeneratorExit:
            print("🔌 Cliente web desconectado.")
        finally:
            remove_client(q)

    return Response(stream_with_context(generate()), mimetype='text/event-stream')