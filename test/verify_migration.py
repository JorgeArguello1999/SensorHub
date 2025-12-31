import json
import sys
import os

# Add parent dir to path to allow imports if run directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.db import redis_client, SessionLocal, init_db
from models.sql_models import SensorReading
from services.sensor_worker import guardar_historial

def run_verification(app_instance, safe_mode=True):
    """
    Verifies the application health and data flow.
    :param app_instance: Flask app instance
    :param safe_mode: If True, does not delete existing data.
    """
    print(f"🧪 Starting App Verification (Safe Mode: {safe_mode})...")
    
    # Initialize DB (verify connection)
    try:
        init_db()
    except Exception as e:
        print(f"❌ DB Init Fail: {e}")
        return False
    
    client = app_instance.test_client()
    session = SessionLocal()
    
    # Setup test data
    test_key = "sensors:test_health"
    
    try:
        # Clear specific test keys/data
        if redis_client:
            redis_client.delete(test_key)
            if not safe_mode:
                redis_client.delete("sensors:current")
        
        if not safe_mode:
            session.query(SensorReading).delete()
            session.commit()

        # 1. Test Ingestion (API -> Redis)
        # We use a distinct path for health check to avoid messing with real 'sala' data
        # unless we are in full verification mode (not safe mode).
        target_path = "/debug_check" if safe_mode else "/sala"
        payload = {
            "path": target_path,
            "data": {"temperatura": 99.9, "humedad": 10.0} # Distinct values
        }
        
        print(f"   Testing POST /api/sensors (path: {target_path})...")
        resp = client.post('/api/sensors', json=payload)
        
        if resp.status_code != 200:
            print(f"❌ API Failed: {resp.status_code} - {resp.data}")
            return False
        
        # Verify Redis
        if redis_client:
            # The API writes to "sensors:current" -> path
            val = redis_client.hget("sensors:current", target_path.strip("/"))
            if not val:
                 print(f"❌ Redis key 'sensors:current' -> '{target_path.strip('/')}' missing.")
                 return False
            
            data_in_redis = json.loads(val)
            if data_in_redis['temperatura'] == 99.9:
                print("✅ API -> Redis Flow: OK")
            else:
                print(f"❌ Redis data mismatch: {data_in_redis}")
                return False

        # 2. Test Persistence (Redis -> SQLite)
        # If safe mode, we skipping forcing global persistence to avoid writing the debug data to history DB if possible
        # Or we accept that one '99.9' reading goes into history.
        # For a "startup check", checking DB connection is enough usually.
        # But user asked for "verification". 
        # let's skip persistence check in safe mode to avoid polluting DB with 99.9
        
        if not safe_mode:
            print("   Testing Persistence (guardar_historial)...")
            guardar_historial()
            
            # Verify SQLite
            reading = session.query(SensorReading).order_by(SensorReading.timestamp.desc()).first()
            if reading and (reading.sala_temp == 99.9 or reading.sala_temp == 25.5): # 25.5 was old test, 99.9 is new
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
        session.close()

if __name__ == "__main__":
    from manage import app
    # When run directly, we might want full unsafe check? Or default to safe?
    # Let's do unsafe for manual verification script usage
    run_verification(app, safe_mode=False)
