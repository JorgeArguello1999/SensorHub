# wsgi.py
from manage import app
from services.sensor_worker import start_sensor_worker
from models.db import _db as db_client

# Verificamos que la DB esté lista antes de arrancar el worker
if db_client is not None:
    # Iniciamos el worker AQUÍ, porque Gunicorn no ejecuta el main de manage.py
    print("🚀 Arrancando Worker de Sensores para Producción...")
    start_sensor_worker()
else:
    print("⚠️ ADVERTENCIA: Base de datos no conectada en arranque Gunicorn.")

# Exponemos la variable 'app' para que Gunicorn la tome
application = app