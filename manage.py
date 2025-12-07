from dotenv import load_dotenv
from os import getenv
load_dotenv()

from flask import Flask
import os

# Importar base de datos
from models.db import _db as db_client

# Importar rutas
from routers.stream import stream_routes
from routers.history import history_routes
from routers.api import api_routes
from routers.index import home_page

# Importar el nuevo Worker de Sensores
from services.sensor_worker import start_sensor_worker

app = Flask(__name__)
app.config['SECRET_KEY'] = getenv('SECRET_KEY', 'dev_key')

app.register_blueprint(home_page)
app.register_blueprint(api_routes)
app.register_blueprint(history_routes)
app.register_blueprint(stream_routes)

if __name__ == '__main__':
    # Verificamos DB antes de iniciar
    if db_client is None:
        print("❌ Firebase no inicializado. Revisa tus credenciales.")
    else:
        # INICIAMOS EL WORKER EN SEGUNDO PLANO
        # Este hilo se encargará de escuchar al ESP32 y manejar los datos
        start_sensor_worker()
    
    print("🚀 Servidor Web iniciando en http://127.0.0.1:5000")
    
    # IMPORTANTE: use_reloader=False evita que el worker se inicie dos veces
    app.run(debug=True, port=int(os.getenv("PORT", 5000)), threaded=True, use_reloader=False)