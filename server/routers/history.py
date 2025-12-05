from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from firebase_admin import firestore
from models.db import _db as db_client

# Creamos un Blueprint separado para historial
history_routes = Blueprint('history', __name__)

@history_routes.route('/history')
def get_sensor_history():
    """
    Obtiene el historial de sensores filtrado por horas.
    Uso: /history?hours=24 (Por defecto 12 horas)
    Orden: Ascendente (Antiguo -> Reciente) para gráficos.
    """
    # Verificación de seguridad básica
    if db_client is None:
        return jsonify({"success": False, "error": "Database not initialized"}), 500

    try:
        # 1. Obtener parámetros (default 12 horas)
        hours_param = request.args.get('hours', default=12, type=int)
        
        # 2. Calcular Timestamp de corte (String)
        # Como tus IDs son "YYYY-MM-DD HH:MM:SS", generamos un string idéntico
        now = datetime.now()
        time_threshold = now - timedelta(hours=hours_param)
        cutoff_id = time_threshold.strftime("%Y-%m-%d %H:%M:%S")

        print(f"🔍 Consultando historial desde: {cutoff_id}")

        # 3. Consulta a Firestore
        # Filtramos por __name__ (ID del documento) >= fecha de corte
        # El ordenamiento por __name__ (ASC) ya nos da el orden cronológico correcto
        docs = db_client.collection('historial_sensores')\
            .where('__name__', '>=', cutoff_id)\
            .order_by('__name__')\
            .stream()

        # 4. Formatear datos para el Frontend
        history_data = []
        for doc in docs:
            data = doc.to_dict()
            
            # Aplanamos la estructura para que sea fácil de graficar en JS
            # Manejamos .get() por si algún registro antiguo no tiene todos los campos
            item = {
                "timestamp": doc.id,
                # Cuarto
                "cuarto_temp": data.get('cuarto', {}).get('temperatura', None),
                "cuarto_hum": data.get('cuarto', {}).get('humedad', None),
                # Sala
                "sala_temp": data.get('sala', {}).get('temperatura', None),
                "sala_hum": data.get('sala', {}).get('humedad', None),
                # Local (Exterior)
                "local_temp": data.get('local', {}).get('temperatura', None),
                "local_hum": data.get('local', {}).get('humedad', None)
            }
            history_data.append(item)

        return jsonify({
            "success": True,
            "count": len(history_data),
            "hours_requested": hours_param,
            "data": history_data
        })

    except Exception as e:
        print(f"❌ Error obteniendo historial: {e}")
        return jsonify({"success": False, "error": str(e)}), 500