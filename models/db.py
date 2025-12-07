import os
import firebase_admin
from firebase_admin import credentials, firestore

FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS')  # path to service account JSON (optional)

_db = None

try:
    if not firebase_admin._apps:
        if FIREBASE_CREDENTIALS:
            cred = credentials.Certificate(FIREBASE_CREDENTIALS)
            firebase_admin.initialize_app(cred)
        else:
            # fallback to the file used previously; keep compatibility
            try:
                cred = credentials.Certificate(".venv/esp32_firebase.json")
                firebase_admin.initialize_app(cred)
            except Exception:
                # try default environment credentials (GOOGLE_APPLICATION_CREDENTIALS)
                firebase_admin.initialize_app()
    _db = firestore.client()
    print("✅ Firebase connected successfully.")
except Exception as e:
    _db = None
    print(f"❌ Critical error initializing Firebase: {e}")
    print("   Check FIREBASE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS environment variables.")
