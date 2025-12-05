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
  // Nuevos imports de config
  modeRealtimeBtn,
  modeHistoryBtn,
  historyHoursInput,
} from "./config.js";

import { dataRef, fetchHourlyHistory } from "./api.js";
import { downloadCsv } from "./utils.js"; 
import {
  renderCurrentStats,
  initComparisonChart,
  updateChartRealTime,
  renderHistoricalChart,
  renderStaticChart, // Función nueva para pintar historial
  switchTab,
  toggleModeUI,      // Función nueva para UI
  generatePrediction,
} from "./ui.js";

// Variable de estado local para pestañas
let activeTab = "temperatura";
// Local mutable chart mode (avoid mutating module namespace)
let chartMode = "realtime";

// ----------------------------------------------------------------------
// LÓGICA DE STREAMING (SSE - Server Sent Events)
// ----------------------------------------------------------------------
const setupStreamListener = () => {
  console.log("Iniciando conexión SSE...");
  
  const eventSource = new EventSource("/stream-data");

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Actualizar Timestamp
      const timeString = data.id || new Date().toLocaleTimeString("es-EC");
      if (lastUpdateSpan) {
        lastUpdateSpan.textContent = `Última actualización: ${timeString}`;
        loadingSpinner.classList.add("hidden"); 
      }

      // Mapear datos a realtimeData
      if (data.local) {
        realtimeData.local.temperatura = parseFloat(data.local.temperatura || data.local.temp || 0);
        realtimeData.local.humedad = parseFloat(data.local.humedad || data.local.hum || 0);
      }
      if (data.sala) {
        realtimeData.sala.temperatura = parseFloat(data.sala.temperatura || 0);
        realtimeData.sala.humedad = parseFloat(data.sala.humedad || 0);
      }
      if (data.cuarto) {
        realtimeData.cuarto.temperatura = parseFloat(data.cuarto.temperatura || 0);
        realtimeData.cuarto.humedad = parseFloat(data.cuarto.humedad || 0);
      }

      // 1. Siempre actualizar Textos (Tarjetas grandes)
      renderCurrentStats();

      // 2. Solo actualizar gráfico si estamos en modo REALTIME
      if (chartMode === 'realtime') {
          updateChartRealTime(activeTab);
      }

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
// FUNCIONES AUXILIARES
// ----------------------------------------------------------------------

// Carga datos históricos y los pinta
const loadHistoryData = async () => {
    const hours = parseInt(historyHoursInput.value) || 2;
    
    // Feedback visual simple
    const canvas = document.getElementById("comparison-chart");
    canvas.style.opacity = "0.5";

    const data = await fetchHourlyHistory(hours);
    
    // renderStaticChart se encarga de limpiar y pintar
    renderStaticChart(data, activeTab);
    
    canvas.style.opacity = "1";
};

// ----------------------------------------------------------------------
// EVENTOS
// ----------------------------------------------------------------------
const setupEventListeners = () => {
  
  // 1. Cambio de Pestaña (Temperatura / Humedad)
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = switchTab(button.dataset.tab);
      
      // Si estamos en historial, al cambiar de Tab (ej. de Temp a Humedad)
      // necesitamos volver a cargar/pintar los datos históricos
      if (chartMode === 'history') {
          loadHistoryData();
      }
    });
  });

  // 2. Botón MODO TIEMPO REAL
  modeRealtimeBtn.addEventListener("click", () => {
      if(chartMode === 'realtime') return;
      
      chartMode = 'realtime'; // Cambiamos estado local
      toggleModeUI('realtime');      // Cambiamos botones
      
      // Reiniciamos el gráfico para limpiarlo y que empiece a recibir datos del stream
      initComparisonChart(activeTab);
  });

  // 3. Botón MODO HISTORIAL
  modeHistoryBtn.addEventListener("click", () => {
      if(chartMode === 'history') return;

      chartMode = 'history'; // Cambiamos estado local
      toggleModeUI('history');      // Cambiamos botones
      
      // Cargamos datos inmediatamente
      loadHistoryData();
  });

  // 4. Input de Horas (Cambio de valor)
  historyHoursInput.addEventListener("change", () => {
      if(chartMode === 'history') {
          loadHistoryData();
      }
  });

  // 5. Otros botones existentes
  if(compareButton) {
    compareButton.addEventListener("click", () => {
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

  // Configuración inicial de fechas
  const today = new Date().toISOString().split("T")[0];
  if(date1Input) date1Input.value = today;
  if(date2Input) date2Input.value = today;

  // 1. Iniciar Gráfico
  initComparisonChart(activeTab);
  
  // 2. Iniciar Listeners
  setupEventListeners();

  // 3. Iniciar Stream de datos (corre de fondo siempre)
  setupStreamListener();
  
  // 4. Asegurar estado inicial de tabs
  activeTab = switchTab("temperatura");
});