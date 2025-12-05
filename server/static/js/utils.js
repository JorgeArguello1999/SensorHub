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