from flask import Flask, render_template, Response, stream_with_context
import json
import threading
import time
from queue import Queue
from datetime import datetime

# Firebase Admin
import firebase_admin
from firebase_admin import credentials, firestore

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
app = Flask(__name__)

# ==========================================
# 2. SISTEMA DE BROADCASTING
# ==========================================

# Lista global para guardar las colas de todos los usuarios conectados
# Esto permite que si abres 3 pestañas, las 3 reciban el dato.
connected_listeners = []

def broadcast_data(data):
    """Envía el dato a todos los clientes conectados."""
    print(f"📡 Enviando actualización a {len(connected_listeners)} clientes...")
    # Iteramos sobre una copia de la lista para evitar errores si alguien se desconecta justo ahora
    for i, q in enumerate(connected_listeners):
        try:
            q.put(data)
        except Exception as e:
            print(f"   Error enviando a cliente {i}: {e}")

def on_snapshot(col_snapshot, changes, read_time):
    """Callback de Firestore: Se ejecuta automáticamente cuando hay cambios."""
    for change in changes:
        # Solo nos interesan los documentos nuevos (ADDED)
        if change.type.name == 'ADDED':
            try:
                # Convertir documento a diccionario
                data = change.document.to_dict()
                # Añadir el ID (el timestamp) al objeto
                data['id'] = change.document.id
                
                print(f"🔥 Nuevo registro en Firestore: {change.document.id}")
                
                # Enviar a todos los clientes web
                broadcast_data(data)
                
            except Exception as e:
                print(f"❌ Error procesando snapshot: {e}")

def iniciar_listener_firestore():
    """Configura el watcher de Firestore en un hilo de fondo."""
    col_ref = db.collection('historial_sensores')
    
    try:
        # Ordenamos por '__name__' (ID del documento) descendente para obtener el último.
        # limit(1) evita traer todo el historial, pero el watcher sigue escuchando los nuevos.
        query_watch = col_ref.order_by('__name__', direction=firestore.Query.DESCENDING).limit(1)
        
        # Iniciamos la escucha
        query_watch.on_snapshot(on_snapshot)
        print("✅ Listener de Firestore activo y esperando cambios...")
        
        # Bucle infinito simple para mantener el hilo vivo si el SDK no bloqueara
        while True:
            time.sleep(1)
            
    except Exception as e:
        print(f"❌ Error al iniciar listener: {e}")

# Iniciar el hilo de Firestore inmediatamente (Daemon para que se cierre al cerrar la app)
threading.Thread(target=iniciar_listener_firestore, daemon=True).start()

# ==========================================
# 3. RUTAS FLASK
# ==========================================

@app.route('/')
def index():
    """Renderiza la página principal."""
    return render_template('index.html')

@app.route('/stream-data')
def stream_data():
    """Endpoint SSE: Mantiene la conexión abierta con el navegador."""
    
    def generate():
        # Crear una cola nueva para ESTE cliente específico
        q = Queue()
        connected_listeners.append(q)
        
        try:
            while True:
                # Esperar datos (bloqueante con timeout para keep-alive)
                try:
                    data = q.get(timeout=15) # Espera 15 segs
                    
                    # Enviar dato real
                    yield f"data: {json.dumps(data)}\n\n"
                    
                except Exception:
                    # Si no hay datos en 15 segs, enviar ping para mantener conexión viva
                    yield ": keep-alive\n\n"
        
        except GeneratorExit:
            # El cliente cerró la pestaña/navegador
            print("🔌 Cliente desconectado.")
        finally:
            # Limpieza: sacar la cola de la lista global
            if q in connected_listeners:
                connected_listeners.remove(q)

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

if __name__ == '__main__':
    # threaded=True es vital para manejar múltiples conexiones concurrentes
    print("🚀 Servidor Flask iniciando en http://127.0.0.1:5000")
    app.run(debug=True, port=5000, threaded=True)