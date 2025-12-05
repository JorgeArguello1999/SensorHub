// api.js
import {
  firebaseConfig,
  OPENWEATHER_URL,
  realtimeData,
} from "./config.js"; 
import { setError } from "./utils.js"; 

let app;
try {
  // Verificamos si firebase ya existe en el scope global (por CDN)
  if (typeof firebase !== 'undefined') {
      app = firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.error("Error al inicializar Firebase.", e);
}

export const db = app ? app.database() : null;
export const dataRef = db ? db.ref("/") : null;

/**
 * Obtiene datos desde tu API Flask local (OpenWeather o Proxy).
 */
export const fetchOpenWeatherMapData = async () => {
  if (!OPENWEATHER_URL) return null;

  try {
    const response = await fetch(OPENWEATHER_URL);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    
    const data = await response.json();
    
    const tempCelsius = parseFloat(data.temperatura);
    const humidity = parseFloat(data.humedad);

    realtimeData.local.temperatura = tempCelsius;
    realtimeData.local.humedad = humidity;

    return { temperatura: tempCelsius, humedad: humidity };

  } catch (error) {
    console.error("API Fetch Error:", error);
    setError(`Error conectando a API Flask: ${error.message}`);
    return null;
  }
};

/**
 * NUEVO: Obtiene el historial por horas desde el backend local.
 * Ruta: /history?hours=N
 */
export const fetchHourlyHistory = async (hours) => {
  try {
    const url = `/history?hours=${hours}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const json = await response.json();

    if (!json.success) {
      throw new Error("La API respondió con success: false");
    }

    return json.data; // Retornamos el array 'data'

  } catch (error) {
    console.error("Error fetching history:", error);
    setError(`Error cargando historial: ${error.message}`);
    return [];
  }
};