import json
import sys
import os
import uuid

# Add parent dir to path to allow imports if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.db import redis_client, SessionLocal, init_db
from models.sql_models import SensorReading, Sensor
from services.sensor_worker import guardar_historial

def run_verification(app_instance, safe_mode=True):
    """
    Verifies the application health and data flow.
    """
    print(f"🧪 Starting App Verification (Safe Mode: {safe_mode})...")
    
    try:
        init_db()
    except Exception as e:
        print(f"❌ DB Init Fail: {e}")
        return False
    
    client = app_instance.test_client()
    session = SessionLocal()
    
    sensor_id = None
    
    try:
        # 1. Create Test Sensor
        print("   Creating Test Sensor...")
        sensor_payload = {"name": "TestVerify", "type": "esp32"}
        resp = client.post('/api/sensors', json=sensor_payload)
        
        if resp.status_code != 201:
            print(f"❌ Failed to create sensor: {resp.status_code} - {resp.data}")
            return False
            
        sensor_data = resp.json
        sensor_token = sensor_data['token']
        sensor_id = sensor_data['id']
        print(f"   ✅ Sensor Created: ID={sensor_id}, Token={sensor_token}")

        # 2. Test Ingestion (API -> Redis)
        ingest_payload = {"temperature": 99.9, "humidity": 10.0}
        
        print(f"   Testing POST /api/ingest/{sensor_token}...")
        resp = client.post(f'/api/ingest/{sensor_token}', json=ingest_payload)
        
        if resp.status_code != 200:
            print(f"❌ Ingest Failed: {resp.status_code} - {resp.data}")
            return False
        
        # Verify Redis
        if redis_client:
            val = redis_client.hget("sensors:current", str(sensor_id))
            if not val:
                 print(f"❌ Redis key 'sensors:current' -> '{sensor_id}' missing.")
                 return False
            
            data_in_redis = json.loads(val)
            if data_in_redis['temperature'] == 99.9:
                print("✅ API -> Redis Flow: OK")
            else:
                print(f"❌ Redis data mismatch: {data_in_redis}")
                return False

        # 3. Test Persistence (Redis -> SQLite)
        if not safe_mode:
            print("   Testing Persistence (guardar_historial)...")
            guardar_historial()
            
            # Verify SQLite
            # Query last reading for this sensor
            reading = session.query(SensorReading).filter_by(sensor_id=sensor_id).order_by(SensorReading.timestamp.desc()).first()
            if reading and reading.temperature == 99.9:
                print("✅ Redis -> SQLite Flow: OK")
            else:
                print("❌ SQLite data missing or mismatch.")
                return False
        else:
            print("   Skipping Persistence Check (Safe Mode active)")
        
        print("\n🎉 Verification Completed Successfully!")
        return True

    except Exception as e:
        print(f"❌ Verification Error: {e}")
        return False
    finally:
        # Cleanup Test Sensor
        if sensor_id and safe_mode:
            try:
                # Assuming simple logical delete or hard delete allowed via code
                # We can use DELETE endpoint
                client.delete(f'/api/sensors/{sensor_id}')
                print("   🧹 Test Sensor Cleaned up.")
            except:
                pass
        session.close()

if __name__ == "__main__":
    from manage import app
    run_verification(app, safe_mode=False)
