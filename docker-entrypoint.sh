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

echo "🚀 Starting web server..."
exec "$@"