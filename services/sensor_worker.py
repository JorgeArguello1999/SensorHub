import time
import json
import threading
from datetime import datetime
import pytz
from models.db import redis_client, SessionLocal
from models.sql_models import SensorReading

# --- CONFIG ---
TIMEZONE_QUITO = pytz.timezone('America/Guayaquil')
SAVE_INTERVAL_MINUTES = 15

def guardar_historial():
    """Reads current state from Redis and saves to SQLite."""
    if not redis_client:
        return

    try:
        # Get current state from Redis
        # We assume keys are stored per room/metric or as a JSON blob.
        # Plan said: Hash in Redis: `HSET sensors:current <sala> <json_data>`
        # Let's retrieve all fields from sensors:current
        current_data = redis_client.hgetall("sensors:current")
        
        if not current_data:
            return

        # Parse data
        # Structure expected in sensors:current:
        # { "sala": '{"temperatura": 20, "humedad": 50}', "cuarto": '...', "local": '...' }
        
        reading = SensorReading(timestamp=datetime.now(TIMEZONE_QUITO))
        
        has_data = False
        
        for room, json_val in current_data.items():
            try:
                data = json.loads(json_val)
                # Map to columns
                if room == "sala":
                    reading.sala_temp = data.get("temperatura")
                    reading.sala_hum = data.get("humedad")
                    has_data = True
                elif room == "cuarto":
                    reading.cuarto_temp = data.get("temperatura")
                    reading.cuarto_hum = data.get("humedad")
                    has_data = True
                elif room == "local":
                    reading.local_temp = data.get("temperatura")
                    reading.local_hum = data.get("humedad")
                    has_data = True
            except json.JSONDecodeError:
                pass

        if has_data:
            session = SessionLocal()
            session.add(reading)
            session.commit()
            print(f"💾 [HISTORIAL] Datos guardados en SQLite: {reading.timestamp}")
            session.close()

    except Exception as e:
        print(f"❌ Error guardando historial: {e}")

def _worker_loop():
    """Simple loop that saves data periodically."""
    print("🚀 Worker de Persistencia iniciado.")
    last_save_time = time.time()
    
    while True:
        time.sleep(10) # Check every 10 seconds
        
        ahora = time.time()
        if (ahora - last_save_time) > (SAVE_INTERVAL_MINUTES * 60):
             print("⏱️ Intervalo cumplido. Guardando historial...")
             guardar_historial()
             last_save_time = ahora

def start_sensor_worker():
    """Start the worker in a background thread."""
    t = threading.Thread(target=_worker_loop, daemon=True)
    t.start()