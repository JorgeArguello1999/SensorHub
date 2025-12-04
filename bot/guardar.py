import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from datetime import datetime
import random # Solo para simular datos, luego usarás los reales

# 1. CONFIGURACIÓN INICIAL
# Asegúrate de tener el archivo .json descargado de Firebase en la misma carpeta
# Reemplaza 'serviceAccountKey.json' con el nombre real de tu archivo
cred = credentials.Certificate(".venv/esp32_firebase.json")

# Inicializamos la app (solo se hace una vez)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# Cliente de base de datos Firestore
db = firestore.client()

def guardar_registro(datos_sensores):
    """
    Recibe un diccionario con los datos y los guarda en Firestore
    usando la fecha y hora actual como ID del documento.
    """
    
    # Generar timestamp actual formato ISO (ej: 2023-10-27 10:30:05)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Referencia a la colección 'historial_sensores'
    # Creamos un documento nuevo cuyo ID es el timestamp
    doc_ref = db.collection('historial_sensores').document(timestamp)
    
    # Guardamos los datos
    doc_ref.set(datos_sensores)
    
    print(f"✅ Registro guardado exitosamente con ID: {timestamp}")
    print(f"   Datos: {datos_sensores}")

# --- EJEMPLO DE USO ---

if __name__ == "__main__":
    # Simulamos la estructura que pediste:
    # { cuarto: {...}, sala: {...}, local: {...}}
    
    datos_a_guardar = {
        "cuarto": {
            "temperatura": 88, 
            "humedad": 88
        },
        "sala": {
            "temperatura": 99, 
            "humedad": 99
        },
        "local": {
            "temperatura": 99, 
            "humedad": 99
        }
    }
    
    # Llamamos a la función para guardar
    try:
        guardar_registro(datos_a_guardar)
    except Exception as e:
        print(f"❌ Error al guardar en Firestore: {e}")
        print("NOTA: Verifica que tengas el archivo serviceAccountKey.json y la librería firebase-admin instalada.")