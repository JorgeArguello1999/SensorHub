from dotenv import load_dotenv
from os import getenv
load_dotenv()

from flask import Flask
import os

# Import Firestore client (db) from models
from models.db import _db as db_client

# Import blueprints
from routers.stream import stream_routes, start_firestore_listener
from routers.history import history_routes
from routers.api import api_routes
from routers.index import home_page

app = Flask(__name__)
app.config['SECRET_KEY'] = getenv('SECRET_KEY')

app.register_blueprint(home_page)
app.register_blueprint(api_routes)
app.register_blueprint(stream_routes)
# app.register_blueprint(history_routes)

if __name__ == '__main__':
    if db_client is None:
        print("❌ Firebase not initialized. Please configure FIREBASE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS.")
    else:
        # Start the Firestore listener thread
        start_firestore_listener(db_client)
    print("🚀 Starting Flask server on http://127.0.0.1:5000")
    app.run(debug=True, port=int(os.getenv("PORT", 5000)), threaded=True)