#!/usr/bin/env bash
set -e

echo "🚀 Starting Redis server..."
redis-server --daemonize yes \
  --bind 0.0.0.0 \
  --port "${REDIS_PORT:-6379}" \
  --dir /tmp

echo "⏳ Waiting for Redis to be ready..."
for i in $(seq 1 15); do
  if redis-cli -h localhost -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
    echo "✅ Redis is ready."
    break
  fi
  if [ "$i" = "15" ]; then
    echo "❌ Redis did not start in time."
    exit 1
  fi
  sleep 1
done

# Optionally run the verification tests
case "$RUN_TESTS" in
  1|true|TRUE|yes|YES|on|ON)
    echo "🧪 RUN_TESTS enabled - running verification tests..."
    echo "--------------------------------------------------"
    echo "👉 Running test/verify_migration.py"
    python test/verify_migration.py || echo "❌ verify_migration FAILED"

    echo "--------------------------------------------------"
    echo "👉 Running test/verify_config.py"
    python test/verify_config.py || echo "❌ verify_config FAILED"

    echo "--------------------------------------------------"
    echo "👉 Running test/debug_redis.py"
    python test/debug_redis.py || echo "❌ debug_redis FAILED"
    echo "--------------------------------------------------"
    echo "✅ Tests finished."
    unset RUN_TESTS
    ;;
esac

# Whether to start a simulated sensor that sends continuous live data
case "${START_SIMULATOR:-0}" in
  1|true|TRUE|yes|YES|on|ON) START_SIMULATOR=1 ;;
  *) START_SIMULATOR=0 ;;
esac

if [ "$START_SIMULATOR" = "1" ]; then
  echo "📡 Ensuring a simulated sensor exists..."
  TOKEN=$(python - <<'PY' | grep '^key_'
import uuid
from models.db import SessionLocal, init_db
from models.sql_models import Sensor
init_db()
session = SessionLocal()
try:
    s = session.query(Sensor).filter_by(name="Simulated Sensor", type="esp32").first()
    if s is None:
        s = Sensor(name="Simulated Sensor", type="esp32", token="key_" + uuid.uuid4().hex[:12])
        session.add(s)
        session.commit()
    print(s.token)
finally:
    session.close()
PY
)
  echo "✅ Simulator sensor ready (token=${TOKEN})"

  # Start the web server in the background so the simulator can talk to it
  "$@" &
  echo "🚀 Web server started (pid $!)."

  echo "⏳ Waiting for web server to accept connections..."
  python - <<'PY'
import time, urllib.request
for _ in range(30):
    try:
        urllib.request.urlopen("http://localhost:5000/", timeout=2)
        break
    except Exception:
        time.sleep(1)
PY

  echo "📡 Starting ESP32 simulator..."
  python test/esp32_simulator.py "$TOKEN" &
  echo "🚀 Simulator running (pid $!). All services up. Press Ctrl+C to stop."
  wait
else
  echo "🚀 Starting web server..."
  exec "$@"
fi