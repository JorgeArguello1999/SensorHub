from models.db import init_db, SessionLocal
from models.sql_models import SystemConfig
from services.sensor_worker import guardar_historial
import time

def verify_system_config():
    print("re-initializing db to ensure table exists...")
    init_db()
    
    session = SessionLocal()
    
    # 1. Check default behavior (missing config)
    # This is hard to test without mocking the worker loop internals, 
    # but we can test the data writing part.
    
    # 2. Set Config
    print("Setting config to 1 minute...")
    config = session.query(SystemConfig).filter_by(key='save_interval_minutes').first()
    if not config:
        config = SystemConfig(key='save_interval_minutes', value='1')
        session.add(config)
    else:
        config.value = '1'
    session.commit()
    
    # 3. Read Config back
    c2 = session.query(SystemConfig).filter_by(key='save_interval_minutes').first()
    print(f"Read back config value: {c2.value}")
    
    assert c2.value == '1'
    print("✅ SystemConfig persistence verified.")
    
    session.close()

if __name__ == "__main__":
    verify_system_config()
