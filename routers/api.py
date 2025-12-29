from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models.db import _db as db_client
from os import getenv

import requests 

api_routes = Blueprint('api', __name__, url_prefix='/api')

OPENWEATHER_API_KEY = getenv('OPENWEATHER_API_KEY')
LAT = "-1.27442"
LON = "-78.638786"

@api_routes.route('/weather/')
def weather():
    OPENWEATHER_URL = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&APPID={OPENWEATHER_API_KEY}"

    try:
        response = requests.get(OPENWEATHER_URL)
        response.raise_for_status()  
        data = response.json()
        
        weather_data = {
            "temperatura": data['main']['temp'] - 273.15,       
            "humedad": data['main']['humidity'],
            "descripcion": data['weather'][0]['description'],
            "nombre_ciudad": data['name']
        }

        return jsonify(weather_data), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Error al obtener datos del clima: {e}"}), 500      

@api_routes.route('/history')
def get_sensor_history():
    if db_client is None:
        return jsonify({"success": False, "error": "Database not initialized"}), 500

    try:
        col_ref = db_client.collection('historial_sensores')
        
        start_param = request.args.get('start') # YYYY-MM-DD HH:MM:SS
        end_param = request.args.get('end')     # YYYY-MM-DD HH:MM:SS
        hours_param = request.args.get('hours', default=1, type=int)

        query = col_ref

        # Filter logic
        if start_param and end_param:
            print(f"🔍 Consultando rango: {start_param} a {end_param}")
            
            start_doc_ref = col_ref.document(start_param)
            end_doc_ref = col_ref.document(end_param)
            
            query = query.where('__name__', '>=', start_doc_ref)\
                        .where('__name__', '<=', end_doc_ref)
        else:
            now = datetime.now()
            time_threshold = now - timedelta(hours=hours_param)
            cutoff_id = time_threshold.strftime("%Y-%m-%d %H:%M:%S")
            cutoff_ref = col_ref.document(cutoff_id)
            
            query = query.where('__name__', '>=', cutoff_ref)

        docs = query.order_by('__name__').stream()

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