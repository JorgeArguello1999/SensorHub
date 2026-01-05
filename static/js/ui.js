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

  const isTemperature = dataType === "temperature";
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
/**
 * Update the chart in real-time
 * Should be called by an interval (e.g. every 1s)
 */
export const updateChartRealTime = (currentDataType, sensorDataMap) => {
  if (!myChart || chartMode !== 'realtime' || !sensorDataMap) return;

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // 1. Add new Label
  myChart.data.labels.push(timeLabel);

  // 2. Add data for each dataset
  myChart.data.datasets.forEach(ds => {
      const sId = ds.sensorId;
      const dataObj = sensorDataMap[sId]; 
      
      let val = null;
      if (dataObj) {
          val = currentDataType === "temperature" ? parseFloat(dataObj.temperature) : parseFloat(dataObj.humidity);
      }
      ds.data.push(val); // Push null if no data, or last value if you prefer hold
  });

  // 3. Shift if too long
  const MAX_POINTS = 30;
  if (myChart.data.labels.length > MAX_POINTS) {
    while(myChart.data.labels.length > MAX_POINTS) myChart.data.labels.shift();
    myChart.data.datasets.forEach((dataset) => {
        while(dataset.data.length > MAX_POINTS) dataset.data.shift();
    });
  }
  
  myChart.update('none'); 
};

/**
 * Render the static/api/history chart
 */
/**
 * Render the static/api/history chart
 */
export const renderStaticChart = (dataArray, currentDataType, globalSensors) => {
    if (!myChart) return;
    if (!globalSensors) return;

    // 1. Get unique sorted timestamps
    const timestamps = [...new Set(dataArray.map(d => d.timestamp))].sort();
    
    // 2. Prepare datasets
    const datasets = globalSensors.map(sensor => {
        const sensorReadings = dataArray.filter(d => d.sensor_id === sensor.id);
        const dataMap = new Map(sensorReadings.map(r => [r.timestamp, currentDataType === 'temperature' ? r.temperature : r.humidity]));
        
        // Fill data array aligned with timestamps
        const data = timestamps.map(ts => dataMap.has(ts) ? dataMap.get(ts) : null);
        
        let color = '#06b6d4'; // Default cyan
        if (sensor.type === 'openweather') color = '#fbbf24'; // Amber
        else if (sensor.name.toLowerCase().includes('bed')) color = '#10b981'; // Emerald
        
        return {
            label: sensor.name,
            data: data,
            borderColor: color,
            backgroundColor: color + '20', // Opacity
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            sensorId: sensor.id
        };
    });
    
    // Format labels
    const labels = timestamps.map(ts => {
        const parts = ts.split(' ');
        return parts.length > 1 ? parts[1].substring(0, 5) : ts; 
    });

    myChart.data.labels = labels;
    myChart.data.datasets = datasets;
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
  // Note: App.js re-inits chart after this returns
  return dataType; 
};

export const getVisibleChartData = () => {
    if (!myChart || !myChart.data.labels) return [];
    
    // Header
    const labels = myChart.data.labels;
    const datasets = myChart.data.datasets;
    const header = ["Time", ...datasets.map(d => d.label)];
    
    // Rows
    const rows = labels.map((time, i) => {
        const rowData = [time];
        datasets.forEach(ds => {
            // ds.data[i] might be null
            rowData.push(ds.data[i] !== null && ds.data[i] !== undefined ? ds.data[i] : "");
        });
        return rowData;
    });

    return { headers: header, rows: rows };
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

export const renderAnalytics = (data, dataType = 'temperature', globalSensors) => {
    
    if (!data || data.length === 0 || !globalSensors) {
        document.getElementById("stat-total-samples").textContent = "0";
        document.getElementById("outages-list").innerHTML = '<li class="text-xs text-slate-500 italic p-2">No data available.</li>';
        return;
    }

    const isTemp = dataType === 'temperature';
    const unit = isTemp ? "°" : "%";
    
    let allOutages = [];
    let statsPerSensor = [];
    const GAP_THRESHOLD_MS = 20 * 60 * 1000; 

    // Process per sensor
    globalSensors.forEach(sensor => {
        const sensorReadings = data.filter(d => d.sensor_id === sensor.id).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 1. Calculate Stats
        const values = sensorReadings.map(d => isTemp ? d.temperature : d.humidity).filter(v => v !== null);
        
        let stats = { min: 0, max: 0, avg: 0, std: 0, name: sensor.name, type: sensor.type };
        if (values.length > 0) {
            stats.min = Math.min(...values);
            stats.max = Math.max(...values);
            const sum = values.reduce((a, b) => a + b, 0);
            stats.avg = sum / values.length;
            stats.std = calculateStdDev(values, stats.avg);
        }
        statsPerSensor.push(stats);

        // 2. Detect Outages
        let previousTime = null;
        sensorReadings.forEach(d => {
            const time = new Date(d.timestamp.replace(" ", "T")).getTime();
            if (previousTime) {
                const diff = time - previousTime;
                if (diff > GAP_THRESHOLD_MS) {
                    allOutages.push({
                        sensor: sensor.name,
                        date: d.timestamp.split(' ')[0],
                        from: new Date(previousTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        to: new Date(time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        duration: Math.floor(diff / 60000)
                    });
                }
            }
            previousTime = time;
        });
    });

    // Update DOM
    const total = data.length;
    const outages = allOutages;
    document.getElementById("stat-total-samples").textContent = total;
    document.getElementById("stat-uptime").textContent = outages.length === 0 ? "100%" : (100 - (outages.length * 0.5)).toFixed(1) + "%"; 
    document.getElementById("stat-outages-count").textContent = outages.length;
    
    // Dynamic Summary Cards
    const container = document.getElementById("analytics-cards-container");
    if(container) {
        container.innerHTML = statsPerSensor.map(s => {
            const color = s.type === 'openweather' ? 'amber' : (s.name.toLowerCase().includes('bed') ? 'cyan' : 'emerald');
            return `
                <div class="bg-${color}-900/20 p-3 rounded-xl border border-${color}-500/20 col-span-2 md:col-span-1">
                    <span class="text-[10px] text-${color}-400 uppercase font-bold">Avg ${s.name.split(' ')[0]}</span>
                    <div class="text-xl md:text-2xl font-bold text-${color}-400 mt-1">${s.avg.toFixed(1)}${unit}</div>
                </div>
            `;
        }).join('');
    }
    
    // Dynamic Stats Table
    const tbody = document.getElementById("stats-minmax-body");
    tbody.innerHTML = statsPerSensor.map(s => `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2">
                <div class="w-2 h-2 rounded-full ${s.type==='openweather'?'bg-amber-500':'bg-cyan-500'}"></div>
                ${s.name}
            </td>
            <td class="text-right font-mono text-slate-300">${s.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${s.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-${s.type==='openweather'?'amber':'cyan'}-400 font-bold">${s.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${s.std.toFixed(2)}</td>
        </tr>
    `).join('');

    // Outages List
    const list = document.getElementById("outages-list");
    if (allOutages.length === 0) {
        list.innerHTML = `<li class="text-xs text-emerald-400/80 italic p-3 border border-dashed border-emerald-500/30 rounded-lg text-center bg-emerald-500/5">Stable Connection</li>`;
    } else {
        list.innerHTML = allOutages.slice(0, 10).map(o => `
            <li class="bg-rose-500/10 border border-rose-500/20 p-2 rounded flex justify-between items-center mb-2">
                <div>
                    <div class="text-[10px] text-rose-300 font-bold">${o.sensor} - ${o.date}</div>
                    <div class="text-xs text-slate-300 mt-0.5">${o.from} - ${o.to}</div>
                </div>
                <div class="text-right bg-rose-500/20 px-2 py-1 rounded">
                    <span class="block text-xs font-bold text-rose-400">${o.duration} min</span>
                </div>
            </li>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();

    renderAnalyticsBarChart(statsPerSensor, isTemp ? "Temperature" : "Humidity");
};

// Bar chart
const renderAnalyticsBarChart = (statsArray, labelType) => {
    const ctx = document.getElementById("analytics-chart").getContext("2d");
    
    if (analyticsChart) analyticsChart.destroy();

    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: statsArray.map(s => s.name),
            datasets: [
                {
                    label: 'Min',
                    data: statsArray.map(s => s.min),
                    backgroundColor: '#94a3b8',
                    borderRadius: 4,
                },
                {
                    label: 'Avg',
                    data: statsArray.map(s => s.avg),
                    backgroundColor: statsArray.map(s => s.type === 'openweather' ? '#fbbf24' : '#06b6d4'),
                    borderRadius: 4,
                },
                {
                    label: 'Max',
                    data: statsArray.map(s => s.max),
                    backgroundColor: '#cbd5e1',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#cbd5e1' } }
            },
            scales: {
                y: { grid: { color: "#33415520" }, ticks: { color: "#94a3b8" } },
                x: { grid: { display: false }, ticks: { color: "#94a3b8" } }
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

/**
 * DATA LOG RENDERER
 */
export const renderDataLogTable = (data, globalSensors, sortOrder = 'newest') => {
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody) return;
    
    // 1. Sort Data (Clone to avoid mutating cache logic if needed)
    let sortedData = [...data];
    
    const getVal = (d, key) => {
        // Handle different key names if API vs RT
        // We ensure data structure consistency in app.js before calling this
        return d[key] !== undefined && d[key] !== null ? parseFloat(d[key]) : -999;
    };

    switch(sortOrder) {
        case 'newest':
            // Time Descending (Newest First)
            sortedData.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
        case 'temp_desc':
            sortedData.sort((a,b) => getVal(b, 'temperature') - getVal(a, 'temperature'));
            break;
        case 'temp_asc':
            sortedData.sort((a,b) => getVal(a, 'temperature') - getVal(b, 'temperature'));
            break;
        case 'hum_desc':
            sortedData.sort((a,b) => getVal(b, 'humidity') - getVal(a, 'humidity'));
            break;
        case 'hum_asc':
            sortedData.sort((a,b) => getVal(a, 'humidity') - getVal(b, 'humidity'));
            break;
    }

    // 2. Render Limit (e.g. 100 rows for scrolling)
    const displayData = sortedData.slice(0, 100);

    if (displayData.length === 0) {
        tableBody.innerHTML = `<tr><td class="p-3 text-slate-500 italic text-center" colspan="5">No data matching filter</td></tr>`;
        return;
    }

    tableBody.innerHTML = displayData.map(row => {
        let color = "text-slate-400";
        // Resolve Sensor Name/Color
        let sensorName = row.sensor_name || 'Unknown';
        // If row doesn't have name (e.g. legacy), try to find in globalSensors
        const sensor = globalSensors.find(s => s.id === row.sensor_id);
        if(sensor) {
            sensorName = sensor.name;
            if(sensor.type === 'openweather') color = "text-amber-400";
            else if(sensor.name.toLowerCase().includes('bed')) color = "text-cyan-400";
            else color = "text-emerald-400";
        }
        
        const isLive = row.source === 'live';
        const sourceBadge = isLive 
            ? `<span class="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">LIVE</span>`
            : `<span class="bg-slate-700 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-white/10">DB</span>`;

        // Format values
        const tVal = row.temperature !== null ? parseFloat(row.temperature).toFixed(1) + '°' : '--';
        const hVal = row.humidity !== null ? parseFloat(row.humidity).toFixed(0) + '%' : '--';
        const tStr = row.timestamp.includes("T") ? row.timestamp.split("T")[1].substring(0,8) : (row.timestamp.split(" ").length > 1 ? row.timestamp.split(" ")[1] : row.timestamp);

        return `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors ${isLive ? 'bg-cyan-900/10' : ''}">
                <td class="p-3 ${color} font-bold">${sensorName}</td>
                <td class="p-3 text-right font-mono text-slate-300">${tVal}</td>
                <td class="p-3 text-right font-mono text-slate-300">${hVal}</td>
                <td class="p-3 text-right text-slate-500 font-mono text-xs">${tStr}</td>
                <td class="p-3 text-center">${sourceBadge}</td>
            </tr>
        `;
    }).join("");
};