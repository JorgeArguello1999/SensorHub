// api.js
import {
  OPENWEATHER_URL,
  realtimeData,
} from "./config.js"; 
import { setError } from "./utils.js"; 


export const fetchOpenWeatherMapData = async () => {
  if (!OPENWEATHER_URL) return null;

  try {
    const response = await fetch(OPENWEATHER_URL);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const data = await response.json();
    
    const tempCelsius = parseFloat(data.temperatura);
    const humidity = parseFloat(data.humedad);

    realtimeData.local.temperatura = tempCelsius;
    realtimeData.local.humedad = humidity;

    return { temperatura: tempCelsius, humedad: humidity };

  } catch (error) {
    console.error("API Fetch Error:", error);
    setError(`Error connecting to Flask API: ${error.message}`);
    return null;
  }
};

/**
 * Hourly history
 */
export const fetchHourlyHistory = async (hours) => {
  try {
    const url = `/api/history?hours=${hours}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const json = await response.json();

    if (!json.success) throw new Error("API responded with success: false");
    return json.data;

  } catch (error) {
    console.error("Error fetching history:", error);
    setError(`Error loading history: ${error.message}`);
    return [];
  }
};

/**
 * Range history (start/end)
 */
export const fetchRangeHistory = async (start, end) => {
    try {
      const url = `/api/history?start=${start}&end=${end}`; 
      const response = await fetch(url);
  
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const json = await response.json();
  
      if (!json.success) throw new Error("API responded with success: false");
      return json.data;
  
    } catch (error) {
      console.error("Error fetching range history:", error);
      setError(`Error loading range: ${error.message}`);
      return [];
    }
  };