import os
import redis
from dotenv import load_dotenv

# Force reload of .env
load_dotenv(override=True)

print("🔍 Diagnostics: Redis Connection")
print("-" * 30)

host = os.getenv('REDIS_HOST', 'localhost')
port = os.getenv('REDIS_PORT', 6379)
db = os.getenv('REDIS_DB', 0)

print(f"Environment Variables:")
print(f"  REDIS_HOST: '{host}'")
print(f"  REDIS_PORT: '{port}'")
print(f"  REDIS_DB:   '{db}'")

print("-" * 30)
print("Attempting connection...")

try:
    r = redis.Redis(host=host, port=int(port), db=int(db), decode_responses=True)
    r.ping()
    print("✅ PING successful!")
    
    # Write test
    print("Attempting to write test key 'debug:test'...")
    r.set("debug:test", "hello_world")
    val = r.get("debug:test")
    print(f"✅ Read back value: '{val}'")
    
    # Check sensors:current
    print("Checking 'sensors:current' hash...")
    current = r.hgetall("sensors:current")
    print(f"📦 Payload in 'sensors:current': {current}")

except Exception as e:
    print(f"❌ Connection FAILED: {e}")
