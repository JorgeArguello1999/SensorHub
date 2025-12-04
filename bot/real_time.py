from sseclient import SSEClient
import json
import os
import sys

# --- CAMBIO IMPORTANTE AQUÍ ---
# URL de la raíz de tu base de datos (eliminamos '/test' y dejamos solo .json)
url = "https://esp32-firebase-69994-default-rtdb.firebaseio.com/.json"

# Estado inicial de los datos (Estructura esperada)
datos_sensores = {
    "sala": {"temperatura": 0, "humedad": 0},
    "cuarto": {"temperatura": 0, "humedad": 0}
}

def actualizar_pantalla():
    """Limpia la consola y muestra el estado actual de los sensores"""
    # Comando para limpiar pantalla según el sistema operativo (Windows o Linux/Mac)
    os.system('cls' if os.name == 'nt' else 'clear')
    
    print("========================================")
    print("   🏠  MONITOR DE CASA INTELIGENTE      ")
    print("========================================")
    print("")
    
    # --- DORMITORIO ---
    dorm = datos_sensores.get("sala", {})
    # Si dorm es None (por si la BD está vacía al inicio), usar diccionario vacío
    if dorm is None: dorm = {}
    
    t_dorm = dorm.get("temperatura", "N/A")
    h_dorm = dorm.get("humedad", "N/A")
    
    print(f"🛋  Sala")
    print(f"    ├─ Temperatura: {t_dorm} °C")
    print(f"    └─ Humedad:     {h_dorm} %")
    print("")
    
    # --- CUARTO ---
    cuarto = datos_sensores.get("cuarto", {})
    if cuarto is None: cuarto = {}
    
    t_cuarto = cuarto.get("temperatura", "N/A")
    h_cuarto = cuarto.get("humedad", "N/A")
    
    print(f"🛌️   CUARTO")
    print(f"    ├─ Temperatura: {t_cuarto} °C")
    print(f"    └─ Humedad:     {h_cuarto} %")
    print("")
    print("========================================")
    print("Escuchando cambios en la RAÍZ de la base de datos...")
    print("(Ctrl+C para salir)")

def procesar_cambio(path, data):
    """Actualiza el diccionario local basado en el path de Firebase"""
    global datos_sensores
    
    # Limpiar el path de barras iniciales/finales y dividirlo
    clean_path = path.strip("/")
    parts = clean_path.split("/")
    
    # Caso 1: Actualización de raíz total (path: "/")
    # Esto ocurre si modificas toda la BD a la vez desde la consola
    if not clean_path:
        if isinstance(data, dict):
            if "sala" in data: datos_sensores["sala"] = data["sala"]
            if "cuarto" in data: datos_sensores["cuarto"] = data["cuarto"]
        return

    # Caso 2: Actualización de un nodo principal (ej: path: "dormitorio")
    room_name = parts[0]
    
    # Solo procesamos si el cambio es en 'dormitorio' o 'cuarto'
    if room_name in datos_sensores:
        
        if len(parts) == 1:
            # Se actualizó todo el objeto del cuarto (ej: {temp: 20, hum: 50})
            datos_sensores[room_name] = data
            
        elif len(parts) == 2:
            # Se actualizó un valor específico (ej: path: "dormitorio/temperatura")
            metric = parts[1] # temperatura o humedad
            
            # Asegurarse que es un diccionario antes de asignar
            if not isinstance(datos_sensores[room_name], dict):
                datos_sensores[room_name] = {}
            datos_sensores[room_name][metric] = data

# --- INICIO DEL PROGRAMA ---

print(f"Conectando a {url} ...")
try:
    messages = SSEClient(url)
    actualizar_pantalla() # Mostrar pantalla inicial
    
    for msg in messages:
        # Ignorar keep-alive o datos vacíos
        if not msg.data or msg.data == "null":
            continue

        try:
            payload = json.loads(msg.data)
            
            # Streaming de Firebase devuelve 'path' y 'data'
            if "path" in payload and "data" in payload:
                path = payload["path"]
                data = payload["data"]
                
                # Procesar la lógica de actualización
                procesar_cambio(path, data)
                
                # Refrescar la visualización
                actualizar_pantalla()
                
        except json.JSONDecodeError:
            pass
        except Exception as e:
            print(f"Error procesando datos: {e}")

except KeyboardInterrupt:
    print("\nDesconectado.")
except Exception as e:
    print(f"Error de conexión: {e}")