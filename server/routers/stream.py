from flask import Blueprint, Response, stream_with_context
import json
from services.broadcaster import register_client, remove_client

stream_routes = Blueprint('stream', __name__, url_prefix='')

@stream_routes.route('/stream-data')
def stream_data():
    """
    Endpoint SSE que mantiene la conexión abierta con el navegador.
    Recibe los datos desde la memoria RAM (services/broadcaster.py).
    """
    def generate():
        q = register_client()
        try:
            while True:
                try:
                    # Esperamos datos nuevos en la cola (timeout para keep-alive)
                    data = q.get(timeout=10)
                    yield f"data: {json.dumps(data)}\n\n"
                except Exception:
                    # Enviar ping para mantener conexión viva
                    yield ": keep-alive\n\n"
        except GeneratorExit:
            print("🔌 Cliente web desconectado.")
        finally:
            remove_client(q)

    return Response(stream_with_context(generate()), mimetype='text/event-stream')