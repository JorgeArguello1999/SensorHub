import json
import threading
import time
import requests
from datetime import datetime
import pytz
from sseclient import SSEClient
from os import getenv

# Importamos la DB compartida y el broadcaster
from models.db import _db as db_client
from services.broadcaster import broadcast_data

# --- CONFIGURACIÓN ---
TIMEZONE_QUITO = pytz.timezone('America/Guayaquil')
# URL de tu RTDB (Tomada de tu main.py anterior)
FIREBASE_RTDB_URL = "https://esp32-firebase-69994-default-rtdb.firebaseio.com/.json"
OPENWEATHER_API_KEY = getenv('OPENWEATHER_API_KEY')

# Intervalo de guardado en base de datos (Minutos)
SAVE_INTERVAL_MINUTES = 15

# Estado local en memoria (Última foto de los sensores)
datos_sensores = {
    "cuarto": {"temperatura": 0, "humedad": 0},
    "sala": {"temperatura": 0, "humedad": 0},
    "local": {"temperatura": 0, "humedad": 0} # Clima externo
}

# Variable para controlar cuándo guardar
last_save_time = 0

def obtener_clima_local():
    """Consulta OpenWeatherMap."""
    try:
        lat, lon = "-1.27442", "-78.638786" # Coordenadas Ambato
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&APPID={OPENWEATHER_API_KEY}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return {
                "temperatura": data["main"]["temp"],
                "humedad": data["main"]["humidity"]
            }
    except Exception as e:
        print(f"⚠️ Error obteniendo clima: {e}")
    return {"temperatura": 0, "humedad": 0}

def guardar_en_firestore():
    """Guarda el estado actual en Firestore para el historial."""
    if db_client is None:
        return

    try:
        timestamp = datetime.now(TIMEZONE_QUITO).strftime("%Y-%m-%d %H:%M:%S")
        db_client.collection('historial_sensores').document(timestamp).set(datos_sensores)
        print(f"💾 [HISTORIAL] Datos guardados en BD: {timestamp}")
    except Exception as e:
        print(f"❌ Error guardando historial: {e}")

def procesar_cambio(path, data):
    """Actualiza el diccionario local datos_sensores."""
    global datos_sensores
    clean_path = path.strip("/")
    parts = clean_path.split("/")
    room_name = parts[0]

    # Actualizar si es 'cuarto' o 'sala'
    if room_name in datos_sensores and room_name != "local":
        if len(parts) == 1: # path: /cuarto
            datos_sensores[room_name] = data
        elif len(parts) == 2: # path: /cuarto/temperatura
            metric = parts[1]
            if isinstance(datos_sensores[room_name], dict):
                datos_sensores[room_name][metric] = data
        return True
    
    # Carga inicial o reset total
    if not clean_path and isinstance(data, dict):
        cambio = False
        for key in data:
            if key in datos_sensores and key != "local":
                datos_sensores[key] = data[key]
                cambio = True
        return cambio
    
    return False

def _worker_loop():
    """Bucle infinito que escucha a Firebase RTDB."""
    global last_save_time
    print("🚀 Worker IoT iniciado: Escuchando sensores...")

    # Carga inicial del clima
    datos_sensores["local"] = obtener_clima_local()

    while True:
        try:
            messages = SSEClient(FIREBASE_RTDB_URL)
            for msg in messages:
                if not msg.data or msg.data == "null":
                    continue
                
                try:
                    payload = json.loads(msg.data)
                    if "path" in payload and "data" in payload:
                        # 1. Actualizar memoria local
                        hubo_cambio = procesar_cambio(payload["path"], payload["data"])

                        if hubo_cambio:
                            # 2. TRANSMISIÓN EN VIVO (GRATIS)
                            # Enviamos datos a la web INMEDIATAMENTE
                            broadcast_data(datos_sensores)

                            # 3. PERSISTENCIA DIFERIDA (AHORRO)
                            # Solo guardamos en BD si pasaron 15 minutos
                            ahora = time.time()
                            if (ahora - last_save_time) > (SAVE_INTERVAL_MINUTES * 60):
                                print("⏱️ Intervalo de 15min cumplido. Actualizando clima y guardando...")
                                datos_sensores["local"] = obtener_clima_local()
                                guardar_en_firestore()
                                last_save_time = ahora

                except json.JSONDecodeError:
                    pass
        except Exception as e:
            print(f"⚠️ Conexión RTDB perdida. Reintentando en 5s... ({e})")
            time.sleep(5)

def start_sensor_worker():
    """Inicia el worker en segundo plano."""
    t = threading.Thread(target=_worker_loop, daemon=True)
    t.start()