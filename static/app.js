// ----------------------------------------------------------------------
// LÓGICA DE JAVASCRIPT PLANO
// ----------------------------------------------------------------------

// Variables de estado
let locationState = "Ambato";
let dataState = [];
let loadingState = false;
let lastUpdateState = null;
let errorState = null;
let intervalId = null;

// Referencias del DOM
const locationInput = document.getElementById("location-input");
const refreshButton = document.getElementById("refresh-button");
const refreshIcon = document.getElementById("refresh-icon");
const lastUpdateSpan = document.getElementById("last-update");
const errorMessageDiv = document.getElementById("error-message");
const endpointLocationSpan = document.getElementById("endpoint-location");
const currentStatsContainer = document.getElementById(
  "current-stats-container"
);

// Instancias de Chart.js
let barChartInstance = null;
let lineChartInstance = null;

/**
 * Simula la generación de datos de temperatura (últimas 12 horas).
 */
const generateMockData = () => {
  const hours = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    hours.push({
      hora: time.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      Ambiente: parseFloat((18 + Math.random() * 4).toFixed(1)), // API
      Cuarto: parseFloat((20 + Math.random() * 3).toFixed(1)), // ESP32
      Exterior: parseFloat((16 + Math.random() * 5).toFixed(1)), // Sensor
    });
  }
  return hours;
};

/**
 * Simula la llamada a la API para obtener los datos.
 */
const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    // *** PUNTO CLAVE PARA INTEGRACIÓN FLASK ***
    // Aquí es donde en un entorno real harías:
    // const response = await fetch(`/api/temperatures?location=${encodeURIComponent(locationState)}`);
    // const jsonData = await response.json();
    // setData(jsonData.data);

    // Simulación con datos falsos:
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simula latencia de red
    const mockData = generateMockData();
    setData(mockData);
    setLastUpdate(new Date().toLocaleTimeString("es-EC"));
  } catch (err) {
    console.error("Error en fetchData:", err);
    setError("Error al obtener datos");
  } finally {
    setLoading(false);
  }
};

// ----------------------------------------------------------------------
// Funciones de actualización de estado (similares a setState/useEffect)
// ----------------------------------------------------------------------

const setLoading = (isLoading) => {
  loadingState = isLoading;
  refreshButton.disabled = isLoading;
  if (isLoading) {
    refreshIcon.classList.add("animate-spin");
  } else {
    refreshIcon.classList.remove("animate-spin");
  }
};

const setError = (message) => {
  errorState = message;
  errorMessageDiv.innerHTML = message
    ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">${message}</div>`
    : "";
};

const setLastUpdate = (time) => {
  lastUpdateState = time;
  lastUpdateSpan.textContent = time ? `Última actualización: ${time}` : "";
};

const setLocation = (newLocation) => {
  locationState = newLocation;
  locationInput.value = newLocation;
  endpointLocationSpan.textContent = newLocation;
  // Cuando la ubicación cambia, se reinicia la carga de datos
  fetchData();
  // Reiniciar el intervalo
  clearInterval(intervalId);
  intervalId = setInterval(fetchData, 300000); // 5 minutos
};

const setData = (newData) => {
  dataState = newData;
  renderCurrentStats(newData);
  renderBarChart(newData);
  renderLineChart(newData);
};

// ----------------------------------------------------------------------
// Funciones de renderizado
// ----------------------------------------------------------------------

/**
 * Calcula la diferencia de temperatura para las tarjetas.
 */
const calculateDiff = (temp1, temp2) => {
  const diff = temp1 - temp2;
  return diff > 0 ? `+${diff.toFixed(1)}°` : `${diff.toFixed(1)}°`;
};

/**
 * Renderiza las tarjetas de temperatura actual.
 */
const renderCurrentStats = (data) => {
  if (data.length === 0) {
    currentStatsContainer.classList.add("hidden");
    return;
  }
  currentStatsContainer.classList.remove("hidden");

  const currentStats = {
    ambiente: data[data.length - 1]["Ambiente"],
    cuarto: data[data.length - 1]["Cuarto"],
    exterior: data[data.length - 1]["Exterior"],
  };

  // Ambiente
  document.getElementById(
    "temp-ambiente"
  ).textContent = `${currentStats.ambiente.toFixed(1)}°`;
  document.getElementById("diff-ambiente").textContent = `${calculateDiff(
    currentStats.ambiente,
    currentStats.cuarto
  )} vs cuarto`;

  // Mi Cuarto
  document.getElementById(
    "temp-cuarto"
  ).textContent = `${currentStats.cuarto.toFixed(1)}°`;

  // Exterior
  document.getElementById(
    "temp-exterior"
  ).textContent = `${currentStats.exterior.toFixed(1)}°`;
  document.getElementById("diff-exterior").textContent = `${calculateDiff(
    currentStats.exterior,
    currentStats.cuarto
  )} vs cuarto`;
};

/**
 * Renderiza el gráfico de barras con Chart.js.
 */
const renderBarChart = (data) => {
  if (barChartInstance) {
    barChartInstance.destroy();
  }
  if (data.length === 0) return;

  const ctx = document.getElementById("bar-chart").getContext("2d");
  const labels = data.map((d) => d.hora);

  barChartInstance = new Chart(ctx, {
    type: "bar",
    plugins: [Chart.plugins.register(Chart.plugins.Gradient)], // Registrar el plugin de gradiente
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ambiente",
          data: data.map((d) => d.Ambiente),
          backgroundColor: "rgba(251, 191, 36, 0.8)", // Amarillo
          borderColor: "rgba(251, 191, 36, 1)",
          borderWidth: 1,
          borderRadius: 8,
          gradient: {
            type: "vertical",
            colors: ["rgba(251, 191, 36, 0.9)", "rgba(251, 191, 36, 0.6)"],
          },
        },
        {
          label: "Cuarto",
          data: data.map((d) => d.Cuarto),
          backgroundColor: "rgba(6, 182, 212, 0.9)", // Cian
          borderColor: "rgba(6, 182, 212, 1)",
          borderWidth: 1,
          borderRadius: 8,
          gradient: {
            type: "vertical",
            colors: ["rgba(6, 182, 212, 1)", "rgba(6, 182, 212, 0.7)"],
          },
        },
        {
          label: "Exterior",
          data: data.map((d) => d.Exterior),
          backgroundColor: "rgba(16, 185, 129, 0.8)", // Verde
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          borderRadius: 8,
          gradient: {
            type: "vertical",
            colors: ["rgba(16, 185, 129, 0.9)", "rgba(16, 185, 129, 0.6)"],
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: "#3341554d", drawBorder: false }, // Gris oscuro con baja opacidad
          ticks: { color: "#94a3b8" },
        },
        y: {
          beginAtZero: false,
          grid: { color: "#3341554d" },
          ticks: { color: "#94a3b8" },
          title: { display: true, text: "Temperatura (°C)", color: "#94a3b8" },
        },
      },
      plugins: {
        legend: { labels: { color: "#94a3b8" } },
        tooltip: {
          backgroundColor: "#1e293b",
          borderColor: "#334155",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: "#fff",
          cornerRadius: 12,
        },
      },
    },
  });
};

/**
 * Renderiza el gráfico de líneas con Chart.js.
 */
const renderLineChart = (data) => {
  if (lineChartInstance) {
    lineChartInstance.destroy();
  }
  if (data.length === 0) return;

  const ctx = document.getElementById("line-chart").getContext("2d");
  const labels = data.map((d) => d.hora);

  lineChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ambiente",
          data: data.map((d) => d.Ambiente),
          borderColor: "#fbbf24", // Amarillo
          backgroundColor: "transparent",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#fbbf24",
          borderWidth: 2,
        },
        {
          label: "Cuarto",
          data: data.map((d) => d.Cuarto),
          borderColor: "#06b6d4", // Cian
          backgroundColor: "transparent",
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#06b6d4",
          borderWidth: 3,
        },
        {
          label: "Exterior",
          data: data.map((d) => d.Exterior),
          borderColor: "#10b981", // Verde
          backgroundColor: "transparent",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#10b981",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: "#3341554d", drawBorder: false },
          ticks: { color: "#94a3b8" },
        },
        y: {
          beginAtZero: false,
          grid: { color: "#3341554d" },
          ticks: { color: "#94a3b8" },
        },
      },
      plugins: {
        legend: { labels: { color: "#94a3b8" } },
        tooltip: {
          backgroundColor: "#1e293b",
          borderColor: "#334155",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: "#fff",
          cornerRadius: 12,
        },
      },
    },
  });
};

// ----------------------------------------------------------------------
// Inicialización y Event Listeners
// ----------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Reemplaza los iconos de Lucide
  lucide.createIcons();

  // Carga inicial de datos
  fetchData();

  // Establece el intervalo de actualización (5 minutos)
  intervalId = setInterval(fetchData, 300000);

  // Event Listener para el botón de actualizar
  refreshButton.addEventListener("click", fetchData);

  // Event Listener para el input de ubicación
  locationInput.addEventListener("change", (e) => {
    setLocation(e.target.value);
  });
  locationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      setLocation(e.target.value);
    }
  });
});
