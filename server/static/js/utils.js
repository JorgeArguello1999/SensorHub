// utils.js

// ----------------------------------------------------------------------
// FUNCIONES DE UTILIDAD (Sin dependencias externas por ahora)
// ----------------------------------------------------------------------

export const setError = (message) => {
  const el = document.getElementById("error-message");
  if (el) {
    el.innerHTML = message
      ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">${message}</div>`
      : "";
  }
};

export const generateMockHistoryForDate = () => {
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

export const downloadCsv = () => {
    // Aquí puedes implementar la lógica real de descarga si lo deseas más adelante
    alert("Función de descarga preparada. (Requiere implementación de backend o array local)");
};