// api.js
import {
  firebaseConfig,
  OPENWEATHER_URL,
  realtimeData,
} from "./config.js"; 
import { setError } from "./utils.js"; 

let app;
try {
  app = firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Error al inicializar Firebase.", e);
}

export const db = app ? app.database() : null;
export const dataRef = db ? db.ref("/") : null;

/**
 * Obtiene datos desde tu API Flask local.
 */
export const fetchOpenWeatherMapData = async () => {
  if (!OPENWEATHER_URL) return null;

  try {
    const response = await fetch(OPENWEATHER_URL);
    
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    
    // Parseamos el JSON con tu estructura
    const data = await response.json();
    
    // Extraemos directamente las propiedades de tu respuesta
    const tempCelsius = parseFloat(data.temperatura);
    const humidity = parseFloat(data.humedad);

    // Actualizamos el estado global
    realtimeData.local.temperatura = tempCelsius;
    realtimeData.local.humedad = humidity;

    return { temperatura: tempCelsius, humedad: humidity };

  } catch (error) {
    // Si falla la API local, no rompemos todo, solo logueamos
    console.error("API Fetch Error:", error);
    setError(`Error conectando a API Flask: ${error.message}`);
    return null;
  }
};