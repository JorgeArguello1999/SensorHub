from dotenv import load_dotenv
from os import getenv
load_dotenv()

from flask import Flask
import os

# Import database
from models.db import _db as db_client

# Import routes
from routers.stream import stream_routes
from routers.history import history_routes
from routers.api import api_routes
from routers.index import home_page

# Import Sensor Worker
from services.sensor_worker import start_sensor_worker

app = Flask(__name__)
app.config['SECRET_KEY'] = getenv('SECRET_KEY', 'dev_key')

app.register_blueprint(home_page)
app.register_blueprint(api_routes)
app.register_blueprint(history_routes)
app.register_blueprint(stream_routes)

if __name__ == '__main__':
    # Verify DB before starting
    if db_client is None:
        print("❌ Firebase not initialized. Check your credentials.")
    else:
        # START THE WORKER IN THE BACKGROUND
        # This thread will listen to the ESP32 and handle the data
        start_sensor_worker()
    
    print("🚀 Web Server starting at http://127.0.0.1:5000")
    
    # IMPORTANT: use_reloader=False prevents the worker from starting twice
    app.run(debug=True, port=int(os.getenv("PORT", 5000)), threaded=True, use_reloader=False)