// app.js

import {
  loadingSpinner,
  lastUpdateSpan,
  realtimeData, 
  downloadCsvButton,
  tabButtons,
  initDOMRefs,
  modeRealtimeBtn,
  modeHistoryBtn,
  historyHoursInput,
  chartMode as initialChartMode // Renombramos para usar variable local mutable
} from "./config.js";

import { fetchHourlyHistory } from "./api.js";
import { triggerCsvDownload, createLinearRegressionModel } from "./utils.js"; 
import {
  renderCurrentStats,
  initComparisonChart,
  updateChartRealTime,
  renderStaticChart, 
  switchTab,
  toggleModeUI,      
  getVisibleChartData,
} from "./ui.js";

// ----------------------------------------------------------------------
// ESTADO LOCAL
// ----------------------------------------------------------------------
let activeTab = "temperatura";
let chartMode = "realtime"; 

// ----------------------------------------------------------------------
// PREDICCIONES (Lógica Matemática Real)
// ----------------------------------------------------------------------
const updatePredictions = async () => {
    // 1. Obtener datos recientes para calcular tendencia (6 horas es ideal)
    const hoursForTrend = 6;
    let data = [];
    
    try {
        data = await fetchHourlyHistory(hoursForTrend);
    } catch (e) {
        console.error("Error obteniendo datos para predicción", e);
        return;
    }

    if (!data || data.length < 2) {
        const errHtml = '<span class="text-red-400">Insuficientes datos</span>';
        ['pred-morning', 'pred-afternoon', 'pred-night'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = errHtml;
        });
        return;
    }

    // 2. Preparar datos para Regresión (Mapeo)
    const dataSala = data.map(d => ({ timestamp: d.timestamp, val: parseFloat(d.sala_temp) }));
    const dataCuarto = data.map(d => ({ timestamp: d.timestamp, val: parseFloat(d.cuarto_temp) }));
    const dataLocal = data.map(d => ({ timestamp: d.timestamp, val: parseFloat(d.local_temp) }));

    // 3. Crear Modelos
    const modelSala = createLinearRegressionModel(dataSala);
    const modelCuarto = createLinearRegressionModel(dataCuarto);
    const modelLocal = createLinearRegressionModel(dataLocal);

    if(!modelSala || !modelCuarto || !modelLocal) return;

    // 4. Fechas Objetivo (Hoy)
    const now = new Date();
    const morning = new Date(now); morning.setHours(9, 0, 0);
    const afternoon = new Date(now); afternoon.setHours(14, 0, 0);
    const night = new Date(now); night.setHours(20, 0, 0);

    // 5. Renderizar Tarjetas
    const renderPredictionCard = (elementId, timeObj) => {
        const el = document.getElementById(elementId);
        if(!el) return;

        // Predecir valores
        const pSala = modelSala.predict(timeObj).toFixed(1);
        const pCuarto = modelCuarto.predict(timeObj).toFixed(1);
        const pLocal = modelLocal.predict(timeObj).toFixed(1);

        el.innerHTML = `
            <div class="flex justify-between w-full mt-1">
                <span class="text-emerald-400 font-bold">${pSala}°</span>
                <span class="text-cyan-400 font-bold">${pCuarto}°</span>
                <span class="text-amber-400 font-bold">${pLocal}°</span>
            </div>
             <div class="flex justify-between w-full text-[9px] text-slate-500">
                <span>Sala</span><span>Cto</span><span>Ext</span>
            </div>
        `;
    };

    renderPredictionCard('pred-morning', morning);
    renderPredictionCard('pred-afternoon', afternoon);
    renderPredictionCard('pred-night', night);

    // 6. Configurar Botón Personalizado
    const btnCustom = document.getElementById('btn-predict-custom');
    if (btnCustom) {
        btnCustom.onclick = () => {
            const timeInput = document.getElementById('pred-time-input').value; // "15:30"
            if (!timeInput) return;

            const [h, m] = timeInput.split(':');
            const targetTime = new Date();
            targetTime.setHours(parseInt(h), parseInt(m), 0);

            const valSala = modelSala.predict(targetTime).toFixed(1);
            const valCuarto = modelCuarto.predict(targetTime).toFixed(1);

            const resultDiv = document.getElementById('custom-prediction-result');
            const resultVal = document.getElementById('custom-pred-value');
            
            resultDiv.classList.remove('hidden');
            resultVal.innerHTML = `<span class="text-emerald-400">${valSala}°</span> / <span class="text-cyan-400">${valCuarto}°</span>`;
        };
    }
};

// ----------------------------------------------------------------------
// STREAMING DE DATOS (SSE)
// ----------------------------------------------------------------------
const setupStreamListener = () => {
  console.log("Iniciando conexión SSE...");
  const eventSource = new EventSource("/stream-data");

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Actualizar Timestamp Global
      const timeString = data.id || new Date().toLocaleTimeString("es-EC");
      if (lastUpdateSpan) {
        lastUpdateSpan.textContent = `Actualizado: ${timeString}`;
        loadingSpinner.classList.add("hidden"); 
      }

      // Actualizar Objeto Global de Datos
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

      // 1. Actualizar Textos Grandes (KPIs)
      renderCurrentStats();

      // 2. Si estamos en modo REALTIME, actualizar gráfico
      if (chartMode === 'realtime') {
          updateChartRealTime(activeTab);
          
          // 3. Actualizar la nueva Tabla de Datos (Inserción directa al DOM)
          const tableBody = document.getElementById('data-table-body');
          if (tableBody) {
              const rowHtml = `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors animate-pulse-once">
                    <td class="p-3 text-slate-400 font-mono text-xs">${timeString}</td>
                    <td class="p-3 font-bold text-amber-500">${realtimeData.local.temperatura.toFixed(1)}°</td>
                    <td class="p-3 font-bold text-emerald-500">${realtimeData.sala.temperatura.toFixed(1)}°</td>
                    <td class="p-3 font-bold text-cyan-500">${realtimeData.cuarto.temperatura.toFixed(1)}°</td>
                    <td class="p-3"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span> <span class="text-xs text-emerald-400">Recibido</span></td>
                </tr>
              `;
              
              // Eliminar mensaje de "Esperando..." si existe
              if(tableBody.innerText.includes("Esperando")) tableBody.innerHTML = "";
              
              tableBody.insertAdjacentHTML('afterbegin', rowHtml);
              
              // Mantener solo 10 filas
              if (tableBody.children.length > 10) tableBody.lastElementChild.remove();
          }
      }

    } catch (error) {
      console.error("Error SSE:", error);
    }
  };

  eventSource.onerror = () => {
    if (lastUpdateSpan) {
      lastUpdateSpan.textContent = "Reconectando...";
      lastUpdateSpan.classList.add("text-red-400");
    }
  };
};

// ----------------------------------------------------------------------
// HELPER: Cargar Historial
// ----------------------------------------------------------------------
const loadHistoryData = async () => {
    const hours = parseInt(historyHoursInput.value) || 2;
    const canvas = document.getElementById("comparison-chart");
    
    // Feedback visual de carga
    if(canvas) canvas.style.opacity = "0.5";

    const data = await fetchHourlyHistory(hours);
    
    // Pintar gráfico estático
    renderStaticChart(data, activeTab);
    
    if(canvas) canvas.style.opacity = "1";
};

// ----------------------------------------------------------------------
// EVENTOS & LISTENERS
// ----------------------------------------------------------------------
const setupEventListeners = () => {

  // 1. Pestañas (Temperatura / Humedad)
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const newTab = button.dataset.tab;
      if (newTab !== activeTab) {
        activeTab = switchTab(newTab);
        
        // Si estamos en historial, recargar con la nueva unidad
        if (chartMode === 'history') {
            loadHistoryData();
        }
      }
    });
  });

  // 2. Modo Tiempo Real (Botón LIVE)
  if (modeRealtimeBtn) {
    modeRealtimeBtn.addEventListener("click", () => {
      if (chartMode !== 'realtime') {
        chartMode = 'realtime'; 
        toggleModeUI('realtime');
        
        // Estilos visuales del botón Live
        modeRealtimeBtn.classList.remove('text-slate-500', 'bg-transparent');
        modeRealtimeBtn.classList.add('bg-slate-800', 'text-cyan-400', 'border-cyan-500/30');

        initComparisonChart(activeTab); // Limpia gráfico histórico
      }
    });
  }

  // 3. Función Centralizada para Historial (Arregla el bug de botones)
  const activateHistoryMode = (hours) => {
      chartMode = 'history';
      toggleModeUI('history');

      // Actualizar input visualmente
      if(historyHoursInput) historyHoursInput.value = hours;

      // Desactivar visualmente botón Live
      if(modeRealtimeBtn) {
          modeRealtimeBtn.classList.add('text-slate-500', 'bg-transparent');
          modeRealtimeBtn.classList.remove('bg-slate-800', 'text-cyan-400', 'border-cyan-500/30');
      }

      // Cargar datos
      loadHistoryData();
  };

  // Botones Rápidos (6H, 12H, 24H)
  const btn6h = document.getElementById('btn-hist-6h');
  const btn12h = document.getElementById('btn-hist-12h');
  const btn24h = document.getElementById('btn-hist-24h');
  
  if(btn6h) btn6h.addEventListener('click', () => activateHistoryMode(6));
  if(btn12h) btn12h.addEventListener('click', () => activateHistoryMode(12));
  if(btn24h) btn24h.addEventListener('click', () => activateHistoryMode(24));

  // Botón Buscar Historial Personalizado
  const btnSearch = document.getElementById('mode-history-search');
  if(btnSearch) {
      btnSearch.addEventListener('click', () => {
          const h = parseInt(historyHoursInput.value) || 2;
          activateHistoryMode(h);
      });
  }

  // 4. Descarga CSV
  if(downloadCsvButton) {
    downloadCsvButton.addEventListener("click", async () => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

        // Modo Historial (Descarga desde API)
        if (chartMode === 'history') {
            try {
                downloadCsvButton.textContent = "...";
                const hours = parseInt(historyHoursInput.value) || 2;
                const apiResponse = await fetchHourlyHistory(hours);
                
                if (!apiResponse || apiResponse.length === 0) {
                    alert("No hay datos históricos.");
                    return;
                }

                const headers = ["Timestamp", "Local Temp", "Local Hum", "Sala Temp", "Sala Hum", "Cuarto Temp", "Cuarto Hum"];
                const rows = apiResponse.map(i => [i.timestamp, i.local_temp, i.local_hum, i.sala_temp, i.sala_hum, i.cuarto_temp, i.cuarto_hum]);

                triggerCsvDownload(headers, rows, `historial_${hours}h_${dateStr}.csv`);

            } catch (error) {
                console.error("Error CSV historial:", error);
            } finally {
                downloadCsvButton.innerHTML = `<i data-lucide="download" class="w-3 h-3"></i> CSV`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } 
        // Modo Realtime (Descarga visible)
        else {
            const rows = getVisibleChartData();
            if (rows.length === 0) {
                alert("Gráfico vacío. Espera a recibir datos.");
                return;
            }
            const activeTabButton = document.querySelector(".tab-button.text-cyan-400");
            const isTemp = activeTabButton ? activeTabButton.dataset.tab === "temperatura" : true;
            const unit = isTemp ? "Temp" : "Hum";
            const headers = ["Hora", `Local ${unit}`, `Sala ${unit}`, `Cuarto ${unit}`];
            
            triggerCsvDownload(headers, rows, `live_${unit}_${timeStr}.csv`);
        }
    });
  }
};

// ----------------------------------------------------------------------
// INICIO
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initDOMRefs();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // 1. Iniciar Gráfico
  initComparisonChart(activeTab);
  
  // 2. Iniciar Listeners
  setupEventListeners();

  // 3. Iniciar Stream SSE
  setupStreamListener();
  
  // 4. Calcular Predicciones Iniciales (Regresión)
  updatePredictions();
  
  // Intervalo: Recalcular predicciones cada 10 min
  setInterval(updatePredictions, 600000);
});