# wsgi.py
from manage import app
from services.sensor_worker import start_sensor_worker
from models.db import redis_client as db_client, init_db

# Ensure DB tables exist before the worker/gunicorn start (manage.py __main__ does
# this, but gunicorn imports wsgi.py directly and never runs that block).
init_db()

# Verify that the DB is ready before starting the worker
if db_client is not None:
    # Start the worker HERE, because Gunicorn does not execute the main in manage.py
    print("🚀 Starting Sensor Worker for Production...")
    start_sensor_worker()
else:
    print("⚠️ WARNING: Database not connected at Gunicorn startup.")

# Expose the 'app' variable for Gunicorn to use
application = app