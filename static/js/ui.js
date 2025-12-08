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
  historyControls,
  chartMode
} from "./config.js";

// Variables para instancias de gráficos
let myChart = null;           
let analyticsChart = null;    

/**
 * Actualiza las tarjetas de estadísticas (Texto grande, panel superior).
 */
export const renderCurrentStats = () => {
  const localTemp = realtimeData.local.temperatura;
  const localHum = realtimeData.local.humedad;

  if (tempLocal) tempLocal.textContent = localTemp !== null ? `${localTemp.toFixed(1)}°` : "--°";
  if (humLocal) humLocal.textContent = localHum !== null ? `H: ${localHum.toFixed(1)}%` : "H: --%";
  
  if (tempSala) tempSala.textContent = `${realtimeData.sala.temperatura.toFixed(1)}°`;
  if (humSala) humSala.textContent = `H: ${realtimeData.sala.humedad.toFixed(1)}%`;
  
  if (tempCuarto) tempCuarto.textContent = `${realtimeData.cuarto.temperatura.toFixed(1)}°`;
  if (humCuarto) humCuarto.textContent = `H: ${realtimeData.cuarto.humedad.toFixed(1)}%`;
};

/**
 * INICIALIZA el gráfico de líneas (Vivo/Historial)
 */
export const initComparisonChart = (dataType) => {
  const ctx = document.getElementById("comparison-chart").getContext("2d");
  if (myChart) myChart.destroy();

  const isTemperature = dataType === "temperatura";
  const unit = isTemperature ? "°C" : "%";
  const labelTitle = isTemperature ? "Temperatura" : "Humedad";

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [], 
      datasets: [
        {
          label: `${labelTitle} Local`,
          data: [],
          borderColor: "#fbbf24", // Amber
          backgroundColor: "#fbbf24",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
        },
        {
          label: `${labelTitle} Sala`,
          data: [],
          borderColor: "#10b981", // Emerald
          backgroundColor: "#10b981",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
        },
        {
          label: `${labelTitle} Cuarto`,
          data: [],
          borderColor: "#06b6d4", // Cyan
          backgroundColor: "#06b6d4",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
        },
      ],
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
 * ACTUALIZA el gráfico en tiempo real
 */
export const updateChartRealTime = (currentDataType) => {
  if (!myChart || chartMode !== 'realtime') return;

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  myChart.data.labels.push(timeLabel);

  let valLocal, valSala, valCuarto;

  if (currentDataType === "temperatura") {
    valLocal = realtimeData.local.temperatura;
    valSala = realtimeData.sala.temperatura;
    valCuarto = realtimeData.cuarto.temperatura;
  } else {
    valLocal = realtimeData.local.humedad;
    valSala = realtimeData.sala.humedad;
    valCuarto = realtimeData.cuarto.humedad;
  }

  myChart.data.datasets[0].data.push(valLocal);
  myChart.data.datasets[1].data.push(valSala);
  myChart.data.datasets[2].data.push(valCuarto);

  if (myChart.data.labels.length > 20) {
    myChart.data.labels.shift();
    myChart.data.datasets.forEach((dataset) => dataset.data.shift());
  }
  myChart.update('none'); 
};

/**
 * PINTA EL HISTORIAL (Gráfico Estático)
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
 * LÓGICA DE ANALÍTICA (SOPORTA TEMP Y HUMEDAD)
 * =========================================================================
 */

const calculateStdDev = (arr, mean) => {
    if(arr.length === 0) return 0;
    return Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / arr.length);
};

// AHORA RECIBE dataType ('temperatura' o 'humedad')
export const renderAnalytics = (data, dataType = 'temperatura') => {
    
    if (!data || data.length === 0) {
        document.getElementById("stat-total-samples").textContent = "0";
        document.getElementById("outages-list").innerHTML = '<li class="text-xs text-slate-500 italic p-2">Sin datos para analizar.</li>';
        return;
    }

    // 1. Configuración Dinámica según Tipo
    const isTemp = dataType === 'temperatura';
    const unit = isTemp ? "°" : "%";
    // Sufijos de las llaves en el objeto data (ej: sala_temp vs sala_hum)
    const suffix = isTemp ? "_temp" : "_hum"; 

    // 2. Inicialización
    let salaVals = [], cuartoVals = [], localVals = [];
    let outages = [];
    let previousTime = null;
    const GAP_THRESHOLD_MS = 20 * 60 * 1000; 

    // 3. Procesamiento
    data.forEach(d => {
        // Acceso dinámico a propiedades: d['sala_temp'] o d['sala_hum']
        const valSala = d[`sala${suffix}`];
        const valCuarto = d[`cuarto${suffix}`];
        const valLocal = d[`local${suffix}`];

        if (valSala !== null) salaVals.push(valSala);
        if (valCuarto !== null) cuartoVals.push(valCuarto);
        if (valLocal !== null) localVals.push(valLocal);

        // Detección de Cortes (Independiente del tipo de dato, usa Timestamp)
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

    // 4. Estadísticas
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

    // 5. Renderizado KPIs
    document.getElementById("stat-total-samples").textContent = total;
    // Uptime simplificado
    document.getElementById("stat-uptime").textContent = outages.length === 0 ? "100%" : (100 - (outages.length * 0.5)).toFixed(1) + "%"; 
    document.getElementById("stat-outages-count").textContent = outages.length;
    
    // Promedios con UNIDAD dinámica
    document.getElementById("avg-sala-display").textContent = sStats.avg.toFixed(1) + unit;
    document.getElementById("avg-cuarto-display").textContent = cStats.avg.toFixed(1) + unit;
    document.getElementById("avg-local-display").textContent = lStats.avg.toFixed(1) + unit;

    // 6. Tabla Detallada
    const tbody = document.getElementById("stats-minmax-body");
    tbody.innerHTML = `
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-emerald-500"></div>Sala</td>
            <td class="text-right font-mono text-slate-300">${sStats.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${sStats.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-emerald-400 font-bold">${sStats.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${sStats.std.toFixed(2)}</td>
        </tr>
        <tr class="border-b border-white/5 hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-cyan-500"></div>Cuarto</td>
            <td class="text-right font-mono text-slate-300">${cStats.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${cStats.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-cyan-400 font-bold">${cStats.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${cStats.std.toFixed(2)}</td>
        </tr>
        <tr class="hover:bg-white/5">
            <td class="py-3 pl-2 flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-amber-500"></div>Exterior</td>
            <td class="text-right font-mono text-slate-300">${lStats.min.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-slate-300">${lStats.max.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-amber-400 font-bold">${lStats.avg.toFixed(1)}${unit}</td>
            <td class="text-right font-mono text-xs text-slate-500">±${lStats.std.toFixed(2)}</td>
        </tr>
    `;

    // 7. Lista Cortes
    const list = document.getElementById("outages-list");
    if (outages.length === 0) {
        list.innerHTML = `<li class="text-xs text-emerald-400/80 italic p-3 border border-dashed border-emerald-500/30 rounded-lg text-center bg-emerald-500/5">
            <i data-lucide="check-circle" class="w-4 h-4 mx-auto mb-1"></i>
            Conexión Estable
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

    // 8. Gráfico de Barras con Etiqueta Correcta
    renderAnalyticsBarChart(sStats, cStats, lStats, isTemp ? "Temperatura" : "Humedad");
};

// Gráfico de Barras Comparativo
const renderAnalyticsBarChart = (s, c, l, labelType) => {
    const ctx = document.getElementById("analytics-chart").getContext("2d");
    
    if (analyticsChart) analyticsChart.destroy();

    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sala', 'Cuarto', 'Exterior'],
            datasets: [
                {
                    label: 'Mín',
                    data: [s.min, c.min, l.min],
                    backgroundColor: '#94a3b8',
                    borderRadius: 4,
                },
                {
                    label: 'Prom',
                    data: [s.avg, c.avg, l.avg],
                    backgroundColor: ['#10b981', '#06b6d4', '#fbbf24'],
                    borderRadius: 4,
                },
                {
                    label: 'Máx',
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
                            return context.dataset.label + ': ' + context.parsed.y + (labelType === "Temperatura" ? "°C" : "%");
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