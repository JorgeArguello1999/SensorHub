// ----------------------------------------------------------------------
// CONFIGURACIÓN FIREBASE
// ----------------------------------------------------------------------
const firebaseConfig = {
  databaseURL: "https://esp32-firebase-69994-default-rtdb.firebaseio.com/",
};

let app;
try {
  app = firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Error al inicializar Firebase.", e);
}
const db = app.database();
const dataRef = db.ref("/");

// ----------------------------------------------------------------------
// CONFIGURACIÓN OPENWEATHERMAP
// ----------------------------------------------------------------------
const OPENWEATHER_API_KEY = "157973ff5bf045a8c66f1b4d7eab78aa";
const LATITUDE = -1.27442;
const LONGITUDE = -78.638786;
const OPENWEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&APPID=${OPENWEATHER_API_KEY}`;

// ----------------------------------------------------------------------
// VARIABLES GLOBALES
// ----------------------------------------------------------------------
let realtimeData = {
  local: { temperatura: null, humedad: null },
  sala: { temperatura: 0, humedad: 0 },
  cuarto: { temperatura: 0, humedad: 0 },
};
let historicalData = [];
let comparisonChartInstance = null;
let historicalChartInstance = null;
let currentChartDataType = "temperatura"; // NUEVA variable para controlar la pestaña activa

// Referencias DOM
const loadingSpinner = document.getElementById("loading-spinner");
const lastUpdateSpan = document.getElementById("last-update");
const errorMessageDiv = document.getElementById("error-message");
const downloadCsvButton = document.getElementById("download-csv-button");
const tabButtons = document.querySelectorAll(".tab-button"); // NUEVO: botones de pestaña

// Tarjetas y el resto de los elementos DOM... (sin cambios)
const tempLocal = document.getElementById("temp-local");
const humLocal = document.getElementById("hum-local");
const tempSala = document.getElementById("temp-sala");
const humSala = document.getElementById("hum-sala");
const tempCuarto = document.getElementById("temp-cuarto");
const humCuarto = document.getElementById("hum-cuarto");

const date1Input = document.getElementById("date1-input");
const date2Input = document.getElementById("date2-input");
const compareButton = document.getElementById("compare-button");
const predictionDate = document.getElementById("prediction-date");
const predictButton = document.getElementById("predict-button");
const predictionResultsDiv = document.getElementById("prediction-results");

// ----------------------------------------------------------------------
// FUNCIONES DE UTILIDAD
// ----------------------------------------------------------------------
const setError = (message) => {
  errorMessageDiv.innerHTML = message
    ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">${message}</div>`
    : "";
};

const generateHistoricalData = () => {
  const data = [];
  const now = new Date();
  // Simular las últimas 12 horas
  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    const localTemp = realtimeData.local.temperatura ?? 15;
    const localHum = realtimeData.local.humedad ?? 60;

    data.push({
      hora: time.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
      }),

      // Almacenamos ambos valores para que el gráfico los use.
      Local_Temp: localTemp + (Math.random() * 2 - 1),
      Sala_Temp: realtimeData.sala.temperatura + (Math.random() * 2 - 1),
      Cuarto_Temp: realtimeData.cuarto.temperatura + (Math.random() * 2 - 1),

      Local_Hum: localHum + (Math.random() * 5 - 2.5),
      Sala_Hum: realtimeData.sala.humedad + (Math.random() * 5 - 2.5),
      Cuarto_Hum: realtimeData.cuarto.humedad + (Math.random() * 5 - 2.5),
    });
  }
  return data;
};

const generateMockHistoryForDate = () => {
  // Datos simulados para la comparación histórica
  const data = [];
  for (let h = 0; h < 24; h++) {
    data.push({
      hora: `${h.toString().padStart(2, "0")}:00`,
      Local: 18 + Math.random() * 5,
      Sala: 19 + Math.random() * 4,
      Cuarto: 20 + Math.random() * 3,
    });
  }
  return data;
};

// Función de API (sin cambios)
const fetchOpenWeatherMapData = async () => {
  try {
    const response = await fetch(OPENWEATHER_URL);
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    const tempKelvin = data.main.temp;
    const tempCelsius = tempKelvin - 273.15;
    const humidity = data.main.humidity;
    return { temperatura: tempCelsius, humedad: humidity };
  } catch (error) {
    setError(`Error al obtener datos de OpenWeatherMap: ${error.message}`);
    console.error("OpenWeatherMap Fetch Error:", error);
    return null;
  }
};

// ----------------------------------------------------------------------
// RENDERIZADO DE UI
// ----------------------------------------------------------------------
const renderCurrentStats = () => {
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
const renderComparisonChart = (data, dataType) => {
  if (comparisonChartInstance) {
    comparisonChartInstance.destroy();
  }

  const isTemperature = dataType === "temperatura";
  const unit = isTemperature ? "°C" : "%";
  const dataSuffix = isTemperature ? "_Temp" : "_Hum";
  const labelTitle = isTemperature ? "Temperatura" : "Humedad";

  const ctx = document.getElementById("comparison-chart").getContext("2d");
  comparisonChartInstance = new Chart(ctx, {
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
              return value.toFixed(1) + unit; // Añadir unidad a las etiquetas del eje Y
            },
          },
        },
      },
      plugins: { legend: { labels: { color: "#94a3b8" } } },
    },
  });
};

const renderHistoricalChart = (data1, data2, label1, label2) => {
  if (historicalChartInstance) {
    historicalChartInstance.destroy();
  }
  // Mantenemos esta función simple ya que solo tiene datos de temperatura simulados por ahora
  const ctx = document.getElementById("historical-chart").getContext("2d");
  historicalChartInstance = new Chart(ctx, {
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

// ----------------------------------------------------------------------
// LÓGICA DE PESTAÑAS (NUEVA)
// ----------------------------------------------------------------------
const switchTab = (dataType) => {
  currentChartDataType = dataType;

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
};

// ----------------------------------------------------------------------
// FUNCIÓN DE DESCARGA CSV (MODIFICADA para incluir Humedad)
// ----------------------------------------------------------------------
const downloadCsv = () => {
  if (historicalData.length === 0) {
    alert("No hay datos históricos para descargar.");
    return;
  }

  // 1. Cabeceras del CSV (Añadidas columnas de Humedad)
  const header =
    "Hora,Local Temp (°C),Local Hum (%),Sala Temp (°C),Sala Hum (%),Cuarto Temp (°C),Cuarto Hum (%)\n";

  // 2. Mapeo de datos
  const csvData = historicalData
    .map((item) => {
      return [
        item.hora,
        item.Local_Temp.toFixed(2),
        item.Local_Hum.toFixed(2),
        item.Sala_Temp.toFixed(2),
        item.Sala_Hum.toFixed(2),
        item.Cuarto_Temp.toFixed(2),
        item.Cuarto_Hum.toFixed(2),
      ].join(",");
    })
    .join("\n");

  const finalCsv = header + csvData;

  // 3. Crear el blob y forzar la descarga
  const blob = new Blob([finalCsv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `datos_historicos_temp_hum_${new Date().toISOString().slice(0, 10)}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ----------------------------------------------------------------------
// FUNCIÓN DE ACTUALIZACIÓN DE OPENWEATHERMAP
// ----------------------------------------------------------------------
const updateOpenWeatherMap = async () => {
  const openWeatherData = await fetchOpenWeatherMapData();

  if (openWeatherData) {
    realtimeData.local.temperatura = openWeatherData.temperatura;
    realtimeData.local.humedad = openWeatherData.humedad;

    // Si el listener de Firebase ya está activo, no necesitamos llamar a renderCurrentStats,
    // ya que generateHistoricalData se encargará de esto en el próximo tick,
    // pero lo mantenemos para el caso de una actualización aislada.
    renderCurrentStats();
  }
};

// ----------------------------------------------------------------------
// FIREBASE LISTENER
// ----------------------------------------------------------------------
const setupFirebaseListener = () => {
  dataRef.on(
    "value",
    async (snapshot) => {
      loadingSpinner.classList.add("hidden");

      const data = snapshot.val();

      if (!data) {
        setError("No hay datos disponibles en Firebase.");
        renderCurrentStats();
        return;
      }

      // Obtener Datos de Firebase (Sala y Cuarto)
      realtimeData.sala = {
        temperatura: parseFloat(data.sala?.temperatura || 0),
        humedad: parseFloat(data.sala?.humedad || 0),
      };
      realtimeData.cuarto = {
        temperatura: parseFloat(data.cuarto?.temperatura || 0),
        humedad: parseFloat(data.cuarto?.humedad || 0),
      };

      // Actualizar UI y Gráficos
      historicalData = generateHistoricalData();

      renderCurrentStats();
      // Renderizar el gráfico con la pestaña actualmente seleccionada
      renderComparisonChart(historicalData, currentChartDataType);
      lastUpdateSpan.textContent = new Date().toLocaleTimeString("es-EC");
      setError(null);
    },
    (error) => {
      loadingSpinner.classList.add("hidden");
      setError(`Error de Firebase: ${error.code}`);
      console.error("Firebase error:", error);
    }
  );
};

// ----------------------------------------------------------------------
// PREDICCIÓN CON HORAS (Sin cambios en lógica)
// ----------------------------------------------------------------------
const generatePrediction = () => {
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

// ----------------------------------------------------------------------
// INICIALIZACIÓN
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  setupFirebaseListener();
  updateOpenWeatherMap();
  setInterval(updateOpenWeatherMap, 60000);

  // Configurar fechas iniciales
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  date1Input.value = yesterday;
  date2Input.value = today;
  predictionDate.value = today;

  // Renderizar comparación inicial (Mock Data)
  const hist1 = generateMockHistoryForDate();
  const hist2 = generateMockHistoryForDate();
  renderHistoricalChart(hist1, hist2, yesterday, today);

  // --- EVENT LISTENERS ---

  // Pestañas (Tabs)
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dataType = button.dataset.tab;
      switchTab(dataType);
    });
  });
  // Asegurar que se renderice la pestaña inicial de 'temperatura'
  switchTab("temperatura");

  // Comparación por Fecha
  compareButton.addEventListener("click", () => {
    const newHist1 = generateMockHistoryForDate();
    const newHist2 = generateMockHistoryForDate();
    renderHistoricalChart(
      newHist1,
      newHist2,
      date1Input.value,
      date2Input.value
    );
  });

  // Predicción
  predictButton.addEventListener("click", generatePrediction);

  // Descarga CSV
  downloadCsvButton.addEventListener("click", downloadCsv);
});
