// api.js
import {
  firebaseConfig,
  OPENWEATHER_URL,
  realtimeData,
} from "./config.js"; // Cosas de configuración
import { setError } from "./utils.js"; // Cosas de utilidad y manejo de errores

// Inicialización de Firebase
let app;
try {
  // Asegúrate de que `firebase` esté cargado globalmente (p. ej., a través de una etiqueta <script>)
  app = firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Error al inicializar Firebase.", e);
  // No llamamos a setError porque la UI no se ha cargado completamente aún
}

export const db = app ? app.database() : null;
export const dataRef = db ? db.ref("/") : null;

/**
 * Obtiene la temperatura y humedad local de OpenWeatherMap.
 * @returns {Promise<{temperatura: number, humedad: number} | null>}
 */
export const fetchOpenWeatherMapData = async () => {
  if (!OPENWEATHER_URL) return null; // Fallback si no está configurada

  try {
    const response = await fetch(OPENWEATHER_URL);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    const tempKelvin = data.main.temp;
    const tempCelsius = tempKelvin - 273.15;
    const humidity = data.main.humidity;

    // Actualizamos el estado global aquí antes de devolver
    realtimeData.local.temperatura = tempCelsius;
    realtimeData.local.humedad = humidity;

    return { temperatura: tempCelsius, humedad: humidity };
  } catch (error) {
    setError(`Error al obtener datos de OpenWeatherMap: ${error.message}`);
    console.error("OpenWeatherMap Fetch Error:", error);
    return null;
  }
};