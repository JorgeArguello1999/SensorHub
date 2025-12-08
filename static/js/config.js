// config.js

// ----------------------------------------------------------------------
// CONFIGURACIÓN FIREBASE
// ----------------------------------------------------------------------
export const firebaseConfig = {
  databaseURL: "https://esp32-firebase-69994-default-rtdb.firebaseio.com/",
};

// ----------------------------------------------------------------------
// CONFIGURACIÓN API LOCAL (FLASK)
// ----------------------------------------------------------------------
export const OPENWEATHER_URL = "/api/weather/";

// ----------------------------------------------------------------------
// VARIABLES DE ESTADO GLOBALES
// ----------------------------------------------------------------------
export let realtimeData = {
  local: { temperatura: 0, humedad: 0 },
  sala: { temperatura: 0, humedad: 0 },
  cuarto: { temperatura: 0, humedad: 0 },
};

// Estado del gráfico principal
export let chartMode = "realtime"; // 'realtime' o 'history'
export let historyHours = 2;       // Horas por defecto para historial

export let comparisonChartInstance = null;
export let historicalChartInstance = null;
export let currentChartDataType = "temperatura"; 

// ----------------------------------------------------------------------
// REFERENCIAS DOM 
// ----------------------------------------------------------------------
export let loadingSpinner = null;
export let lastUpdateSpan = null;
export let errorMessageDiv = null;
export let downloadCsvButton = null;
export let tabButtons = null;

export let tempLocal = null;
export let humLocal = null;
export let tempSala = null;
export let humSala = null;
export let tempCuarto = null;
export let humCuarto = null;

// Controles de Modo
export let modeRealtimeBtn = null;
export let modeHistoryBtn = null;
export let historyControls = null;
export let historyHoursInput = null;

// --- NUEVOS: Controles de Rango ---
export let historyStartInput = null;
export let historyEndInput = null;
export let rangeSearchBtn = null;

// Controles Predicción
export let predictionDate = null;
export let predictButton = null;
export let predictionResultsDiv = null;

export const initDOMRefs = () => {
  loadingSpinner = document.getElementById("loading-spinner");
  lastUpdateSpan = document.getElementById("last-update");
  errorMessageDiv = document.getElementById("error-message");
  downloadCsvButton = document.getElementById("download-csv-button");
  tabButtons = document.querySelectorAll(".tab-button");

  tempLocal = document.getElementById("temp-local");
  humLocal = document.getElementById("hum-local");
  tempSala = document.getElementById("temp-sala");
  humSala = document.getElementById("hum-sala");
  tempCuarto = document.getElementById("temp-cuarto");
  humCuarto = document.getElementById("hum-cuarto");

  // Referencias Modo
  modeRealtimeBtn = document.getElementById("mode-realtime");
  modeHistoryBtn = document.getElementById("mode-history");
  historyControls = document.getElementById("history-controls");
  historyHoursInput = document.getElementById("history-hours-input");
  
  // --- INICIALIZAR NUEVOS CONTROLES ---
  historyStartInput = document.getElementById("history-start");
  historyEndInput = document.getElementById("history-end");
  rangeSearchBtn = document.getElementById("mode-range-search");

  predictionDate = document.getElementById("prediction-date");
  predictButton = document.getElementById("predict-button");
  predictionResultsDiv = document.getElementById("prediction-results");
};