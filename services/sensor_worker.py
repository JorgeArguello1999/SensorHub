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
        # Keys are now sensor_ids
        current_data = redis_client.hgetall("sensors:current")
        
        if not current_data:
            return

        session = SessionLocal()
        
        for sensor_id_str, json_val in current_data.items():
            try:
                data = json.loads(json_val)
                # Structure: {"temperature": 22.5, "humidity": 60.0, "sensor_id": 1, ...}
                
                sensor_id = int(sensor_id_str)
                timestamp_str = data.get("server_time") # Optional, or use current time
                
                reading = SensorReading(
                    sensor_id=sensor_id,
                    timestamp=datetime.now(TIMEZONE_QUITO),
                    temperature=data.get("temperature"),
                    humidity=data.get("humidity")
                )
                session.add(reading)
                
            except (json.JSONDecodeError, ValueError) as e:
                print(f"⚠️ Error parsing data for sensor {sensor_id_str}: {e}")
                continue

        session.commit()
        print(f"💾 [HISTORIAL] Datos guardados en SQLite.")
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