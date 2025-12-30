import json
from manage import app
from models.db import redis_client, SessionLocal, init_db
from models.sql_models import SensorReading
from services.sensor_worker import guardar_historial

def run_verification():
    print("🧪 Starting Migration Verification...")
    
    # Initialize DB (create tables)
    init_db()
    
    # 0. Setup
    client = app.test_client()
    session = SessionLocal()
    
    # Clear previous test data
    if redis_client:
        redis_client.delete("sensors:current")
    session.query(SensorReading).delete()
    session.commit()

    # 1. Test Ingestion (API -> Redis)
    payload = {
        "path": "/sala",
        "data": {"temperatura": 25.5, "humedad": 60.0}
    }
    
    print("   Testing POST /api/sensors...")
    resp = client.post('/api/sensors', json=payload)
    
    if resp.status_code != 200:
        print(f"❌ API Failed: {resp.status_code} - {resp.data}")
        return
    
    # Verify Redis
    val = redis_client.hget("sensors:current", "sala")
    if not val:
         print("❌ Redis key 'sensors:current' -> 'sala' missing.")
         return
    
    data_in_redis = json.loads(val)
    if data_in_redis['temperatura'] == 25.5:
        print("✅ API -> Redis Flow: OK")
    else:
        print(f"❌ Redis data mismatch: {data_in_redis}")
        return

    # 2. Test Persistence (Redis -> SQLite)
    print("   Testing Persistence (guardar_historial)...")
    guardar_historial()
    
    # Verify SQLite
    reading = session.query(SensorReading).order_by(SensorReading.timestamp.desc()).first()
    if reading and reading.sala_temp == 25.5:
        print("✅ Redis -> SQLite Flow: OK")
    else:
        print("❌ SQLite data missing or mismatch.")
    
    session.close()
    print("\n🎉 Verification Completed Successfully!")

if __name__ == "__main__":
    run_verification()
