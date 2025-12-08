// app.js

import {
  loadingSpinner,
  lastUpdateSpan,
  realtimeData, 
  downloadCsvButton,
  tabButtons,
  initDOMRefs,
  // Modos
  modeRealtimeBtn, 
  modeHistoryBtn,
  modeAnalyticsBtn,
  // Paneles
  chartContainer,
  analyticsPanel,
  // Inputs
  historyHoursInput,
  historyStartInput,
  historyEndInput,
  rangeSearchBtn,
  chartMode as initialChartMode
} from "./config.js";

import { fetchHourlyHistory, fetchRangeHistory } from "./api.js";
import { triggerCsvDownload, createLinearRegressionModel } from "./utils.js"; 
import {
  renderCurrentStats,
  initComparisonChart,
  updateChartRealTime,
  renderStaticChart, 
  switchTab,
  getVisibleChartData,
  renderAnalytics 
} from "./ui.js";

// ESTADO LOCAL
let activeTab = "temperatura";
let chartMode = "realtime"; 
// Variable para guardar los últimos datos traídos y no hacer fetch doble al cambiar tab
let cachedHistoryData = []; 

const formatDateTimeInput = (val) => {
    if (!val) return null;
    return val.replace("T", " ") + ":00"; 
};

// PREDICCIONES
const updatePredictions = async () => {
    const hoursForTrend = 12;
    let data = [];
    try { data = await fetchHourlyHistory(hoursForTrend); } catch (e) { console.error(e); return; }
    if (!data || data.length < 2) return;

    const modelSala = createLinearRegressionModel(data.map(d => ({ timestamp: d.timestamp, val: parseFloat(d.sala_temp) })));
    const modelCuarto = createLinearRegressionModel(data.map(d => ({ timestamp: d.timestamp, val: parseFloat(d.cuarto_temp) })));
    const modelLocal = createLinearRegressionModel(data.map(d => ({ timestamp: d.timestamp, val: parseFloat(d.local_temp) })));

    if(!modelSala) return;

    const now = new Date();
    const morning = new Date(now); morning.setHours(9, 0, 0);
    const afternoon = new Date(now); afternoon.setHours(14, 0, 0);
    const night = new Date(now); night.setHours(20, 0, 0);

    const render = (id, time) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = `
            <div class="flex justify-between w-full mt-1 px-1">
                <span class="text-emerald-400 font-bold">${modelSala.predict(time).toFixed(1)}°</span>
                <span class="text-cyan-400 font-bold">${modelCuarto.predict(time).toFixed(1)}°</span>
                <span class="text-amber-400 font-bold">${modelLocal.predict(time).toFixed(1)}°</span>
            </div>
            <div class="flex justify-between w-full text-[9px] text-slate-500 px-1 mt-0.5">
                <span>Sala</span><span>Cto</span><span>Ext</span>
            </div>
        `;
    };
    render('pred-morning', morning);
    render('pred-afternoon', afternoon);
    render('pred-night', night);

    const btnCustom = document.getElementById('btn-predict-custom');
    if (btnCustom) {
        btnCustom.onclick = () => {
            const timeInput = document.getElementById('pred-time-input').value;
            if (!timeInput) return;
            const [h, m] = timeInput.split(':');
            const t = new Date(); t.setHours(h, m, 0);
            document.getElementById('custom-prediction-result').classList.remove('hidden');
            document.getElementById('custom-pred-value').innerText = `${modelSala.predict(t).toFixed(1)}°C`;
        };
    }
};

// STREAM SSE
const setupStreamListener = () => {
  const eventSource = new EventSource("/stream-data");
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const timeString = data.id || new Date().toLocaleTimeString("es-EC");

      if (lastUpdateSpan) {
        lastUpdateSpan.textContent = `Actualizado: ${timeString}`;
        loadingSpinner.classList.add("hidden"); 
      }
      if (data.local) { realtimeData.local.temperatura = parseFloat(data.local.temperatura||0); realtimeData.local.humedad = parseFloat(data.local.humedad||0); }
      if (data.sala) { realtimeData.sala.temperatura = parseFloat(data.sala.temperatura||0); realtimeData.sala.humedad = parseFloat(data.sala.humedad||0); }
      if (data.cuarto) { realtimeData.cuarto.temperatura = parseFloat(data.cuarto.temperatura||0); realtimeData.cuarto.humedad = parseFloat(data.cuarto.humedad||0); }

      renderCurrentStats();

      if (chartMode === 'realtime') {
          updateChartRealTime(activeTab);
          const tableBody = document.getElementById('data-table-body');
          if (tableBody) {
              const row = `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors animate-pulse-once">
                    <td class="p-3 text-slate-400 font-mono text-xs">${timeString}</td>
                    <td class="p-3 font-bold text-amber-500">${realtimeData.local.temperatura.toFixed(1)}°</td>
                    <td class="p-3 font-bold text-emerald-500">${realtimeData.sala.temperatura.toFixed(1)}°</td>
                    <td class="p-3 font-bold text-cyan-500">${realtimeData.cuarto.temperatura.toFixed(1)}°</td>
                    <td class="p-3"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span> <span class="text-xs text-emerald-400">Recibido</span></td>
                </tr>`;
              if(tableBody.innerText.includes("Esperando")) tableBody.innerHTML = "";
              tableBody.insertAdjacentHTML('afterbegin', row);
              if (tableBody.children.length > 10) tableBody.lastElementChild.remove();
          }
      }
    } catch (e) { console.error("SSE Error", e); }
  };
};

// CARGA DE DATOS CENTRALIZADA
const loadHistoryData = async () => {
    const hours = parseInt(historyHoursInput.value) || 12; 
    
    // UI Feedback
    if(chartMode === 'history') document.getElementById("comparison-chart").style.opacity = "0.5";
    if(chartMode === 'analytics') document.getElementById("stat-total-samples").innerText = "...";

    try {
        const data = await fetchHourlyHistory(hours);
        cachedHistoryData = data; // Guardamos en caché

        if (chartMode === 'analytics') {
            // PASAMOS activeTab PARA SABER SI ES TEMP O HUMEDAD
            renderAnalytics(data, activeTab);
        } else if (chartMode === 'history') {
            renderStaticChart(data, activeTab);
            fillHistoryTable(data);
        }
    } catch (e) { console.error(e); }

    if(chartMode === 'history') document.getElementById("comparison-chart").style.opacity = "1";
};

const fillHistoryTable = (data) => {
    const tableBody = document.getElementById('data-table-body');
    if (tableBody && data.length > 0) {
        tableBody.innerHTML = ""; 
        data.slice(0, 10).forEach(row => { 
             const tr = `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td class="p-3 text-slate-400 font-mono text-xs">${row.timestamp.split(' ')[1]}</td>
                    <td class="p-3 font-bold text-amber-500">${row.local_temp}°</td>
                    <td class="p-3 font-bold text-emerald-500">${row.sala_temp}°</td>
                    <td class="p-3 font-bold text-cyan-500">${row.cuarto_temp}°</td>
                    <td class="p-3"><span class="text-xs text-slate-500">Histórico</span></td>
                </tr>`;
             tableBody.insertAdjacentHTML('beforeend', tr);
        });
    }
};

// EVENTOS
const setupEventListeners = () => {

  // TABS (Temperatura vs Humedad)
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.tab !== activeTab) {
        activeTab = switchTab(button.dataset.tab);
        
        // Si estamos en Analítica, actualizamos los datos con la pestaña seleccionada
        if (chartMode === 'analytics') {
             // Si ya tenemos datos, no hacemos fetch de nuevo, solo renderizamos
             if (cachedHistoryData.length > 0) {
                 renderAnalytics(cachedHistoryData, activeTab);
             } else {
                 loadHistoryData();
             }
        } 
        // Si estamos en Historial
        else if (chartMode === 'history') {
             if (cachedHistoryData.length > 0) {
                 renderStaticChart(cachedHistoryData, activeTab);
             } else {
                 loadHistoryData();
             }
        }
      }
    });
  });

  // MODO: LIVE
  if (modeRealtimeBtn) {
    modeRealtimeBtn.addEventListener("click", () => {
        chartMode = 'realtime';
        modeRealtimeBtn.className = "mode-tab-active px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        modeHistoryBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        modeAnalyticsBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        
        document.getElementById("history-controls").classList.add("hidden");
        chartContainer.classList.remove("hidden");
        analyticsPanel.classList.add("hidden");
        
        initComparisonChart(activeTab);
        const tableBody = document.getElementById('data-table-body');
        if(tableBody) tableBody.innerHTML = `<tr><td class="p-3 text-slate-500 italic" colspan="5">Modo En Vivo: Esperando datos...</td></tr>`;
    });
  }

  // MODO: HISTORIAL
  if (modeHistoryBtn) {
    modeHistoryBtn.addEventListener("click", () => {
        chartMode = 'history';
        modeHistoryBtn.className = "mode-tab-active px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        modeRealtimeBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        modeAnalyticsBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";

        document.getElementById("history-controls").classList.remove("hidden");
        chartContainer.classList.remove("hidden");
        analyticsPanel.classList.add("hidden");

        historyHoursInput.value = "12"; 
        loadHistoryData();
    });
  }

  // MODO: ANALÍTICA
  if (modeAnalyticsBtn) {
      modeAnalyticsBtn.addEventListener("click", () => {
          chartMode = 'analytics';
          modeAnalyticsBtn.className = "mode-tab-analytics px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20";
          modeRealtimeBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
          modeHistoryBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";

          document.getElementById("history-controls").classList.remove("hidden");
          chartContainer.classList.add("hidden");
          analyticsPanel.classList.remove("hidden");

          loadHistoryData();
      });
  }

  // BOTÓN BUSCAR HORAS
  const btnSearch = document.getElementById('mode-history-search');
  if(btnSearch) btnSearch.addEventListener('click', loadHistoryData);

  // BOTÓN BUSCAR RANGO
  if (rangeSearchBtn) {
      rangeSearchBtn.addEventListener("click", async () => {
          const startVal = historyStartInput.value;
          const endVal = historyEndInput.value;
          if (!startVal || !endVal) { alert("Selecciona fechas"); return; }

          const startFmt = formatDateTimeInput(startVal);
          const endFmt = formatDateTimeInput(endVal);
          
          if(chartMode === 'history') document.getElementById("comparison-chart").style.opacity = "0.5";
          if(chartMode === 'analytics') document.getElementById("stat-total-samples").innerText = "...";

          const data = await fetchRangeHistory(startFmt, endFmt);
          cachedHistoryData = data; 
          
          if (chartMode === 'analytics') {
              renderAnalytics(data, activeTab);
          } else {
              renderStaticChart(data, activeTab);
              fillHistoryTable(data);
          }

          if(chartMode === 'history') document.getElementById("comparison-chart").style.opacity = "1";
      });
  }

  // CSV
  if(downloadCsvButton) {
    downloadCsvButton.addEventListener("click", async () => {
        if (chartMode === 'history' || chartMode === 'analytics') {
             if (historyStartInput.value && historyEndInput.value) {
                 const s = formatDateTimeInput(historyStartInput.value);
                 const e = formatDateTimeInput(historyEndInput.value);
                 const data = await fetchRangeHistory(s, e);
                 if(data.length) triggerCsvDownload(["TS", "L_T", "L_H", "S_T", "S_H", "C_T", "C_H"], data.map(d=>[d.timestamp,d.local_temp,d.local_hum,d.sala_temp,d.sala_hum,d.cuarto_temp,d.cuarto_hum]), "reporte_rango.csv");
             } else {
                 const h = historyHoursInput.value || 12;
                 const data = await fetchHourlyHistory(h);
                 if(data.length) triggerCsvDownload(["TS", "L_T", "L_H", "S_T", "S_H", "C_T", "C_H"], data.map(d=>[d.timestamp,d.local_temp,d.local_hum,d.sala_temp,d.sala_hum,d.cuarto_temp,d.cuarto_hum]), "reporte_horas.csv");
             }
        } else {
             const rows = getVisibleChartData();
             if(rows.length) triggerCsvDownload(["Hora", "Local", "Sala", "Cuarto"], rows, "live.csv");
        }
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initDOMRefs();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  setupEventListeners();
  setupStreamListener();
  initComparisonChart(activeTab);
  updatePredictions();
  
  setInterval(updatePredictions, 600000);
});