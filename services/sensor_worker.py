import time
import json
import threading
from datetime import datetime
import pytz
import os
import requests
from models.db import redis_client, SessionLocal
from models.sql_models import SensorReading, SystemConfig, Sensor

# --- CONFIG ---
TIMEZONE_QUITO = pytz.timezone('America/Guayaquil')
SAVE_INTERVAL_MINUTES = 15
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')

def update_weather_sensors():
    """Fetch data from OpenWeather for all active sensors."""
    if not OPENWEATHER_API_KEY:
        return

    session = SessionLocal()
    try:
        sensors = session.query(Sensor).filter_by(type='openweather', active=True).all()
        for s in sensors:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={s.lat}&lon={s.lon}&APPID={OPENWEATHER_API_KEY}"
                resp = requests.get(url, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    weather_data = {
                        "temperature": data['main']['temp'] - 273.15,
                        "humidity": data['main']['humidity'],
                        "sensor_id": s.id,
                        "sensor_name": s.name,
                        "server_time": datetime.now().strftime("%H:%M:%S")
                    }
                    
                    if redis_client:
                        # Save to Current State
                        redis_client.hset("sensors:current", str(s.id), json.dumps(weather_data))
                        
                        # Publish to Stream
                        update_msg = {
                            "sensor_id": s.id,
                            "data": weather_data,
                            "server_time": weather_data["server_time"]
                        }
                        redis_client.publish("sensors:stream", json.dumps(update_msg))
                        print(f"☁️ Weather updated for {s.name}")
            except Exception as e:
                print(f"⚠️ Error updating weather for {s.name}: {e}")
    except Exception as e:
        print(f"❌ Error in weather update loop: {e}")
    finally:
        session.close()

def guardar_historial():
    """Reads current state from Redis and saves to SQLite."""
    if not redis_client:
        return

    try:
        # Get current state from Redis
        current_data = redis_client.hgetall("sensors:current")
        
        if not current_data:
            return

        session = SessionLocal()
        
        for sensor_id_str, json_val in current_data.items():
            try:
                # SKIP LEGACY/INVALID KEYS SILENTLY
                try:
                    sensor_id = int(sensor_id_str)
                except ValueError:
                    continue 

                data = json.loads(json_val)
                
                reading = SensorReading(
                    sensor_id=sensor_id,
                    timestamp=datetime.now(TIMEZONE_QUITO),
                    temperature=data.get("temperature"),
                    humidity=data.get("humidity")
                )
                session.add(reading)
                
            except (json.JSONDecodeError, ValueError) as e:
                # print(f"⚠️ Error parsing data for sensor {sensor_id_str}: {e}")
                continue

        session.commit()
        print(f"💾 [HISTORY] Data saved to SQLite.")
        session.close()

    except Exception as e:
        print(f"❌ Error saving history: {e}")

def _worker_loop():
    """Simple loop that saves data periodically."""
    print("🚀 Persistence Worker started.")
    last_save_time = time.time()
    last_weather_time = 0
    
    while True:
        time.sleep(10) # Check every 10 seconds
        
        ahora = time.time()

        # 1. Update Weather (Every 2 min)
        if (ahora - last_weather_time) > (2 * 60):
            update_weather_sensors()
            last_weather_time = ahora

        # 2. Save History (Dynamic Config)
        interval_minutes = 15 # Default
        try:
             session = SessionLocal()
             config = session.query(SystemConfig).filter_by(key='save_interval_minutes').first()
             if config:
                 interval_minutes = int(config.value)
             session.close()
        except Exception as e:
            print(f"⚠️ Error reading config: {e}")

        if (ahora - last_save_time) > (interval_minutes * 60):
             print(f"⏱️ Interval of {interval_minutes}m reached. Saving history...")
             guardar_historial()
             last_save_time = ahora

def start_sensor_worker():
    """Start the worker in a background thread."""
    t = threading.Thread(target=_worker_loop, daemon=True)
    t.start()