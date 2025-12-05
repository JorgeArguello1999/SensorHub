from flask import Blueprint, render_template, Response, stream_with_context
import json
import threading
import time
from queue import Queue

from firebase_admin import firestore, credentials  # for Query.DESCENDING type
import firebase_admin
from models.db import _db as db_client

stream_routes = Blueprint('stream', __name__, url_prefix='')

# ==========================================
# 1. CONFIGURACIÓN
# ==========================================

# Cargar credenciales
# Asegúrate de que el nombre del archivo coincida con el tuyo
try:
    cred = credentials.Certificate(".venv/esp32_firebase.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    print("✅ Firebase conectado exitosamente.")
except Exception as e:
    print(f"❌ Error crítico cargando Firebase: {e}")
    print("   Verifica que 'serviceAccountKey.json' esté en la misma carpeta.")

db = firestore.client()

# ==========================================
# 2. SISTEMA DE BROADCASTING
# ==========================================

# Global list holding queues for connected clients (one queue per client)
connected_listeners = []

def broadcast_data(data):
    """Send data to all connected clients."""
    print(f"📡 Broadcasting update to {len(connected_listeners)} clients...")
    for i, q in enumerate(list(connected_listeners)):
        try:
            q.put(data)
        except Exception as e:
            print(f"   Error sending to client {i}: {e}")

def on_snapshot(col_snapshot, changes, read_time):
    """Firestore snapshot callback - triggers on new documents."""
    for change in changes:
        if change.type.name == 'ADDED':
            try:
                data = change.document.to_dict() or {}
                data['id'] = change.document.id
                print(f"🔥 New Firestore record: {change.document.id}")
                broadcast_data(data)
            except Exception as e:
                print(f"❌ Error processing snapshot: {e}")

def _listener_loop(db_client):
    """Internal listener loop that attaches Firestore on_snapshot watcher."""
    if db_client is None:
        print("❌ Firestore client is None; listener will not start.")
        return

    try:
        col_ref = db_client.collection('historial_sensores')
        query_watch = col_ref.order_by('__name__', direction=firestore.Query.DESCENDING).limit(1)
        query_watch.on_snapshot(on_snapshot)
        print("✅ Firestore listener active and waiting for changes...")
        # Keep the thread alive
        while True:
            time.sleep(1)
    except Exception as e:
        print(f"❌ Error starting Firestore listener: {e}")

def start_firestore_listener(db_client):
    """Start the Firestore listener in a daemon thread."""
    thread = threading.Thread(target=_listener_loop, args=(db_client,), daemon=True)
    thread.start()
    return thread

# NOTE: removed automatic listener start here.
# manage.py should call start_firestore_listener(db_client)

# ==========================================
# 3. RUTAS FLASK
# ==========================================

@stream_routes.route('/')
def index():
    """Render main page."""
    return render_template('index.html')

@stream_routes.route('/stream-data')
def stream_data():
    """SSE endpoint that keeps a connection open and streams Firestore updates."""
    def generate():
        q = Queue()
        connected_listeners.append(q)
        try:
            while True:
                try:
                    data = q.get(timeout=15)  # wait up to 15 seconds
                    yield f"data: {json.dumps(data)}\n\n"
                except Exception:
                    # send a comment-based keep-alive for SSE
                    yield ": keep-alive\n\n"
        except GeneratorExit:
            print("🔌 Client disconnected.")
        finally:
            if q in connected_listeners:
                connected_listeners.remove(q)

    return Response(stream_with_context(generate()), mimetype='text/event-stream')