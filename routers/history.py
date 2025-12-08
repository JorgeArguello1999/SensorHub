# history.py
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
# Asegúrate de importar firestore o lo que uses para db_client
from models.db import _db as db_client

history_routes = Blueprint('history', __name__)

@history_routes.route('/history')
def get_sensor_history():
    if db_client is None:
        return jsonify({"success": False, "error": "Database not initialized"}), 500

    try:
        col_ref = db_client.collection('historial_sensores')
        
        # 1. Obtener parámetros de rango (start, end) o de horas
        start_param = request.args.get('start') # Formato esperado: YYYY-MM-DD HH:MM:SS
        end_param = request.args.get('end')     # Formato esperado: YYYY-MM-DD HH:MM:SS
        hours_param = request.args.get('hours', default=1, type=int)

        query = col_ref

        # LÓGICA DE FILTRADO
        if start_param and end_param:
            # A. Búsqueda por Rango Exacto
            print(f"🔍 Consultando rango: {start_param} a {end_param}")
            
            # Crear referencias a documentos para usar en el filtro __name__
            start_doc_ref = col_ref.document(start_param)
            end_doc_ref = col_ref.document(end_param)
            
            query = query.where('__name__', '>=', start_doc_ref)\
                         .where('__name__', '<=', end_doc_ref)
        else:
            # B. Búsqueda por Horas (Lógica existente)
            now = datetime.now()
            time_threshold = now - timedelta(hours=hours_param)
            cutoff_id = time_threshold.strftime("%Y-%m-%d %H:%M:%S")
            cutoff_ref = col_ref.document(cutoff_id)
            
            query = query.where('__name__', '>=', cutoff_ref)

        # Ejecutar consulta (siempre ordenamos por fecha)
        docs = query.order_by('__name__').stream()

        # Formatear datos
        history_data = []
        for doc in docs:
            data = doc.to_dict()
            item = {
                "timestamp": doc.id,
                "cuarto_temp": data.get('cuarto', {}).get('temperatura', None),
                "cuarto_hum": data.get('cuarto', {}).get('humedad', None),
                "sala_temp": data.get('sala', {}).get('temperatura', None),
                "sala_hum": data.get('sala', {}).get('humedad', None),
                "local_temp": data.get('local', {}).get('temperatura', None),
                "local_hum": data.get('local', {}).get('humedad', None)
            }
            history_data.append(item)

        return jsonify({
            "success": True,
            "count": len(history_data),
            "data": history_data
        })

    except Exception as e:
        print(f"❌ Error obteniendo historial: {e}")
        return jsonify({"success": False, "error": str(e)}), 500