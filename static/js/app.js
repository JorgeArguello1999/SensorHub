// app.js

import {
  loadingSpinner,
  lastUpdateSpan,
  realtimeData,
  historicalData,
  date1Input,
  date2Input,
  compareButton,
  predictionDate,
  predictButton,
  downloadCsvButton,
  tabButtons,
  initDOMRefs,
} from "./config.js";

import { fetchOpenWeatherMapData, dataRef } from "./api.js"; // función API y referencia a Firebase
import {
  setError,
  generateHistoricalData,
  generateMockHistoryForDate,
  downloadCsv,
} from "./utils.js"; // Importa utilidades

import {
  renderCurrentStats,
  renderComparisonChart,
  renderHistoricalChart,
  switchTab,
  generatePrediction, // Renombrada de `generatePrediction` en ui.js para evitar conflictos
} from "./ui.js"; // Importa funciones de UI/Renderizado

// Estado local (no reasignamos imports)
let currentChartDataType = "temperatura";

// ----------------------------------------------------------------------
// GESTIÓN DE FIREBASE Y DATOS
// ----------------------------------------------------------------------

/**
 * Actualiza los datos de OpenWeatherMap y la UI.
 */
const updateOpenWeatherMap = async () => {
  // fetchOpenWeatherMapData ya actualiza `realtimeData.local` internamente.
  const openWeatherData = await fetchOpenWeatherMapData();

  // Si el listener de Firebase está activo, `setupFirebaseListener`
  // llamará a `renderCurrentStats` y `renderComparisonChart` en el próximo tick.
  // Si no, la llamamos aquí para que la tarjeta local se actualice inmediatamente.
  if (openWeatherData) {
    renderCurrentStats();
  }
};

/**
 * Configura el listener principal de Firebase.
 */
const setupFirebaseListener = () => {
  if (!dataRef) {
    setError("Error: No se pudo conectar a la base de datos de Firebase.");
    loadingSpinner.classList.add("hidden");
    return;
  }

  dataRef.on(
    "value",
    (snapshot) => {
      loadingSpinner.classList.add("hidden");

      const data = snapshot.val();

      if (!data) {
        setError("No hay datos disponibles en Firebase.");
        renderCurrentStats();
        return;
      }

      // 1. Actualizar estado global (realtimeData)
      realtimeData.sala = {
        temperatura: parseFloat(data.sala?.temperatura || 0),
        humedad: parseFloat(data.sala?.humedad || 0),
      };
      realtimeData.cuarto = {
        temperatura: parseFloat(data.cuarto?.temperatura || 0),
        humedad: parseFloat(data.cuarto?.humedad || 0),
      };

      // 2. Generar y actualizar datos históricos
      historicalData.length = 0; // Limpiar el array
      historicalData.push(...generateHistoricalData(realtimeData));

      // 3. Actualizar UI
      renderCurrentStats();
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
// GESTIÓN DE EVENTOS
// ----------------------------------------------------------------------

const setupEventListeners = () => {
  // Pestañas (Tabs)
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const newDataType = button.dataset.tab;
      // Actualizamos el estado global de la pestaña y re-renderizamos
      currentChartDataType = switchTab(newDataType);
    });
  });

  // Comparación por Fecha
  compareButton.addEventListener("click", () => {
    const hist1 = generateMockHistoryForDate();
    const hist2 = generateMockHistoryForDate();
    renderHistoricalChart(
      hist1,
      hist2,
      date1Input.value,
      date2Input.value
    );
  });

  // Predicción
  predictButton.addEventListener("click", generatePrediction);

  // Descarga CSV
  downloadCsvButton.addEventListener("click", downloadCsv);
};

// ----------------------------------------------------------------------
// INICIALIZACIÓN
// ----------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar referencias DOM
  initDOMRefs();

  // Asegúrate de que `lucide` esté cargado globalmente (si lo usas)
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
  }

  setupFirebaseListener();
  updateOpenWeatherMap();
  // Actualizar OpenWeatherMap cada 60 segundos
  setInterval(updateOpenWeatherMap, 60000);

  // Configurar fechas iniciales
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  date1Input.value = yesterday;
  date2Input.value = today;
  predictionDate.value = today;

  // Renderizar comparación histórica inicial (Mock Data)
  const hist1 = generateMockHistoryForDate();
  const hist2 = generateMockHistoryForDate();
  renderHistoricalChart(hist1, hist2, yesterday, today);

  // Configurar listeners de eventos
  setupEventListeners();

  // Asegurar que se renderice la pestaña inicial de 'temperatura'
  // El `switchTab` de `ui.js` maneja los estilos y el renderizado inicial.
  currentChartDataType = switchTab("temperatura");
});