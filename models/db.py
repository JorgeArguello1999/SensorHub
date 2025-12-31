import os
import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.sql_models import Base

# Redis Configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))

try:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)
    redis_client.ping() # Test connection
    print("✅ Redis connected successfully.")
except Exception as e:
    redis_client = None
    print(f"❌ Error connecting to Redis: {e}")

# SQLite Configuration
DB_PATH = "sensors.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create tables if they don't exist"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ SQLite tables created/verified.")
    except Exception as e:
        print(f"❌ Error initializing SQLite: {e}")
