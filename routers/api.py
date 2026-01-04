from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models.db import redis_client, SessionLocal
from models.sql_models import SensorReading, Sensor
from sqlalchemy import desc
from os import getenv
import json
import requests
import uuid

api_routes = Blueprint('api', __name__, url_prefix='/api')

OPENWEATHER_API_KEY = getenv('OPENWEATHER_API_KEY')
ADMIN_PASSWORD = getenv('ADMIN_PASSWORD', 'admin123') # Default fallback

# --- HELPER ---
def get_db():
    return SessionLocal()

# --- AUTH ---
@api_routes.route('/config/auth', methods=['POST'])
def check_auth():
    data = request.json
    if not data or data.get('password') != ADMIN_PASSWORD:
        return jsonify({"success": False, "error": "Invalid Password"}), 401
    return jsonify({"success": True}), 200

# --- SENSORS CRUD ---
@api_routes.route('/sensors', methods=['GET'])
def get_sensors():
    session = get_db()
    try:
        sensors = session.query(Sensor).filter_by(active=True).all()
        return jsonify([s.to_dict() for s in sensors]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@api_routes.route('/sensors', methods=['POST'])
def create_sensor():
    """Reserved for Admin. In a real app, check session/jwt."""
    data = request.json
    name = data.get('name')
    s_type = data.get('type') # 'esp32' or 'openweather'
    
    if not name or not s_type:
        return jsonify({"error": "Missing name or type"}), 400

    session = get_db()
    try:
        new_sensor = Sensor(name=name, type=s_type)
        
        if s_type == 'esp32':
            # Generate Token
            new_sensor.token = f"key_{uuid.uuid4().hex[:12]}"
        elif s_type == 'openweather':
            new_sensor.lat = data.get('lat')
            new_sensor.lon = data.get('lon')
            if not new_sensor.lat or not new_sensor.lon:
                 return jsonify({"error": "Missing coordinates for OpenWeather"}), 400

        session.add(new_sensor)
        session.commit()
        return jsonify(new_sensor.to_dict()), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@api_routes.route('/sensors/<int:sensor_id>', methods=['DELETE'])
def delete_sensor(sensor_id):
    session = get_db()
    try:
        sensor = session.query(Sensor).get(sensor_id)
        if not sensor:
            return jsonify({"error": "Sensor not found"}), 404
        
        sensor.active = False # Soft delete
        # Or session.delete(sensor) for hard delete
        session.delete(sensor) # Let's do hard delete for now to keep it clean
        session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# --- DATA INGESTION ---
@api_routes.route('/ingest/<token>', methods=['POST'])
def ingest_data(token):
    """
    Ingest data from ESP32.
    Payload: {"temperature": 22.5, "humidity": 60.0}
    """
    payload = request.json
    if not payload:
        return jsonify({"error": "Invalid payload"}), 400
    
    # 1. Validate Token via Redis (Cache) or DB
    # We can cache active tokens in Redis to avoid DB hits on every request
    
    session = get_db()
    try:
        # Check if sensor exists
        # Optimization: storing token->id mapping in Redis would be better
        sensor = session.query(Sensor).filter_by(token=token, type='esp32').first()
        if not sensor:
            return jsonify({"error": "Invalid Token"}), 403
            
        sensor_data = {
            "temperature": payload.get("temperature"),
            "humidity": payload.get("humidity"),
            "sensor_id": sensor.id,
            "sensor_name": sensor.name
        }

        # 2. Save to Redis Current State (for Live View)
        if redis_client:
            redis_client.hset("sensors:current", str(sensor.id), json.dumps(sensor_data))
            
            # 3. Publish to Stream
            update_msg = {
                "sensor_id": sensor.id,
                "data": sensor_data,
                "server_time": datetime.now().strftime("%H:%M:%S")
            }
            redis_client.publish("sensors:stream", json.dumps(update_msg))
            
        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@api_routes.route('/weather/scan', methods=['POST'])
def scan_weather_sensors():
    """
    Called by cron/worker to update all OpenWeather sensors
    """
    if not OPENWEATHER_API_KEY:
        return jsonify({"error": "No API Key configured"}), 500

    session = get_db()
    sensors = session.query(Sensor).filter_by(type='openweather', active=True).all()
    results = []
    
    for s in sensors:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={s.lat}&lon={s.lon}&APPID={OPENWEATHER_API_KEY}"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                weather_data = {
                    "temperature": data['main']['temp'] - 273.15,
                    "humidity": data['main']['humidity'],
                    "sensor_id": s.id,
                    "sensor_name": s.name
                }
                
                # Update Redis
                if redis_client:
                    redis_client.hset("sensors:current", str(s.id), json.dumps(weather_data))
                    update_msg = {
                        "sensor_id": s.id,
                        "data": weather_data,
                        "server_time": datetime.now().strftime("%H:%M:%S")
                    }
                    redis_client.publish("sensors:stream", json.dumps(update_msg))
                
                results.append({"id": s.id, "status": "ok"})
        except Exception as e:
            results.append({"id": s.id, "error": str(e)})
            
    session.close()
    return jsonify(results), 200


@api_routes.route('/history')
def get_sensor_history():
    """Get history for a specific sensor or all"""
    try:
        session = SessionLocal()
        
        sensor_id = request.args.get('sensor_id')
        start_param = request.args.get('start')
        end_param = request.args.get('end')
        hours_param = request.args.get('hours', default=1, type=int)

        query = session.query(SensorReading).join(Sensor)

        if sensor_id:
            query = query.filter(SensorReading.sensor_id == sensor_id)

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
        
        # Limit to prevent massive loads
        readings = query.order_by(SensorReading.timestamp.asc()).limit(2000).all()
        
        history_data = [r.to_dict() for r in readings]
        
        session.close()

        return jsonify({
            "success": True,
            "count": len(history_data),
            "data": history_data
        })

    except Exception as e:
        print(f"❌ Error with history: {e}")
        return jsonify({"success": False, "error": str(e)}), 500