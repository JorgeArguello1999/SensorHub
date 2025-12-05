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
  historyControls,
  chartMode
} from "./config.js";

// Variable local para mantener la instancia del gráfico
let myChart = null;
let historicalChartInstance = null; // Instancia para el gráfico de abajo (comparación fechas)

/**
 * Actualiza las tarjetas de estadísticas (Texto grande).
 */
export const renderCurrentStats = () => {
  const localTemp = realtimeData.local.temperatura;
  const localHum = realtimeData.local.humedad;

  // Actualizar tarjetas
  if (tempLocal) tempLocal.textContent = localTemp !== null ? `${localTemp.toFixed(1)}°` : "--°";
  if (humLocal) humLocal.textContent = localHum !== null ? `Humedad: ${localHum.toFixed(1)}%` : "Humedad: --%";
  
  if (tempSala) tempSala.textContent = `${realtimeData.sala.temperatura.toFixed(1)}°`;
  if (humSala) humSala.textContent = `Humedad: ${realtimeData.sala.humedad.toFixed(1)}%`;
  
  if (tempCuarto) tempCuarto.textContent = `${realtimeData.cuarto.temperatura.toFixed(1)}°`;
  if (humCuarto) humCuarto.textContent = `Humedad: ${realtimeData.cuarto.humedad.toFixed(1)}%`;
};

/**
 * INICIALIZA el gráfico vacío (Se llama una vez o al cambiar de pestaña).
 */
export const initComparisonChart = (dataType) => {
  const ctx = document.getElementById("comparison-chart").getContext("2d");
  
  if (myChart) {
    myChart.destroy();
  }

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
      animation: {
        duration: 0 
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: { 
            grid: { color: "#3341554d" }, 
            ticks: { color: "#94a3b8", maxRotation: 0, autoSkip: true } 
        },
        y: {
          beginAtZero: false,
          grid: { color: "#3341554d" },
          ticks: {
            color: "#94a3b8",
            callback: function (value) {
              return value.toFixed(1) + unit;
            },
          },
        },
      },
      plugins: { 
          legend: { labels: { color: "#94a3b8" } },
          tooltip: {
              mode: 'index',
              intersect: false
          }
      },
    },
  });
};

/**
 * ACTUALIZA el gráfico en tiempo real (Push & Shift).
 */
export const updateChartRealTime = (currentDataType) => {
  // GUARDIA: Si estamos en modo historia, NO actualizamos con datos del stream
  if (!myChart || chartMode === 'history') return;

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

  const MAX_POINTS = 20;
  if (myChart.data.labels.length > MAX_POINTS) {
    myChart.data.labels.shift();
    myChart.data.datasets.forEach((dataset) => {
      dataset.data.shift();
    });
  }

  myChart.update('none'); 
// --- AGREGAR ESTO PARA LA TABLA ---
  const tableBody = document.getElementById('data-table-body');
  if (tableBody) {
      const row = `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-3 text-slate-400">${timeLabel}</td>
            <td class="p-3 font-bold text-amber-500">${valLocal.toFixed(1)}°</td>
            <td class="p-3 font-bold text-emerald-500">${valSala.toFixed(1)}°</td>
            <td class="p-3 font-bold text-cyan-500">${valCuarto.toFixed(1)}°</td>
            <td class="p-3"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Ok</td>
        </tr>
      `;
      // Insertar al inicio y limitar a 5 filas
      tableBody.insertAdjacentHTML('afterbegin', row);
      if (tableBody.children.length > 5) tableBody.lastElementChild.remove();
  }
};

/**
 * NUEVO: PINTA EL HISTORIAL (Modo Por Horas).
 * Reemplaza todos los datos del gráfico con el array recibido de Flask.
 */
export const renderStaticChart = (dataArray, currentDataType) => {
    if (!myChart) return;

    // dataArray es el array "data" que viene de tu JSON
    // { "cuarto_temp": 14.8, "timestamp": "2025-12-05 02:49:13", ... }

    // 1. Extraemos etiquetas (Horas)
    const labels = dataArray.map(item => {
        // item.timestamp viene como "YYYY-MM-DD HH:MM:SS"
        const parts = item.timestamp.split(' ');
        const timePart = parts.length > 1 ? parts[1] : item.timestamp;
        // Cortamos para mostrar HH:MM
        return timePart.substring(0, 5); 
    });

    let dLocal, dSala, dCuarto;

    // 2. Extraemos valores según la pestaña activa
    if (currentDataType === "temperatura") {
        dLocal = dataArray.map(i => i.local_temp);
        dSala = dataArray.map(i => i.sala_temp);
        dCuarto = dataArray.map(i => i.cuarto_temp);
    } else {
        dLocal = dataArray.map(i => i.local_hum);
        dSala = dataArray.map(i => i.sala_hum);
        dCuarto = dataArray.map(i => i.cuarto_hum);
    }

    // 3. Actualizamos el gráfico completo
    myChart.data.labels = labels;
    myChart.data.datasets[0].data = dLocal;
    myChart.data.datasets[1].data = dSala;
    myChart.data.datasets[2].data = dCuarto;

    // Reactivamos animación suave al cargar el historial
    myChart.options.animation.duration = 1000; 
    
    myChart.update();
};

export const switchTab = (dataType) => {
  // 1. Estilos de botones (Temp vs Hum)
  tabButtons.forEach((button) => {
    if (button.dataset.tab === dataType) {
      button.classList.add("border-cyan-500", "text-cyan-400");
      button.classList.remove("border-transparent", "text-slate-400");
    } else {
      button.classList.remove("border-cyan-500", "text-cyan-400");
      button.classList.add("border-transparent", "text-slate-400");
    }
  });

  // 2. Reiniciamos gráfico. 
  // Nota: La lógica de si cargar historial o realtime se maneja en app.js
  initComparisonChart(dataType);

  return dataType; 
};

/**
 * NUEVO: Alterna visualmente los botones de modo.
 */
export const toggleModeUI = (mode) => {
    if(mode === 'realtime'){
        modeRealtimeBtn.classList.add('bg-slate-700', 'text-cyan-300');
        modeRealtimeBtn.classList.remove('text-slate-400', 'hover:text-white');
        
        modeHistoryBtn.classList.remove('bg-slate-700', 'text-cyan-300');
        modeHistoryBtn.classList.add('text-slate-400', 'hover:text-white');

        historyControls.classList.add('hidden');
    } else {
        modeHistoryBtn.classList.add('bg-slate-700', 'text-cyan-300');
        modeHistoryBtn.classList.remove('text-slate-400', 'hover:text-white');
        
        modeRealtimeBtn.classList.remove('bg-slate-700', 'text-cyan-300');
        modeRealtimeBtn.classList.add('text-slate-400', 'hover:text-white');

        historyControls.classList.remove('hidden');
    }
}

// ... Funciones existentes que no cambian (mocks para el gráfico de abajo) ...
export const renderHistoricalChart = (data1, data2, label1, label2) => {
    // Código para el gráfico de comparación por fechas (inferior)
    const ctx = document.getElementById("historical-chart").getContext("2d");
    if (historicalChartInstance) historicalChartInstance.destroy();
    
    historicalChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: data1.map(d => d.hora),
            datasets: [
                {
                    label: `${label1} (Sala)`,
                    data: data1.map(d => d.Sala),
                    borderColor: "#3b82f6",
                    tension: 0.4
                },
                {
                    label: `${label2} (Sala)`,
                    data: data2.map(d => d.Sala),
                    borderColor: "#a855f7",
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: "#cbd5e1" } } },
            scales: {
                y: { grid: { color: "#3341554d" }, ticks: { color: "#94a3b8" } },
                x: { grid: { color: "#3341554d" }, ticks: { color: "#94a3b8" } }
            }
        }
    });
};

export const generatePrediction = () => {
    // Mock de predicción
    const div = document.getElementById("prediction-results");
    div.innerHTML = `
        <div class="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
            <span class="text-slate-300">Próxima hora</span>
            <span class="text-orange-400 font-bold">15.2°C <span class="text-xs text-slate-500">tendencia subida</span></span>
        </div>
        <div class="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
            <span class="text-slate-300">En 3 horas</span>
            <span class="text-orange-400 font-bold">14.8°C <span class="text-xs text-slate-500">estable</span></span>
        </div>
    `;
};

/**
 * NUEVO: Extrae los datos visibles en el gráfico para el CSV
 */
export const getVisibleChartData = () => {
    if (!myChart) return [];

    const labels = myChart.data.labels; // Timestamps
    const datasetLocal = myChart.data.datasets[0].data;
    const datasetSala = myChart.data.datasets[1].data;
    const datasetCuarto = myChart.data.datasets[2].data;

    // Mapeamos a un formato filas: [Tiempo, ValorLocal, ValorSala, ValorCuarto]
    const rows = labels.map((label, index) => {
        return [
            label,
            datasetLocal[index],
            datasetSala[index],
            datasetCuarto[index]
        ];
    });

    return rows;
};