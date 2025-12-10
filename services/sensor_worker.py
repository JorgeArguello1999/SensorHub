import json
import threading
import time
import requests
from datetime import datetime
import pytz
from sseclient import SSEClient
from os import getenv

# Import shared DB and broadcaster
from models.db import _db as db_client
from services.broadcaster import broadcast_data

# --- CONFIG ---
TIMEZONE_QUITO = pytz.timezone('America/Guayaquil')
# RTDB URL (taken from previous main.py)
FIREBASE_RTDB_URL = "https://esp32-firebase-69994-default-rtdb.firebaseio.com/.json"
OPENWEATHER_API_KEY = getenv('OPENWEATHER_API_KEY')

# Interval to save to DB (minutes)
SAVE_INTERVAL_MINUTES = 15

# In-memory local state (last snapshot from sensors)
datos_sensores = {
    "cuarto": {"temperatura": 0, "humedad": 0},
    "sala": {"temperatura": 0, "humedad": 0},
    "local": {"temperatura": 0, "humedad": 0} # External weather
}

# Variable to control when to save
last_save_time = 0

def obtener_clima_local():
    """Query OpenWeatherMap."""
    try:
        lat, lon = "-1.27442", "-78.638786" # Ambato coordinates
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
    """Save the current state to Firestore for history."""
    if db_client is None:
        return

    try:
        timestamp = datetime.now(TIMEZONE_QUITO).strftime("%Y-%m-%d %H:%M:%S")
        db_client.collection('historial_sensores').document(timestamp).set(datos_sensores)
        print(f"💾 [HISTORIAL] Datos guardados en BD: {timestamp}")
    except Exception as e:
        print(f"❌ Error guardando historial: {e}")

def procesar_cambio(path, data):
    """Update the in-memory datos_sensores dictionary."""
    global datos_sensores
    clean_path = path.strip("/")
    parts = clean_path.split("/")
    room_name = parts[0]

    # Update if it's 'cuarto' or 'sala'
    if room_name in datos_sensores and room_name != "local":
        if len(parts) == 1: # path: /cuarto
            datos_sensores[room_name] = data
        elif len(parts) == 2: # path: /cuarto/temperatura
            metric = parts[1]
            if isinstance(datos_sensores[room_name], dict):
                datos_sensores[room_name][metric] = data
        return True
    
    # Initial load or total reset
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
    """Start the worker in a background thread."""
    t = threading.Thread(target=_worker_loop, daemon=True)
    t.start()

def _worker_loop():
    global last_save_time
    print("🚀 Worker IoT iniciado: Escuchando sensores...")
    
    # Initial load of external weather
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
                        hubo_cambio = procesar_cambio(payload["path"], payload["data"])

                        if hubo_cambio:
                            # --- SAFETY BLOCK ---
                            # Wrap broadcast in its own try/except.
                            # If the web side fails, the sensor loop must NOT stop.
                            try:
                                broadcast_data(datos_sensores)
                            except Exception as e:
                                print(f"⚠️ Error enviando a clientes web: {e}")
                            # ---------------------------

                            ahora = time.time()
                            if (ahora - last_save_time) > (SAVE_INTERVAL_MINUTES * 60):
                                print("⏱️ Intervalo cumplido. Guardando...")
                                datos_sensores["local"] = obtener_clima_local()
                                guardar_en_firestore()
                                last_save_time = ahora

                except json.JSONDecodeError:
                    pass
        except Exception as e:
            # General capture so the thread NEVER dies
            print(f"⚠️ Error crítico en Worker (reiniciando loop en 5s): {e}")
            time.sleep(5)