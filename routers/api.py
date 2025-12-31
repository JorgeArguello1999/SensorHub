from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models.db import redis_client, SessionLocal
from models.sql_models import SensorReading
from sqlalchemy import desc
from os import getenv
import json
import requests

api_routes = Blueprint('api', __name__, url_prefix='/api')

OPENWEATHER_API_KEY = getenv('OPENWEATHER_API_KEY')
LAT = "-1.27442"
LON = "-78.638786"

@api_routes.route('/weather/')
def weather():
    if not OPENWEATHER_API_KEY:
         return jsonify({"error": "No API Key configured"}), 500

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

@api_routes.route('/sensors', methods=['POST'])
def receive_sensor_data():
    """
    Ingest data from ESP32 or other sensors.
    Payload example: { "path": "sala", "data": {"temperatura": 22, "humedad": 50} }
    """
    try:
        payload = request.json
        if not payload or 'path' not in payload or 'data' not in payload:
            return jsonify({"error": "Invalid payload"}), 400
        
        path = payload['path'].strip("/") # e.g. "sala"
        data = payload['data'] # e.g. {"temperatura": ...}

        if redis_client:
            # 1. Save to Redis Current State (Hash)
            # Store as stringified JSON
            redis_client.hset("sensors:current", path, json.dumps(data))
            
            # 2. Publish to Stream (Pub/Sub)
            # We want to send the full update structure to the frontend
            update_msg = {
                path: data,
                "server_time": datetime.now().strftime("%H:%M:%S")
            }
            redis_client.publish("sensors:stream", json.dumps(update_msg))
            
            return jsonify({"success": True}), 200
        else:
            return jsonify({"error": "Redis unavailable"}), 503

    except Exception as e:
        print(f"Error receiving data: {e}")
        return jsonify({"error": str(e)}), 500

@api_routes.route('/history')
def get_sensor_history():
    """Get history from SQLite"""
    try:
        session = SessionLocal()
        
        start_param = request.args.get('start') # YYYY-MM-DD HH:MM:SS
        end_param = request.args.get('end')     # YYYY-MM-DD HH:MM:SS
        hours_param = request.args.get('hours', default=1, type=int)

        query = session.query(SensorReading)

        if start_param and end_param:
            try:
                start_dt = datetime.strptime(start_param, "%Y-%m-%d %H:%M:%S")
                end_dt = datetime.strptime(end_param, "%Y-%m-%d %H:%M:%S")
                query = query.filter(SensorReading.timestamp >= start_dt, SensorReading.timestamp <= end_dt)
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400
        else:
            now = datetime.now()
            time_threshold = now - timedelta(hours=hours_param)
            query = query.filter(SensorReading.timestamp >= time_threshold)
        
        # Order by timestamp
        readings = query.order_by(SensorReading.timestamp.asc()).all()
        
        history_data = [r.to_dict() for r in readings]
        
        session.close()

        return jsonify({
            "success": True,
            "count": len(history_data),
            "data": history_data
        })

    except Exception as e:
        print(f"❌ Error obteniendo historial: {e}")
        return jsonify({"success": False, "error": str(e)}), 500