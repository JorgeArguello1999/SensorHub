from sseclient import SSEClient
import json

url = "https://esp32-firebase-69994-default-rtdb.firebaseio.com/test.json"

messages = SSEClient(url)

print("Escuchando cambios...")

current_value = {}  # para mantener el estado completo del nodo test

for msg in messages:
    # Saltar keep-alive o eventos vacíos
    if not msg.data or msg.data == "null":
        continue

    try:
        payload = json.loads(msg.data)
    except:
        print("No se pudo parsear:", msg.data)
        continue

    # Caso típico: {"path":"/algo","data":valor}
    if "path" in payload:
        path = payload["path"]
        data = payload["data"]

        print(f"\n🔔 CAMBIO DETECTADO")
        print(f"Path: {path}")
        print(f"Valor nuevo: {data}")

        # --- Registrar el cambio dentro de nuestra copia local ---
        if path == "/":
            # Reemplazar toda la estructura
            current_value = data
        else:
            # Actualizar una parte de la estructura
            key = path.lstrip("/")   # quitar el "/" inicial
            current_value[key] = data

        print(f"Estado actual del nodo test: {current_value}")

    else:
        print("\nEvento sin estructura path/data:", payload)

