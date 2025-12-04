// ui.js
import {
  realtimeData,
  comparisonChartInstance,
  historicalChartInstance,
  tempLocal,
  humLocal,
  tempSala,
  humSala,
  tempCuarto,
  humCuarto,
  tabButtons,
  currentChartDataType,
  predictionResultsDiv,
} from "./config.js";

// Variable local para mantener la instancia del gráfico
let myChart = null;

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
  
  // Si ya existe, lo destruimos para cambiar de configuración (Temp vs Hum)
  if (myChart) {
    myChart.destroy();
  }

  const isTemperature = dataType === "temperatura";
  const unit = isTemperature ? "°C" : "%";
  const labelTitle = isTemperature ? "Temperatura" : "Humedad";

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [], // Empieza vacío
      datasets: [
        {
          label: `${labelTitle} Local`,
          data: [],
          borderColor: "#fbbf24",
          backgroundColor: "#fbbf24",
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: `${labelTitle} Sala`,
          data: [],
          borderColor: "#10b981",
          backgroundColor: "#10b981",
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: `${labelTitle} Cuarto`,
          data: [],
          borderColor: "#06b6d4",
          backgroundColor: "#06b6d4",
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0 // Importante para que no haga "fade in" en cada punto
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
      plugins: { legend: { labels: { color: "#94a3b8" } } },
    },
  });
};

/**
 * ACTUALIZA el gráfico en tiempo real (Push & Shift).
 * Esta función inyecta el ÚLTIMO dato disponible.
 */
export const updateChartRealTime = (currentDataType) => {
  if (!myChart) return;

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // 1. Añadir etiqueta de tiempo al eje X
  myChart.data.labels.push(timeLabel);

  // 2. Determinar qué datos inyectar según la pestaña activa
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

  // 3. Añadir datos a los datasets correspondientes
  myChart.data.datasets[0].data.push(valLocal);
  myChart.data.datasets[1].data.push(valSala);
  myChart.data.datasets[2].data.push(valCuarto);

  // 4. MANTENER TAMAÑO FIJO (Efecto scroll)
  // Si hay más de 20 puntos, eliminamos el primero
  const MAX_POINTS = 20;
  if (myChart.data.labels.length > MAX_POINTS) {
    myChart.data.labels.shift(); // Quita la primera hora
    myChart.data.datasets.forEach((dataset) => {
      dataset.data.shift(); // Quita el primer dato
    });
  }

  // 5. Actualizar visualmente (sin animación de entrada para que se vea continuo)
  myChart.update('none'); 
};

// ... (El resto de funciones como renderHistoricalChart, switchTab, generatePrediction se mantienen igual, 
// SOLO modifica switchTab para llamar a initComparisonChart) ...

export const renderHistoricalChart = (data1, data2, label1, label2) => {
    // ... (Mismo código que tenías antes para el gráfico histórico de abajo)
    // Asegúrate de que este use una instancia diferente (historicalChartInstance)
    // Si necesitas el código completo de esto dímelo, pero asumo que se mantiene.
    if (historicalChartInstance) historicalChartInstance.destroy();
    // ... lógica de chart ...
};

export const switchTab = (dataType) => {
  // 1. Estilos de botones
  tabButtons.forEach((button) => {
    if (button.dataset.tab === dataType) {
      button.classList.add("border-cyan-500", "text-cyan-400");
      button.classList.remove("border-transparent", "text-slate-400");
    } else {
      button.classList.remove("border-cyan-500", "text-cyan-400");
      button.classList.add("border-transparent", "text-slate-400");
    }
  });

  // 2. REINICIALIZAR el gráfico principal con la nueva unidad
  // Esto borrará los datos viejos y empezará a graficar la nueva variable
  initComparisonChart(dataType);

  return dataType;
};

export const generatePrediction = () => {
    // ... (Mismo código de predicción)
};