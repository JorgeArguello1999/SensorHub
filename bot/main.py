import json
import os
import sys
import time
import requests
from datetime import datetime
import pytz
from sseclient import SSEClient

# --- IMPORTACIONES DE FIREBASE ADMIN ---
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# --- VARIABLES DE ENTORNO ---
from dotenv import load_dotenv
from os import getenv

# Cargar variables del archivo .env
load_dotenv()

# ==========================================
# 1. CONFIGURACIÓN
# ==========================================

# Timezone de Ecuador (Quito)
TIMEZONE_QUITO = pytz.timezone('America/Guayaquil')

# URL de Firebase Realtime Database (SSE)
FIREBASE_RTDB_URL = "https://esp32-firebase-69994-default-rtdb.firebaseio.com/.json"

# Configuración de OpenWeatherMap
OPENWEATHER_API_KEY = getenv('OPENWEATHER_API_KEY')
if not OPENWEATHER_API_KEY:
    print("⚠️ ADVERTENCIA: No se encontró OPENWEATHER_API_KEY en el archivo .env")

LAT = "-1.27442"
LON = "-78.638786"
# Añadimos units=metric para obtener Celsius
OPENWEATHER_URL = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&units=metric&APPID={OPENWEATHER_API_KEY}"

# Configuración de Firestore
SERVICE_ACCOUNT_FILE = getenv('SERVICE_ACCOUNT_FILE')
if not SERVICE_ACCOUNT_FILE:
    print("⚠️ ADVERTENCIA: No se encontró SERVICE_ACCOUNT_FILE en el archivo .env")

# ==========================================
# 2. INICIALIZACIÓN DE SERVICIOS
# ==========================================

# Iniciar Firestore
if not firebase_admin._apps:
    try:
        if SERVICE_ACCOUNT_FILE and os.path.exists(SERVICE_ACCOUNT_FILE):
            cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
            firebase_admin.initialize_app(cred)
            print("✅ Firestore conectado correctamente.")
        else:
            print(f"❌ Error: El archivo de credenciales '{SERVICE_ACCOUNT_FILE}' no existe.")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error conectando a Firestore: {e}")
        sys.exit(1)

db = firestore.client()

# Estado local de los datos (Estructura corregida: Cuarto, Sala, Local)
datos_sensores = {
    "cuarto": {"temperatura": 0, "humedad": 0},
    "sala": {"temperatura": 0, "humedad": 0},
    "local": {"temperatura": 0, "humedad": 0} # Datos de la API
}

# ==========================================
# 3. FUNCIONES AUXILIARES
# ==========================================

def obtener_clima_local():
    """
    Consulta la API de OpenWeatherMap y devuelve temperatura y humedad.
    """
    if not OPENWEATHER_API_KEY:
        return {"temperatura": "NoKey", "humedad": "NoKey"}

    try:
        response = requests.get(OPENWEATHER_URL)
        if response.status_code == 200:
            data = response.json()
            # Extraer datos del JSON de OpenWeather
            temp = data["main"]["temp"]
            hum = data["main"]["humidity"]
            return {"temperatura": temp, "humedad": hum}
        else:
            print(f"⚠️ Error API Clima: {response.status_code}")
            return {"temperatura": "Err", "humedad": "Err"}
    except Exception as e:
        print(f"⚠️ Excepción API Clima: {e}")
        return {"temperatura": "Err", "humedad": "Err"}

def guardar_en_firestore():
    """
    Guarda el estado actual completo en Firestore usando el timestamp de Quito como ID.
    """
    try:
        timestamp = datetime.now(TIMEZONE_QUITO).strftime("%Y-%m-%d %H:%M:%S")
        doc_ref = db.collection('historial_sensores').document(timestamp)
        doc_ref.set(datos_sensores)
        print(f"💾 Guardado en Firestore: {timestamp}")
    except Exception as e:
        print(f"❌ Error guardando en Firestore: {e}")

def actualizar_pantalla():
    """Muestra el dashboard en consola"""
    os.system('cls' if os.name == 'nt' else 'clear')
    
    print("========================================")
    print("   🌐 MONITOR IOT + CLIMA EXTERNO       ")
    print("========================================")
    
    # Mostrar cada zona ordenadamente
    orden = ["cuarto", "sala", "local"]
    
    for zona in orden:
        valores = datos_sensores.get(zona, {})
        print(f"📍 {zona.upper()}")
        
        if isinstance(valores, dict):
            t = valores.get("temperatura", "N/A")
            h = valores.get("humedad", "N/A")
            print(f"    ├─ Temp: {t} °C")
            print(f"    └─ Hum:  {h} %")
        else:
            print(f"    └─ Datos: {valores}")
        print("")
        
    print("========================================")
    print("Escuchando... (Ctrl+C para salir)")

def procesar_cambio_firebase(path, data):
    """
    Actualiza el diccionario local cuando llega algo de Firebase RTDB.
    """
    global datos_sensores
    
    clean_path = path.strip("/")
    parts = clean_path.split("/")
    
    # El primer elemento del path debe ser 'cuarto' o 'sala'
    room_name = parts[0]
    
    # Si la actualización es relevante (es una de nuestras habitaciones monitoreadas)
    # Nota: 'local' no se toca aquí porque viene de la API
    if room_name in datos_sensores and room_name != "local":
        
        # Caso 1: Actualización completa del nodo (ej: "cuarto": {temp: 20, hum: 50})
        if len(parts) == 1:
            datos_sensores[room_name] = data
            
        # Caso 2: Actualización de una métrica (ej: "cuarto/temperatura": 20)
        elif len(parts) == 2:
            metric = parts[1]
            if isinstance(datos_sensores[room_name], dict):
                datos_sensores[room_name][metric] = data
        
        return True # Indicamos que hubo un cambio relevante y debemos guardar/actualizar
    
    # Caso especial: Si llega actualización a la raíz "/" (carga inicial o reset)
    if not clean_path and isinstance(data, dict):
        cambio = False
        for key in data:
            if key in datos_sensores and key != "local":
                datos_sensores[key] = data[key]
                cambio = True
        return cambio

    return False

# ==========================================
# 4. BUCLE PRINCIPAL
# ==========================================

if __name__ == "__main__":
    print("Iniciando sistema...")
    
    # 1. Carga inicial del clima
    print("Consultando clima local...")
    datos_sensores["local"] = obtener_clima_local()
    actualizar_pantalla()

    print(f"Conectando a stream de Firebase: {FIREBASE_RTDB_URL}")
    
    try:
        messages = SSEClient(FIREBASE_RTDB_URL)
        
        for msg in messages:
            if not msg.data or msg.data == "null":
                continue

            try:
                payload = json.loads(msg.data)
                
                if "path" in payload and "data" in payload:
                    # 1. Actualizar datos de sensores internos (Cuarto/Sala)
                    cambio_detectado = procesar_cambio_firebase(payload["path"], payload["data"])
                    
                    if cambio_detectado:
                        # 2. Si cambiaron los sensores, actualizamos también el clima exterior
                        # (Para asegurar que 'local' esté fresco al momento de guardar)
                        datos_sensores["local"] = obtener_clima_local()
                        
                        # 3. Guardar foto completa en Firestore
                        guardar_en_firestore()
                        
                        # 4. Refrescar UI
                        actualizar_pantalla()
                        
            except json.JSONDecodeError:
                pass
            except Exception as e:
                # A veces el stream manda eventos de keep-alive que no son JSON
                pass

    except KeyboardInterrupt:
        print("\nSaliendo...")
    except Exception as e:
        print(f"\nError fatal: {e}")