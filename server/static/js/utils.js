export const setError = (message) => {
  // ... (tu código existente igual) ...
  const el = document.getElementById("error-message");
  if (el) {
    el.innerHTML = message
      ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">${message}</div>`
      : "";
  }
};

export const generateMockHistoryForDate = () => {
   // ... (tu código existente igual) ...
   const data = [];
    for (let h = 0; h < 24; h++) {
        data.push({
        hora: `${h.toString().padStart(2, "0")}:00`,
        Sala: 19 + Math.random() * 4,
        Local: 18 + Math.random() * 5,
        Cuarto: 20 + Math.random() * 3,
        });
    }
    return data;
};

/**
 * NUEVO: Función genérica para convertir datos a CSV y descargarlos
 * @param {Array<string>} headers - Ej: ["Timestamp", "Temp Local", ...]
 * @param {Array<Array<any>>} rows - Matriz de datos
 * @param {string} filename - Nombre del archivo
 */
export const triggerCsvDownload = (headers, rows, filename) => {
    // 1. Unir headers y filas
    const csvContent = [
        headers.join(","), // Encabezados
        ...rows.map(row => row.join(",")) // Filas de datos
    ].join("\n");

    // 2. Crear Blob con BOM para que Excel lea bien tildes y caracteres
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    
    // 3. Crear enlace temporal y forzar descarga
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * MOTOR DE PREDICCIÓN: Regresión Lineal Simple (y = mx + b)
 * Calcula la tendencia basándose en datos históricos reales.
 * @param {Array} data - Array de objetos { timestamp, valor }
 * @returns {Object} { m: pendiente, b: intersección, predict: function(futureTimestamp) }
 */
export const createLinearRegressionModel = (data) => {
    // Necesitamos al menos 2 puntos para una línea
    if (!data || data.length < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = data.length;

    // Convertimos timestamps a valores numéricos (Minutos desde el punto inicial)
    // Esto normaliza X para que los números no sean gigantes (como Date.now())
    const startTime = new Date(data[0].timestamp).getTime();

    const normalizedData = data.map(point => {
        const x = (new Date(point.timestamp).getTime() - startTime) / 60000; // x en minutos
        const y = point.val;
        return { x, y };
    });

    normalizedData.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += (p.x * p.y);
        sumXX += (p.x * p.x);
    });

    // Fórmulas de Mínimos Cuadrados
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
        slope,
        intercept,
        startTime, // Guardamos la referencia de tiempo
        // Función para predecir Y dado un timestamp futuro
        predict: (futureDateObj) => {
            const xFuture = (futureDateObj.getTime() - startTime) / 60000;
            return (slope * xFuture) + intercept;
        }
    };
};

/**
 * Formatea una hora para mostrar en las tarjetas (Ej: 08:00 AM)
 */
export const formatTimeDisplay = (dateObj) => {
    return dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
};