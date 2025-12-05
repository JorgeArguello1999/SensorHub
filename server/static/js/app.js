// app.js

import {
  loadingSpinner,
  lastUpdateSpan,
  realtimeData, // Importante: actualizaremos esto
  date1Input,
  date2Input,
  compareButton,
  predictButton,
  downloadCsvButton,
  tabButtons,
  initDOMRefs,
} from "./config.js";

import { dataRef } from "./api.js";
import { downloadCsv } from "./utils.js"; // Quitamos fetchOpenWeatherMapData porque ahora entra por stream
import {
  renderCurrentStats,
  initComparisonChart,
  updateChartRealTime,
  renderHistoricalChart,
  switchTab,
  generatePrediction,
} from "./ui.js";

// ELIMINADO: import { Chart } ... para evitar el error 404.
// Usaremos la variable global 'Chart' que carga el index_old.html

// Variable de estado para saber qué estamos graficando
let activeTab = "temperatura";

// ----------------------------------------------------------------------
// LÓGICA DE STREAMING (SSE - Server Sent Events)
// Reemplaza a 'startChartLoop' y 'updateOpenWeatherMap'
// ----------------------------------------------------------------------
const setupStreamListener = () => {
  console.log("Iniciando conexión SSE...");
  
  // Conectamos al endpoint de Flask
  const eventSource = new EventSource("/stream-data");

  eventSource.onmessage = (event) => {
    try {
      // 1. Parsear datos
      const data = JSON.parse(event.data);
      // console.log("Dato recibido:", data); // Descomentar para depurar

      // 2. Actualizar Timestamp UI
      const timeString = data.id || new Date().toLocaleTimeString("es-EC");
      if (lastUpdateSpan) {
        lastUpdateSpan.textContent = `Última actualización: ${timeString}`;
        loadingSpinner.classList.add("hidden"); // Ocultar spinner cuando llega data
      }

      // 3. Mapear datos a nuestro objeto de estado global (realtimeData)
      // Flask envía: { local: {...}, sala: {...}, cuarto: {...} }
      
      // -- Exterior --
      if (data.local) {
        realtimeData.local.temperatura = parseFloat(data.local.temperatura || data.local.temp || 0);
        realtimeData.local.humedad = parseFloat(data.local.humedad || data.local.hum || 0);
      }

      // -- Sala --
      if (data.sala) {
        realtimeData.sala.temperatura = parseFloat(data.sala.temperatura || 0);
        realtimeData.sala.humedad = parseFloat(data.sala.humedad || 0);
      }

      // -- Cuarto --
      if (data.cuarto) {
        realtimeData.cuarto.temperatura = parseFloat(data.cuarto.temperatura || 0);
        realtimeData.cuarto.humedad = parseFloat(data.cuarto.humedad || 0);
      }

      // 4. Actualizar Textos (Tarjetas grandes)
      renderCurrentStats();

      // 5. Actualizar Gráfico en Tiempo Real
      // Llamamos a la función de ui.js que empuja los datos al gráfico
      updateChartRealTime(activeTab);

      // Efecto visual de parpadeo (Opcional, si quieres ver que llegó el dato)
      /*
      document.body.classList.add('opacity-95');
      setTimeout(() => document.body.classList.remove('opacity-95'), 100);
      */

    } catch (error) {
      console.error("Error procesando evento SSE:", error);
    }
  };

  eventSource.onerror = () => {
    console.warn("Conexión SSE perdida. Reintentando...");
    if (lastUpdateSpan) {
      lastUpdateSpan.textContent = "Reconectando...";
      lastUpdateSpan.classList.add("text-red-400");
    }
  };
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

  if(compareButton) {
    compareButton.addEventListener("click", () => {
      // Aquí iría tu lógica histórica real
      // Por ahora usamos mocks si no tienes backend para historial
      import("./utils.js").then(({ generateMockHistoryForDate }) => {
        const hist1 = generateMockHistoryForDate();
        const hist2 = generateMockHistoryForDate();
        renderHistoricalChart(hist1, hist2, date1Input.value, date2Input.value);
      });
    });
  }

  if(predictButton) predictButton.addEventListener("click", generatePrediction);
  if(downloadCsvButton) downloadCsvButton.addEventListener("click", downloadCsv);
};

// ----------------------------------------------------------------------
// INICIO
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initDOMRefs();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Inicializamos el gráfico vacío
  initComparisonChart(activeTab);
  
  // INICIAMOS EL STREAMING EN LUGAR DEL BUCLE
  setupStreamListener();

  // Configuración inicial de fechas
  const today = new Date().toISOString().split("T")[0];
  if(date1Input) date1Input.value = today;
  if(date2Input) date2Input.value = today;
  
  setupEventListeners();
  
  // Render inicial para activar estilos de tabs
  activeTab = switchTab("temperatura");
});