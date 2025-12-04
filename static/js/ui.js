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
  historicalData,
  predictionResultsDiv,
} from "./config.js";

/**
 * Actualiza las tarjetas de estadísticas en tiempo real.
 */
export const renderCurrentStats = () => {
  // Actualizar la tarjeta Local (OpenWeatherMap)
  const localTemp = realtimeData.local.temperatura;
  const localHum = realtimeData.local.humedad;

  tempLocal.textContent =
    localTemp !== null ? `${localTemp.toFixed(1)}°` : "--°";
  humLocal.textContent =
    localHum !== null ? `Humedad: ${localHum.toFixed(1)}%` : "Humedad: --%";

  // Actualizar las tarjetas de Firebase
  tempSala.textContent = `${realtimeData.sala.temperatura.toFixed(1)}°`;
  humSala.textContent = `Humedad: ${realtimeData.sala.humedad.toFixed(1)}%`;

  tempCuarto.textContent = `${realtimeData.cuarto.temperatura.toFixed(1)}°`;
  humCuarto.textContent = `Humedad: ${realtimeData.cuarto.humedad.toFixed(1)}%`;
};

/**
 * Renderiza el gráfico de comparación (Líneas) basado en el tipo de dato.
 * @param {Array} data - Datos históricos.
 * @param {string} dataType - 'temperatura' o 'humedad'.
 */
export const renderComparisonChart = (data, dataType) => {
  if (comparisonChartInstance) {
    comparisonChartInstance.destroy();
  }

  const isTemperature = dataType === "temperatura";
  const unit = isTemperature ? "°C" : "%";
  const dataSuffix = isTemperature ? "_Temp" : "_Hum";
  const labelTitle = isTemperature ? "Temperatura" : "Humedad";

  const ctx = document.getElementById("comparison-chart").getContext("2d");
  // Se requiere que la variable global se actualice en el archivo principal
  // o se pase como una referencia mutable si se quisiera modificar aquí.
  // Por simplicidad, se deja la variable global como import y asumimos
  // que el principal mantendrá un registro del Chart.js instance.
  // **NOTA:** La instancia del gráfico debe manejarse en el archivo principal (`app.js`)
  // o se requiere una forma de actualizar la variable `comparisonChartInstance` exportada.
  // Por ahora, asumiremos que se manejará la referencia afuera o se reconstruirá.

  new Chart(ctx, { // **IMPORTANTE:** Aquí creamos una nueva instancia en lugar de intentar actualizar la referencia importada.
    type: "line",
    data: {
      labels: data.map((d) => d.hora),
      datasets: [
        {
          label: `${labelTitle} Local (Exterior)`,
          data: data.map((d) => d["Local" + dataSuffix]),
          borderColor: "#fbbf24",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
        },
        {
          label: `${labelTitle} Sala (Firebase)`,
          data: data.map((d) => d["Sala" + dataSuffix]),
          borderColor: "#10b981",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
        },
        {
          label: `${labelTitle} Cuarto (Firebase)`,
          data: data.map((d) => d["Cuarto" + dataSuffix]),
          borderColor: "#06b6d4",
          tension: 0.4,
          fill: false,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "#3341554d" }, ticks: { color: "#94a3b8" } },
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
 * Renderiza el gráfico de comparación histórica de fechas.
 */
export const renderHistoricalChart = (data1, data2, label1, label2) => {
  if (historicalChartInstance) {
    historicalChartInstance.destroy();
  }

  const ctx = document.getElementById("historical-chart").getContext("2d");
  // Similar a renderComparisonChart, creamos una nueva instancia.
  new Chart(ctx, {
    type: "line",
    data: {
      labels: data1.map((d) => d.hora),
      datasets: [
        {
          label: `Local ${label1}`,
          data: data1.map((d) => d.Local),
          borderColor: "#fbbf24",
          borderDash: [0, 0],
          tension: 0.4,
          fill: false,
        },
        {
          label: `Sala ${label1}`,
          data: data1.map((d) => d.Sala),
          borderColor: "#10b981",
          borderDash: [0, 0],
          tension: 0.4,
          fill: false,
        },
        {
          label: `Cuarto ${label1}`,
          data: data1.map((d) => d.Cuarto),
          borderColor: "#06b6d4",
          borderDash: [0, 0],
          tension: 0.4,
          fill: false,
        },
        {
          label: `Local ${label2}`,
          data: data2.map((d) => d.Local),
          borderColor: "#fbbf24",
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
        },
        {
          label: `Sala ${label2}`,
          data: data2.map((d) => d.Sala),
          borderColor: "#10b981",
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
        },
        {
          label: `Cuarto ${label2}`,
          data: data2.map((d) => d.Cuarto),
          borderColor: "#06b6d4",
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: "#3341554d" }, ticks: { color: "#94a3b8" } },
        y: {
          beginAtZero: false,
          grid: { color: "#3341554d" },
          ticks: { color: "#94a3b8" },
        },
      },
      plugins: {
        legend: { labels: { color: "#94a3b8", boxWidth: 15, padding: 8 } },
      },
    },
  });
};

/**
 * Maneja la lógica de cambio de pestaña (Temperatura/Humedad).
 * @param {string} dataType - 'temperatura' o 'humedad'.
 */
export const switchTab = (dataType) => {
  // 1. Manejar estilos de los botones
  tabButtons.forEach((button) => {
    if (button.dataset.tab === dataType) {
      button.classList.add("border-cyan-500", "text-cyan-400");
      button.classList.remove(
        "border-transparent",
        "text-slate-400",
        "hover:text-slate-300"
      );
    } else {
      button.classList.remove("border-cyan-500", "text-cyan-400");
      button.classList.add(
        "border-transparent",
        "text-slate-400",
        "hover:text-slate-300"
      );
    }
  });

  // 2. Renderizar el gráfico con los datos correspondientes
  if (historicalData.length > 0) {
    renderComparisonChart(historicalData, dataType);
  }

  // 3. (Importante) Devolvemos el nuevo valor para actualizar el estado global en app.js
  return dataType;
};

/**
 * Genera y muestra los resultados de la predicción simulada.
 */
export const generatePrediction = () => {
  predictionResultsDiv.innerHTML = "";

  const now = new Date();
  let htmlContent = "";

  for (let i = 1; i <= 4; i++) {
    const nextTime = new Date(now.getTime() + i * 3600000);
    const hourLabel = nextTime.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const predLocal =
      (realtimeData.local.temperatura ?? 15) + (Math.random() * 2 - 1);
    const predSala = realtimeData.sala.temperatura + (Math.random() * 2 - 1);
    const predCuarto =
      realtimeData.cuarto.temperatura + (Math.random() * 2 - 1);

    const predLocalHum =
      (realtimeData.local.humedad ?? 60) + (Math.random() * 5 - 2.5);
    const predSalaHum = realtimeData.sala.humedad + (Math.random() * 5 - 2.5);
    const predCuartoHum =
      realtimeData.cuarto.humedad + (Math.random() * 5 - 2.5);

    htmlContent += `
                    <div class="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                        <h4 class="text-lg font-bold text-cyan-300 mb-1">${hourLabel}</h4>
                        <div class="grid grid-cols-3 text-sm text-white font-medium">
                            <div>Local: <span class="text-red-400">${predLocal.toFixed(
                              1
                            )}°</span> / ${predLocalHum.toFixed(1)}%</div>
                            <div>Sala: <span class="text-green-400">${predSala.toFixed(
                              1
                            )}°</span> / ${predSalaHum.toFixed(1)}%</div>
                            <div>Cuarto: <span class="text-blue-400">${predCuarto.toFixed(
                              1
                            )}°</span> / ${predCuartoHum.toFixed(1)}%</div>
                        </div>
                    </div>
                `;
  }

  predictionResultsDiv.innerHTML = htmlContent;
};