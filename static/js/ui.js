// ui.js
import {
  realtimeData,
  tempLocal,
  humLocal,
  tempSala,
  humSala,
  tempCuarto,
  humCuarto,
  tabButtons,
  modeRealtimeBtn,
  modeHistoryBtn,
  modeAnalyticsBtn,
  chartMode,
  // New imports
  configSensorList,
  sensorListContainer,
  adminAuthError
} from "./config.js";

// Variables for chart instances
let myChart = null;           
let analyticsChart = null;    

/**
 * Render list of sensors in Config Modal
 */
export const renderConfigSensors = (sensors) => {
    configSensorList.innerHTML = "";
    if (sensors.length === 0) {
        configSensorList.innerHTML = `<div class="text-center text-slate-500 py-4">No sensors found. Add one!</div>`;
        return;
    }

    sensors.forEach(s => {
        const div = document.createElement('div');
        div.className = "bg-slate-800 p-4 rounded-xl border border-white/5 flex justify-between items-center";
        
        const typeIcon = s.type === 'esp32' ? 'cpu' : 'cloud-sun';
        const typeColor = s.type === 'esp32' ? 'text-cyan-400' : 'text-amber-400';
        
        let details = "";
        if (s.type === 'esp32') {
             details = `<div class="text-[10px] text-slate-500 font-mono mt-1">Token: ...${s.token.slice(-6)}</div>`;
        } else {
             details = `<div class="text-[10px] text-slate-500 font-mono mt-1">${s.lat}, ${s.lon}</div>`;
        }

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-2 bg-slate-900 rounded-lg">
                    <i data-lucide="${typeIcon}" class="w-5 h-5 ${typeColor}"></i>
                </div>
                <div>
                    <h4 class="font-bold text-white text-sm">${s.name}</h4>
                    ${details}
                </div>
            </div>
            <button class="btn-delete-sensor p-2 text-slate-500 hover:text-rose-400 transition-colors" data-id="${s.id}">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        configSensorList.appendChild(div);
    });
    
    // Re-init icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
};
export const renderCurrentStats = () => {
  // Deprecated for dynamic, but kept for compatibility during transition
};

export const renderDynamicDashboard = (sensors) => {
    const grid = document.querySelector("#dashboard-view .grid");
    if(!grid) return;
    
    // Clear existing hardcoded cards if we have sensors
    // We assume the first grid is the sensor cards grid
    grid.innerHTML = "";

    sensors.forEach(s => {
        const typeColor = s.type === 'openweather' ? 'amber' : (s.name.includes("Bed") ? 'cyan' : 'emerald');
        const icon = s.type === 'openweather' ? 'cloud-sun' : 'cpu';
        
        const card = document.createElement('div');
        // Using generic color classes might be tricky if not in tailwind safelist, 
        // effectively we can stick to rotation or random, but let's default to cyan for ESP32 generic
        let colorClass = 'cyan';
        if(s.type === 'openweather') colorClass = 'amber';
        
        card.className = `glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-${colorClass}-500/30 transition-all`;
        
        card.innerHTML = `
            <div class="absolute -right-6 -top-6 w-24 h-24 bg-${colorClass}-500/10 rounded-full blur-2xl group-hover:bg-${colorClass}-500/20 transition-all"></div>
            <div class="flex justify-between items-start mb-2">
                <div class="flex flex-col">
                    <span class="text-xs font-semibold text-${colorClass}-400 uppercase tracking-wider">${s.name}</span>
                    <span class="text-[10px] text-slate-500">${s.type === 'openweather' ? 'OpenWeather' : 'Sensor Node'}</span>
                </div>
                <i data-lucide="${icon}" class="text-${colorClass}-400 w-5 h-5"></i>
            </div>
            <div class="flex items-end gap-3">
                <h2 id="temp-sensor-${s.id}" class="text-4xl font-bold text-white">--°</h2>
                <span id="hum-sensor-${s.id}" class="mb-1 text-sm font-medium text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">H: --%</span>
            </div>
        `;
        grid.appendChild(card);
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

/**
 * Initialize the comparison line chart (Live / History)
 */
/**
 * Initialize the comparison line chart (Live / History)
 */
export const initComparisonChart = (dataType, sensors) => {
  const ctx = document.getElementById("comparison-chart").getContext("2d");
  if (myChart) myChart.destroy();

  if(!sensors) return;

  const isTemperature = dataType === "temperatura";
  const unit = isTemperature ? "°C" : "%";
  
  // Dynamic Datasets
  const datasets = sensors.map((s, index) => {
      // Pick a color from a palette
      const colors = ["#fbbf24", "#10b981", "#06b6d4", "#a855f7", "#ef4444", "#3b82f6"];
      const color = colors[index % colors.length];
      
      return {
          label: s.name,
          data: [],
          borderColor: color,
          backgroundColor: color,
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          sensorId: s.id // Custom prop to identify
      };
  });

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [], 
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { color: "#3341554d" }, ticks: { color: "#94a3b8", maxRotation: 0, autoSkip: true } },
        y: {
          beginAtZero: false,
          grid: { color: "#3341554d" },
          ticks: { color: "#94a3b8", callback: (val) => val.toFixed(1) + unit },
        },
      },
      plugins: { 
          legend: { labels: { color: "#94a3b8" } },
          tooltip: { mode: 'index', intersect: false }
      },
    },
  });
};

/**
 * Update the chart in real-time
 */
export const updateChartRealTime = (currentDataType, sensorDataMap) => {
  if (!myChart || chartMode !== 'realtime' || !sensorDataMap) return;

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Only add label if it's new (simple verify)
  if (myChart.data.labels.length === 0 || myChart.data.labels[myChart.data.labels.length - 1] !== timeLabel) {
      myChart.data.labels.push(timeLabel);
  }

  // Iterate datasets and find matching data in sensorDataMap (keyed by ID)
  myChart.data.datasets.forEach(ds => {
      const sId = ds.sensorId;
      const dataObj = sensorDataMap[sId]; // Ex: { temperatura: 22, humedad: 50 }
      
      let val = null;
      if (dataObj) {
          val = currentDataType === "temperatura" ? dataObj.temperatura : dataObj.humedad;
      }
      
      // If we pushed a new label, we MUST push a value to every dataset to keep them aligned
      // If no new data came in this second, we can repeat last value or push null (gaps)
      // For smooth lines, repeating last known value is often better, or push null for gaps.
      // Let's assume we push null if no data.
      
      // Check if we already pushed for this timestamp? Chart.js is array based.
      // If labels length > data length, push.
      if (myChart.data.labels.length > ds.data.length) {
          ds.data.push(val);
      } else {
          // Update last point?
          // No, usually we tick once per interval. 
          // But here we rely on incoming SSE events which might be sporadic.
          // Better strategy: SSE updates a local state `sensorDataMap`, and a Interval updates the chart every 1s.
          // BUT, to keep changes minimal, let's assume this is called on a Interval.
          
          // Wait, the original code called `updateChartRealTime` inside SSE onmessage.
          // That means it updated for EVERY message. That's bad for multiple sensors (updates X times).
          // We will refactor `app.js` to use an Interval for chart updates.
      }
  });

  if (myChart.data.labels.length > 20) {
    while(myChart.data.labels.length > 20) myChart.data.labels.shift();
    myChart.data.datasets.forEach((dataset) => {
        while(dataset.data.length > 20) dataset.data.shift();
    });
  }
  myChart.update('none'); 
};

/**
 * Render the static/api/history chart
 */
export const renderStaticChart = (dataArray, currentDataType) => {
    if (!myChart) return;

    const labels = dataArray.map(item => {
        const parts = item.timestamp.split(' ');
        return parts.length > 1 ? parts[1].substring(0, 5) : item.timestamp; 
    });

    let dLocal, dSala, dCuarto;

    if (currentDataType === "temperatura") {
        dLocal = dataArray.map(i => i.local_temp);
        dSala = dataArray.map(i => i.sala_temp);
        dCuarto = dataArray.map(i => i.cuarto_temp);
    } else {
        dLocal = dataArray.map(i => i.local_hum);
        dSala = dataArray.map(i => i.sala_hum);
        dCuarto = dataArray.map(i => i.cuarto_hum);
    }

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = dLocal;
    myChart.data.datasets[1].data = dSala;
    myChart.data.datasets[2].data = dCuarto;
    myChart.options.animation.duration = 1000; 
    myChart.update();
};

export const switchTab = (dataType) => {
  tabButtons.forEach((button) => {
    if (button.dataset.tab === dataType) {
      button.classList.add("border-cyan-500", "text-cyan-400");
      button.classList.remove("border-transparent", "text-slate-400");
    } else {
      button.classList.remove("border-cyan-500", "text-cyan-400");
      button.classList.add("border-transparent", "text-slate-400");
    }
  });
  initComparisonChart(dataType);
  return dataType; 
};

export const getVisibleChartData = () => {
    if (!myChart) return [];
    const labels = myChart.data.labels;
    const datasetLocal = myChart.data.datasets[0].data;
    const datasetSala = myChart.data.datasets[1].data;
    const datasetCuarto = myChart.data.datasets[2].data;

    return labels.map((label, index) => [label, datasetLocal[index], datasetSala[index], datasetCuarto[index]]);
};

/**
 * =========================================================================
 * ANALYTICS LOGIC
 * =========================================================================
 */

const calculateStdDev = (arr, mean) => {
    if(arr.length === 0) return 0;
    return Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / arr.length);
};

export const renderAnalytics = (data, dataType = 'temperatura') => {
    
    if (!data || data.length === 0) {
        document.getElementById("stat-total-samples").textContent = "0";
        document.getElementById("outages-list").innerHTML = '<li class="text-xs text-slate-500 italic p-2">No data available.</li>';
        return;
    }

    const isTemp = dataType === 'temperatura';
    const unit = isTemp ? "°" : "%";
    const suffix = isTemp ? "_temp" : "_hum"; 

    let salaVals = [], cuartoVals = [], localVals = [];
    let outages = [];
    let previousTime = null;
    const GAP_THRESHOLD_MS = 20 * 60 * 1000; 

    data.forEach(d => {
        const valSala = d[`sala${suffix}`];
        const valCuarto = d[`cuarto${suffix}`];
        const valLocal = d[`local${suffix}`];

        if (valSala !== null) salaVals.push(valSala);
        if (valCuarto !== null) cuartoVals.push(valCuarto);
        if (valLocal !== null) localVals.push(valLocal);

        const safeDateStr = d.timestamp.replace(" ", "T");
        const currentTime = new Date(safeDateStr).getTime();
        
        if (previousTime) {
            const diff = currentTime - previousTime;
            if (diff > GAP_THRESHOLD_MS) {
                const durationMinutes = Math.floor(diff / 60000);
                outages.push({
                    date: d.timestamp.split(' ')[0],
                    from: new Date(previousTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    to: new Date(currentTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    duration: durationMinutes
                });
            }
        }
        previousTime = currentTime;
    });

    const total = data.length;

    const getStats = (arr) => {
        if (arr.length === 0) return { min: 0, max: 0, avg: 0, std: 0 };
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        const sum = arr.reduce((a, b) => a + b, 0);
        const avg = sum / arr.length;
        const std = calculateStdDev(arr, avg);
        return { min, max, avg, std };
    };

    const sStats = getStats(salaVals);
    const cStats = getStats(cuartoVals);
    const lStats = getStats(localVals);

    document.getElementById("stat-total-samples").textContent = total;
    document.getElementById("stat-uptime").textContent = outages.length === 0 ? "100%" : (100 - (outages.length * 0.5)).toFixed(1) + "%"; 
    document.getElementById("stat-outages-count").textContent = outages.length;
    
    document.getElementById("avg-sala-display").textContent = sStats.avg.toFixed(1) + unit;
    document.getElementById("avg-cuarto-display").textContent = cStats.avg.toFixed(1) + unit;
    document.getElementById("avg-local-display").textContent = lStats.avg.toFixed(1) + unit;

    const tbody = document.getElementById("stats-minmax-body");
    tbody.innerHTML = `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div>Living</td>
            <td class="text-right font-mono text-slate-300">${sStats.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${sStats.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-emerald-400 font-bold">${sStats.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${sStats.std.toFixed(2)}</td>
        </tr>
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-500"></div>Bedroom</td>
            <td class="text-right font-mono text-slate-300">${cStats.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${cStats.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-cyan-400 font-bold">${cStats.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${cStats.std.toFixed(2)}</td>
        </tr>
        <tr class="hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-amber-500"></div>Outdoor</td>
            <td class="text-right font-mono text-slate-300">${lStats.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${lStats.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-amber-400 font-bold">${lStats.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${lStats.std.toFixed(2)}</td>
        </tr>
    `;

    const list = document.getElementById("outages-list");
    if (outages.length === 0) {
        list.innerHTML = `<li class="text-xs text-emerald-400/80 italic p-3 border border-dashed border-emerald-500/30 rounded-lg text-center bg-emerald-500/5">
            <i data-lucide="check-circle" class="w-4 h-4 mx-auto mb-1"></i>
            Stable Connection
        </li>`;
    } else {
        list.innerHTML = outages.map(o => `
            <li class="bg-rose-500/10 border border-rose-500/20 p-2 rounded flex justify-between items-center mb-2">
                <div>
                    <div class="text-[10px] text-rose-300 font-bold flex items-center gap-1"><i data-lucide="zap-off" class="w-3 h-3"></i> ${o.date}</div>
                    <div class="text-xs text-slate-300 mt-0.5">${o.from} - ${o.to}</div>
                </div>
                <div class="text-right bg-rose-500/20 px-2 py-1 rounded">
                    <span class="block text-xs font-bold text-rose-400">${o.duration} min</span>
                </div>
            </li>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();

    renderAnalyticsBarChart(sStats, cStats, lStats, isTemp ? "Temperature" : "Humidity");
};

// Bar chart
const renderAnalyticsBarChart = (s, c, l, labelType) => {
    const ctx = document.getElementById("analytics-chart").getContext("2d");
    
    if (analyticsChart) analyticsChart.destroy();

    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Living', 'Bedroom', 'Outdoor'],
            datasets: [
                {
                    label: 'Min',
                    data: [s.min, c.min, l.min],
                    backgroundColor: '#94a3b8',
                    borderRadius: 4,
                },
                {
                    label: 'Avg',
                    data: [s.avg, c.avg, l.avg],
                    backgroundColor: ['#10b981', '#06b6d4', '#fbbf24'],
                    borderRadius: 4,
                },
                {
                    label: 'Max',
                    data: [s.max, c.max, l.max],
                    backgroundColor: '#cbd5e1',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#cbd5e1', font: {size: 10} } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + (labelType === "Temperature" ? "°C" : "%");
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: false, 
                    grid: { color: "#33415520" },
                    ticks: { color: "#94a3b8" } 
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: "#94a3b8" } 
                }
            }
        }
    });
};

/**
 * =========================================================================
 * NEW UI FUNCTIONS: SENSOR MGMT & AUTH
 * =========================================================================
 */





// Generate UUID-like token
const generateToken = () => {
    return 'esp32_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
};

// Render Sensor List
export const renderSensorList = () => {
    if (!sensorListContainer) return;
    
    sensorListContainer.innerHTML = ""; 

    if (userSensors.length === 0) {
        sensorListContainer.innerHTML = `<div class="text-center p-8 text-slate-500 italic">No sensors configured. Add one to start.</div>`;
        return;
    }

    userSensors.forEach(sensor => {
        const row = document.createElement('div');
        row.className = "bg-slate-800/50 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-cyan-500/30 transition-all mb-3";
        
        row.innerHTML = `
            <div class="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                <div class="bg-slate-700 p-3 rounded-lg">
                    <i data-lucide="cpu" class="w-6 h-6 text-cyan-400"></i>
                </div>
                <div class="flex-1">
                    <input type="text" value="${sensor.name}" class="bg-transparent border-b border-transparent hover:border-slate-500 focus:border-cyan-500 text-white font-bold focus:outline-none transition-colors w-full" placeholder="Sensor Name">
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">${sensor.status}</span>
                        <input type="text" value="${sensor.location}" class="bg-transparent text-xs text-slate-500 font-mono focus:text-white focus:outline-none w-24" placeholder="loc_id">
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div class="flex flex-col items-end mr-4">
                    <label class="text-[10px] text-slate-400 uppercase font-bold mb-1">Auth Token</label>
                    <div class="flex items-center gap-2 group/token cursor-pointer" onclick="navigator.clipboard.writeText('${sensor.token}')">
                        <code class="bg-slate-900 px-2 py-1 rounded text-xs text-slate-300 font-mono border border-white/5 group-hover/token:text-cyan-300 transition-colors">
                            ${sensor.token.substring(0, 12)}...
                        </code>
                        <i data-lucide="copy" class="w-3 h-3 text-slate-500 group-hover/token:text-cyan-400"></i>
                    </div>
                </div>
                <button class="btn-delete-sensor p-2 text-slate-400 hover:text-rose-400 transition-colors border border-transparent hover:border-rose-500/20 hover:bg-rose-500/10 rounded-lg" data-id="${sensor.id}">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        sensorListContainer.appendChild(row);
    });

    // Delete Logic
    document.querySelectorAll('.btn-delete-sensor').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            // Visual removal
            e.currentTarget.closest('div.bg-slate-800\\/50').remove();
            // In real app, remove from array/db
        });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
};