// utils.js
import { historicalData } from "./config.js";

/**
 * Establece el mensaje de error en la UI.
 * @param {string | null} message - Mensaje a mostrar, o null para borrarlo.
 */
export const setError = (message) => {
  const el = document.getElementById("error-message");
  if (el) {
    el.innerHTML = message
      ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">${message}</div>`
      : "";
  } else {
    // Si aún no existe el DOM, logueamos por si acaso
    if (message) console.warn("setError (no element):", message);
  }
};

/**
 * Simula datos históricos para las últimas 12 horas.
 * @param {object} currentData - Los datos actuales de Sala y Cuarto.
 * @returns {Array<object>} Datos históricos simulados.
 */
export const generateHistoricalData = (currentData) => {
  const data = [];
  const now = new Date();
  const localTemp = currentData.local.temperatura ?? 15;
  const localHum = currentData.local.humedad ?? 60;

  // Simular las últimas 12 horas
  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);

    data.push({
      hora: time.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
      }),

      // Datos de Temperatura
      Local_Temp: localTemp + (Math.random() * 2 - 1),
      Sala_Temp: currentData.sala.temperatura + (Math.random() * 2 - 1),
      Cuarto_Temp: currentData.cuarto.temperatura + (Math.random() * 2 - 1),

      // Datos de Humedad
      Local_Hum: localHum + (Math.random() * 5 - 2.5),
      Sala_Hum: currentData.sala.humedad + (Math.random() * 5 - 2.5),
      Cuarto_Hum: currentData.cuarto.humedad + (Math.random() * 5 - 2.5),
    });
  }
  return data;
};

/**
 * Genera datos simulados para la comparación histórica por fecha.
 * @returns {Array<object>} Datos simulados de temperatura.
 */
export const generateMockHistoryForDate = () => {
  const data = [];
  for (let h = 0; h < 24; h++) {
    data.push({
      hora: `${h.toString().padStart(2, "0")}:00`,
      Local: 18 + Math.random() * 5,
      Sala: 19 + Math.random() * 4,
      Cuarto: 20 + Math.random() * 3,
    });
  }
  return data;
};

/**
 * Descarga los datos históricos actuales como un archivo CSV.
 */
export const downloadCsv = () => {
  if (historicalData.length === 0) {
    alert("No hay datos históricos para descargar.");
    return;
  }

  // 1. Cabeceras del CSV
  const header =
    "Hora,Local Temp (°C),Local Hum (%),Sala Temp (°C),Sala Hum (%),Cuarto Temp (°C),Cuarto Hum (%)\n";

  // 2. Mapeo de datos
  const csvData = historicalData
    .map((item) => {
      return [
        item.hora,
        item.Local_Temp.toFixed(2),
        item.Local_Hum.toFixed(2),
        item.Sala_Temp.toFixed(2),
        item.Sala_Hum.toFixed(2),
        item.Cuarto_Temp.toFixed(2),
        item.Cuarto_Hum.toFixed(2),
      ].join(",");
    })
    .join("\n");

  const finalCsv = header + csvData;

  // 3. Crear el blob y forzar la descarga
  const blob = new Blob([finalCsv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `datos_historicos_temp_hum_${new Date().toISOString().slice(0, 10)}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};