// app.js

import {
  loadingSpinner,
  lastUpdateSpan,
  realtimeData,
  date1Input,
  date2Input,
  compareButton,
  predictButton,
  downloadCsvButton,
  tabButtons,
  initDOMRefs,
} from "./config.js";

import { fetchOpenWeatherMapData, dataRef } from "./api.js";
import { setError, generateMockHistoryForDate, downloadCsv } from "./utils.js";
import {
  renderCurrentStats,
  initComparisonChart,    // IMPORTADO
  updateChartRealTime,    // IMPORTADO
  renderHistoricalChart,
  switchTab,
  generatePrediction,
} from "./ui.js";

// Variable de estado para saber qué estamos graficando
let activeTab = "temperatura";

// ----------------------------------------------------------------------
// DATOS
// ----------------------------------------------------------------------

const updateOpenWeatherMap = async () => {
  // Petición a tu API Flask Local
  const data = await fetchOpenWeatherMapData();
  if (data) renderCurrentStats();
};

const setupFirebaseListener = () => {
  if (!dataRef) return;
  dataRef.on("value", (snapshot) => {
    loadingSpinner.classList.add("hidden");
    const data = snapshot.val();
    if (data) {
      realtimeData.sala = {
        temperatura: parseFloat(data.sala?.temperatura || 0),
        humedad: parseFloat(data.sala?.humedad || 0),
      };
      realtimeData.cuarto = {
        temperatura: parseFloat(data.cuarto?.temperatura || 0),
        humedad: parseFloat(data.cuarto?.humedad || 0),
      };
      // Solo actualizamos los textos, NO el gráfico aquí (el gráfico va por tiempo)
      renderCurrentStats();
      lastUpdateSpan.textContent = new Date().toLocaleTimeString("es-EC");
    }
  });
};

// ----------------------------------------------------------------------
// BUCLE DE ANIMACIÓN DEL GRÁFICO
// ----------------------------------------------------------------------
const startChartLoop = () => {
    // Cada 2 segundos, añadimos un punto al gráfico
    setInterval(async () => {
        // 1. Aseguramos tener el dato más fresco de la API local
        // (Opcional: puedes sacarlo fuera si quieres menos peticiones, 
        // pero así aseguras sincronización exacta en el gráfico)
        await updateOpenWeatherMap(); 

        // 2. Actualizamos el gráfico con lo que haya en 'realtimeData' en ese momento
        updateChartRealTime(activeTab);
        
    }, 2000); // 2 segundos por punto
};

// ----------------------------------------------------------------------
// EVENTOS
// ----------------------------------------------------------------------
const setupEventListeners = () => {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = switchTab(button.dataset.tab);
    });
  });

  compareButton.addEventListener("click", () => {
    // Lógica histórica
    const hist1 = generateMockHistoryForDate();
    const hist2 = generateMockHistoryForDate();
    renderHistoricalChart(hist1, hist2, date1Input.value, date2Input.value);
  });

  predictButton.addEventListener("click", generatePrediction);
  downloadCsvButton.addEventListener("click", downloadCsv);
};

// ----------------------------------------------------------------------
// INICIO
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initDOMRefs();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  setupFirebaseListener();
  
  // Inicializamos el gráfico vacío
  initComparisonChart(activeTab);
  
  // Iniciamos el bucle que alimenta el gráfico
  startChartLoop();

  // Configuración inicial de fechas
  const today = new Date().toISOString().split("T")[0];
  date1Input.value = today;
  date2Input.value = today;
  
  setupEventListeners();
  
  // Render inicial
  activeTab = switchTab("temperatura");
});