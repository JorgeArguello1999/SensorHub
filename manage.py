from dotenv import load_dotenv
from os import getenv
load_dotenv()

from flask import Flask
import os

# Import database
from models.db import init_db

# Import routes
from routers.stream import stream_routes
from routers.api import api_routes
from routers.index import home_page

# Import Sensor Worker
from services.sensor_worker import start_sensor_worker

app = Flask(__name__)
app.config['SECRET_KEY'] = getenv('SECRET_KEY', 'dev_key')

app.register_blueprint(home_page)
app.register_blueprint(api_routes)
app.register_blueprint(stream_routes)

if __name__ == '__main__':
    # Initialize SQLite DB
    init_db()

    # Run Startup Verification (Safe Mode)
    print("🔍 Running Startup Self-Check...")
    try:
        from test.verify_migration import run_verification
        if not run_verification(app, safe_mode=True):
            print("⚠️ Startup Check Failed! Check logs.")
            # We don't exit(1) to avoid breaking proc/supervisor updates if it's just a transient error,
            # but usually you might want to. For now just warn.
    except ImportError:
        print("⚠️ Could not import verification script.")
    except Exception as e:
        print(f"⚠️ Error running verification: {e}")

    # START THE WORKER IN THE BACKGROUND
    start_sensor_worker()
    
    print("🚀 Web Server starting at http://127.0.0.1:5000")
    
    # IMPORTANT: use_reloader=False prevents the worker from starting twice
    app.run(debug=True, port=int(os.getenv("PORT", 5000)), threaded=True, use_reloader=False)