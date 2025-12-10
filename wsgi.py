# wsgi.py
from manage import app
from services.sensor_worker import start_sensor_worker
from models.db import _db as db_client

# Verify that the DB is ready before starting the worker
if db_client is not None:
    # Start the worker HERE, because Gunicorn does not execute the main in manage.py
    print("🚀 Starting Sensor Worker for Production...")
    start_sensor_worker()
else:
    print("⚠️ WARNING: Database not connected at Gunicorn startup.")

# Expose the 'app' variable for Gunicorn to use
application = app