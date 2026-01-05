// app.js

import {
  loadingSpinner,
  lastUpdateSpan,
  globalSensors, 
  sensorDataMap,
  downloadCsvButton,
  tabButtons,
  initDOMRefs,
  // Modes
  modeRealtimeBtn, 
  modeHistoryBtn,
  modeAnalyticsBtn,
  // Views
  dashboardView, // kept for toggle
  // Admin & Config
  btnAdminSettings,
  adminAuthModal,
  btnCloseAdminAuth,
  adminAuthForm,
  adminPasswordInput,
  adminAuthError,
  sensorConfigModal,
  btnCloseConfig,
  btnViewSensors,
  btnAddSensorView,
  configViewList,
  configViewAdd,
  typeSelectEsp32,
  typeSelectWeather,
  addSensorForm,
  newSensorType,
  newSensorName,
  fieldCoords,
  newSensorLat,
  newSensorLon,
  
  // Inputs
  historyHoursInput,
  historyStartInput,
  historyEndInput,
  rangeSearchBtn,
  chartMode as initialChartMode,
  chartContainer,
  analyticsPanel
} from "./config.js";

import { fetchHourlyHistory, fetchRangeHistory } from "./api.js";
import { triggerCsvDownload, createLinearRegressionModel } from "./utils.js"; 
import {
  renderCurrentStats,
  renderDynamicDashboard,
  renderConfigSensors,
  initComparisonChart,
  updateChartRealTime,
  renderStaticChart, 
  switchTab,
  getVisibleChartData,
  renderAnalytics,
  renderDataLogTable 
} from "./ui.js";

// LOCAL STATE
let activeTab = "temperatura";
let chartMode = "realtime"; 
let cachedHistoryData = []; 
let currentLogFilter = { sensorId: 'all', sort: 'newest' }; 

// API CALLS
const fetchSensors = async () => {
    try {
        const res = await fetch('/api/sensors');
        const data = await res.json();
        
        // Update global storage
        // globalSensors.length = 0; // Clear
        // globalSensors.push(...data); // Refill matches const strictness? No, globalSensors is 'let' in config? exported let.
        // Actually importing 'let' is read-only in module. I need a setter or modify the array content.
        // To avoid complexity, I'll operate on the imported array by mutating it.
        globalSensors.splice(0, globalSensors.length, ...data); 
        
        renderDynamicDashboard(globalSensors);
        renderConfigSensors(globalSensors); // Update config list if open
        populateLogFilterSensors();
        initComparisonChart(activeTab, globalSensors);
        
        // Init sensorDataMap
        data.forEach(s => {
            if(!sensorDataMap[s.id]) sensorDataMap[s.id] = { temperatura: 0, humedad: 0 };
        });

    } catch (e) { console.error("Error fetching sensors:", e); }
};

const formatDateTimeInput = (val) => {
    if (!val) return null;
    return val.replace("T", " ") + ":00"; 
};

// PREDICTIONS
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
                <span>Living</span><span>Bed</span><span>Out</span>
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

// SSE STREAM

// Populate Sensor Filter Dropdown
const populateLogFilterSensors = () => {
    const select = document.getElementById('log-filter-sensor');
    if(!select) return;
    const current = select.value;
    select.innerHTML = '<option value="all">All Sensors</option>';
    globalSensors.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.text = s.name;
        select.appendChild(opt);
    });
    // Restore selection if still valid
    if(current && (current === 'all' || globalSensors.find(s=>s.id == current))) {
        select.value = current;
    }
};

// SSE STREAM

const setupStreamListener = () => {
  const eventSource = new EventSource("/stream-data");
  eventSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const timeString = msg.server_time || new Date().toLocaleTimeString("en-US");

      if (lastUpdateSpan) {
        lastUpdateSpan.textContent = `Updated: ${timeString}`;
        loadingSpinner.classList.add("hidden"); 
      }
      
      if (msg.sensor_id && msg.data) {
          const sId = msg.sensor_id;
          sensorDataMap[sId] = msg.data;
          
          // Update DOM Card
          const tEl = document.getElementById(`temp-sensor-${sId}`);
          const hEl = document.getElementById(`hum-sensor-${sId}`);
          
          const tempVal = parseFloat(msg.data.temperature);
          const humVal = parseFloat(msg.data.humidity);

          if(tEl) tEl.innerText = !isNaN(tempVal) ? `${tempVal.toFixed(1)}°` : "--°";
          if(hEl) hEl.innerText = !isNaN(humVal) ? `H: ${humVal.toFixed(1)}%` : "H: --%";
          
          // Filter Check & Log Update
          if(currentLogFilter.sensorId === 'all' || currentLogFilter.sensorId == sId) {
             const newData = {
                 ...msg.data,
                 timestamp: timeString, 
                 source: 'live'
             };
             cachedHistoryData.push(newData);
             renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
          }
      }

    } catch (e) { console.error("SSE Error", e); }
  };
};

// CENTRALIZED DATA LOADER
// CENTRALIZED DATA LOADER
const loadHistoryData = async () => {
    const hours = parseInt(historyHoursInput.value) || 12; 
    
    if(chartMode === 'history') document.getElementById("comparison-chart").style.opacity = "0.5";
    if(chartMode === 'analytics') document.getElementById("stat-total-samples").innerText = "...";

    try {
        const data = await fetchHourlyHistory(hours, currentLogFilter.sensorId);
        // Mark as DB source
        cachedHistoryData = data.map(d => ({ ...d, source: 'db' })); 

        if (chartMode === 'analytics') {
            renderAnalytics(cachedHistoryData, activeTab, globalSensors);
            renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
        } else if (chartMode === 'history') {
            renderStaticChart(cachedHistoryData, activeTab, globalSensors);
            renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
        } else {
            // Realtime mode
            renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
        }
    } catch (e) { console.error(e); }

    if(chartMode === 'history') document.getElementById("comparison-chart").style.opacity = "1";
};



// EVENTS
const setupEventListeners = () => {

    // DATA LOG FILTERS
    const filterSensor = document.getElementById('log-filter-sensor');
    const sortOrder = document.getElementById('log-sort-order');
    
    if(filterSensor) {
        filterSensor.addEventListener('change', (e) => {
            currentLogFilter.sensorId = e.target.value;
            loadHistoryData();
        });
    }
    if(sortOrder) {
        sortOrder.addEventListener('change', (e) => {
            currentLogFilter.sort = e.target.value;
            renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
        });
    }

  // TABS
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.tab !== activeTab) {
        activeTab = switchTab(button.dataset.tab);
        // Reload history logic... (simplified for now)
        initComparisonChart(activeTab, globalSensors);
        if(chartMode === 'history' || chartMode === 'analytics'){
             // Re-render with existing cache if valid
             if (cachedHistoryData.length > 0) {
                 if (chartMode === 'analytics') {
                    renderAnalytics(cachedHistoryData, activeTab, globalSensors);
                    renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
                 } else {
                     renderStaticChart(cachedHistoryData, activeTab, globalSensors);
                     renderDataLogTable(cachedHistoryData, globalSensors, currentLogFilter.sort);
                 }
             } else {
                 loadHistoryData();
             }
        }
      }
    });
  });

  // MODES
  if (modeRealtimeBtn) {
    modeRealtimeBtn.addEventListener("click", () => {
        chartMode = 'realtime';
        modeRealtimeBtn.className = "mode-tab-active px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        modeHistoryBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        
        document.getElementById("history-controls").classList.add("hidden");
        chartContainer.classList.remove("hidden");
        if(analyticsPanel) analyticsPanel.classList.add("hidden");
        
        initComparisonChart(activeTab, globalSensors);
    });
  }

  // ... History/Analytics Buttons (Simplified: Just UI toggle) ...
   if (modeHistoryBtn) {
    modeHistoryBtn.addEventListener("click", () => {
        chartMode = 'history';
        modeHistoryBtn.className = "mode-tab-active px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        modeRealtimeBtn.className = "mode-tab-inactive px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2";
        document.getElementById("history-controls").classList.remove("hidden");
        chartContainer.classList.remove("hidden");
        if(analyticsPanel) analyticsPanel.classList.add("hidden");
        
        loadHistoryData();
    });
  }
  
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


  // --- ADMIN & CONFIG ---
  if(btnAdminSettings) {
      btnAdminSettings.addEventListener('click', () => {
          adminAuthModal.classList.remove('hidden');
          adminPasswordInput.value = "";
          adminPasswordInput.focus();
      });
  }
  
  if(btnCloseAdminAuth) btnCloseAdminAuth.addEventListener('click', () => adminAuthModal.classList.add('hidden'));

  if(adminAuthForm) {
      adminAuthForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const pwd = adminPasswordInput.value;
          try {
              const res = await fetch('/api/config/auth', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ password: pwd })
              });
              const data = await res.json();
              if(data.success) {
                  adminAuthModal.classList.add('hidden');
                  sensorConfigModal.classList.remove('hidden');
                  renderConfigSensors(globalSensors);
              } else {
                  adminAuthError.classList.remove('hidden');
                  setTimeout(() => adminAuthError.classList.add('hidden'), 3000);
              }
          } catch(e) { console.error(e); }
      });
  }
  
  if(btnCloseConfig) btnCloseConfig.addEventListener('click', () => sensorConfigModal.classList.add('hidden'));

  // Config View Switcher
  const showList = () => {
      configViewList.classList.remove('hidden');
      configViewAdd.classList.add('hidden');
  };
  const showAdd = () => {
      configViewList.classList.add('hidden');
      configViewAdd.classList.remove('hidden');
  };

  if(btnViewSensors) btnViewSensors.addEventListener('click', showList);
  if(btnAddSensorView) btnAddSensorView.addEventListener('click', showAdd);

  // Add Sensor Type Select
  if(typeSelectEsp32) {
      typeSelectEsp32.addEventListener('click', () => {
          newSensorType.value = 'esp32';
          typeSelectEsp32.classList.replace('border-slate-700', 'border-cyan-500');
          typeSelectEsp32.classList.replace('text-slate-400', 'text-cyan-400');
          typeSelectEsp32.classList.replace('bg-slate-800/50', 'bg-cyan-500/10');
          
          typeSelectWeather.classList.replace('border-cyan-500', 'border-slate-700');
          typeSelectWeather.classList.replace('text-amber-400', 'text-slate-400');
          typeSelectWeather.classList.replace('bg-amber-500/10', 'bg-slate-800/50');
          
          fieldCoords.classList.add('hidden');
      });
  }
  if(typeSelectWeather) {
      typeSelectWeather.addEventListener('click', () => {
          newSensorType.value = 'openweather';
          typeSelectWeather.classList.replace('border-slate-700', 'border-amber-500'); 
          typeSelectWeather.classList.add('text-amber-400', 'bg-amber-500/10');
          typeSelectWeather.classList.remove('text-slate-400', 'bg-slate-800/50');

          typeSelectEsp32.classList.replace('border-cyan-500', 'border-slate-700');
          typeSelectEsp32.classList.replace('text-cyan-400', 'text-slate-400');
          typeSelectEsp32.classList.replace('bg-cyan-500/10', 'bg-slate-800/50');
          
          fieldCoords.classList.remove('hidden');
      });
  }

  // Submit New Sensor
  if(addSensorForm) {
      addSensorForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const payload = {
              name: newSensorName.value,
              type: newSensorType.value,
              lat: newSensorLat.value,
              lon: newSensorLon.value
          };
          
          try {
              const res = await fetch('/api/sensors', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
              });
              const data = await res.json();
              if(data.id) {
                  alert(`Sensor Created! Token: ${data.token || 'N/A'}`);
                  addSensorForm.reset();
                  showList();
                  fetchSensors(); // Refresh everything
              } else {
                  alert("Error creating sensor: " + data.error);
              }
          } catch(e) { console.error(e); }
      });
  }


  // DELEGATION FOR DELETE
  if(document.body) {
      document.body.addEventListener('click', async (e) => {
          const btn = e.target.closest('.btn-delete-sensor');
          if(btn) {
              const id = btn.dataset.id;
              if(confirm("Delete this sensor?")) {
                  await fetch(`/api/sensors/${id}`, { method: 'DELETE' });
                  fetchSensors();
              }
          }
      });
  }

  // SEARCH AND CSV (Keep simplified)
  if(rangeSearchBtn) rangeSearchBtn.addEventListener("click", loadHistoryData);
  if(downloadCsvButton) {
      downloadCsvButton.addEventListener("click", () => {
          const { headers, rows } = getVisibleChartData(globalSensors);
          if(headers && rows) {
            triggerCsvDownload(headers, rows, `sensor_data_${new Date().toISOString().slice(0,10)}.csv`);
          }
      });
  }

};

document.addEventListener("DOMContentLoaded", () => {
  initDOMRefs();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  setupEventListeners();
  setupStreamListener();
  
  fetchSensors(); // Load dynamic sensors
  
  // Start Realtime Chart Interval (1Hz)
  setInterval(() => {
      if(chartMode === 'realtime') {
          updateChartRealTime(activeTab, sensorDataMap);
      }
  }, 1000);
});