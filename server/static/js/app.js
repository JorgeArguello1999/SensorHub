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
  // 1. IMPORTANTE: NO IMPORTES 'chartMode' AQUÍ. Bórralo si está.
} from "./config.js";

import { dataRef, fetchHourlyHistory } from "./api.js";
import { triggerCsvDownload } from "./utils.js"; 
import {
  renderCurrentStats,
  initComparisonChart,
  updateChartRealTime,
  renderHistoricalChart,
  renderStaticChart, 
  switchTab,
  toggleModeUI,      
  generatePrediction,
  getVisibleChartData,
} from "./ui.js";

// ----------------------------------------------------------------------
// 2. IMPORTANTE: DEBES TENER ESTA VARIABLE LOCAL DECLARADA ASÍ
// ----------------------------------------------------------------------
let activeTab = "temperatura";
let chartMode = "realtime";  // <--- Esta variable es la que controlan tus botones

// ----------------------------------------------------------------------
// LÓGICA DE STREAMING
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

  // 1. Listeners para Pestañas (Temperatura / Humedad)
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const newTab = button.dataset.tab;
      if (newTab !== activeTab) {
        activeTab = switchTab(newTab);
        
        // Si estamos en historial, recargar los datos con la nueva unidad
        if (chartMode === 'history') {
            loadHistoryData();
        }
      }
    });
  });

  // 2. Listener: Modo Tiempo Real
  if (modeRealtimeBtn) {
    modeRealtimeBtn.addEventListener("click", () => {
      if (chartMode !== 'realtime') {
        chartMode = 'realtime'; // Actualizamos variable local
        toggleModeUI('realtime');
        
        // Reiniciamos el gráfico para limpiar datos viejos del historial
        initComparisonChart(activeTab);
      }
    });
  }

  // 3. Listener: Modo Historial (Por horas)
  if (modeHistoryBtn) {
    modeHistoryBtn.addEventListener("click", () => {
      if (chartMode !== 'history') {
        chartMode = 'history'; // Actualizamos variable local
        toggleModeUI('history');
        
        // Cargar datos de la API inmediatamente
        loadHistoryData();
      }
    });
  }

  // 4. Listener: Cambio en input de horas (cuando ya estás en modo historial)
  if (historyHoursInput) {
    historyHoursInput.addEventListener("change", () => {
      if (chartMode === 'history') {
        loadHistoryData();
      }
    });
  }

  // 5. Botón de Descarga CSV
  if(downloadCsvButton) {
    downloadCsvButton.addEventListener("click", async () => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

        // A) MODO HISTORIAL (Descarga desde API)
        if (chartMode === 'history') {
            try {
                // 1. Obtener datos de la API
                const hours = parseInt(historyHoursInput.value) || 2;
                downloadCsvButton.textContent = "Generando...";
                
                const apiResponse = await fetchHourlyHistory(hours);
                
                if (!apiResponse || apiResponse.length === 0) {
                    alert("No hay datos históricos para descargar.");
                    downloadCsvButton.textContent = "Descargar CSV";
                    return;
                }

                // 2. Headers para Historial
                const headers = [
                    "Timestamp", 
                    "Local Temp (°C)", "Local Hum (%)",
                    "Sala Temp (°C)", "Sala Hum (%)",
                    "Cuarto Temp (°C)", "Cuarto Hum (%)"
                ];

                // 3. Mapear datos
                const rows = apiResponse.map(item => [
                    item.timestamp,
                    item.local_temp,
                    item.local_hum,
                    item.sala_temp,
                    item.sala_hum,
                    item.cuarto_temp,
                    item.cuarto_hum
                ]);

                // 4. Descargar
                const filename = `historial_sensores_${hours}h_${dateStr}_${timeStr}.csv`;
                triggerCsvDownload(headers, rows, filename);

            } catch (error) {
                console.error("Error al descargar historial:", error);
                alert("Hubo un error al generar el CSV del historial.");
            } finally {
                downloadCsvButton.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i> Descargar CSV`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } 
        
        // B) MODO TIEMPO REAL (Descarga visible)
        else {
            const rows = getVisibleChartData();
            
            if (rows.length === 0) {
                alert("No hay datos recolectados en el gráfico aún.");
                return;
            }

            const activeTabButton = document.querySelector(".tab-button.text-cyan-400");
            const isTemp = activeTabButton ? activeTabButton.dataset.tab === "temperatura" : true;
            const unit = isTemp ? "Temp (°C)" : "Hum (%)";

            const headers = ["Hora", `Local ${unit}`, `Sala ${unit}`, `Cuarto ${unit}`];
            const filename = `stream_sensores_${dateStr}_${timeStr}.csv`;

            triggerCsvDownload(headers, rows, filename);
        }
    });
  }

  // Listeners para comparación de fechas (si los usas)
  if (compareButton) {
      compareButton.addEventListener("click", () => {
          // Lógica existente de comparación...
          console.log("Comparar fechas clickeado (Lógica pendiente de implementar si la necesitas)");
      });
  }
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