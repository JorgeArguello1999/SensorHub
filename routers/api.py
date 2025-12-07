from flask import Blueprint, jsonify
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
