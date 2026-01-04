// config.js

// ----------------------------------------------------------------------
// FIREBASE CONFIGURATION
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// FIREBASE CONFIGURATION REMOVED - Using Redis Backend
// ----------------------------------------------------------------------
// export const firebaseConfig = { ... }; // Removed


// ----------------------------------------------------------------------
// LOCAL API CONFIG (FLASK)
// ----------------------------------------------------------------------
export const OPENWEATHER_URL = "/api/weather/";

// ----------------------------------------------------------------------
// GLOBAL STATE VARIABLES
// ----------------------------------------------------------------------
export let realtimeData = {
  local: { temperatura: 0, humedad: 0 },
  sala: { temperatura: 0, humedad: 0 },
  cuarto: { temperatura: 0, humedad: 0 },
};

// Chart/view state
export let chartMode = "realtime"; 
export let historyHours = 2;       

export let comparisonChartInstance = null;
export let currentChartDataType = "temperatura"; 

// --- USER STATE (New) ---

export let userSensors = [
    { id: 1, name: "Living Room Node", location: "sala", token: "esp32_token_sala_01", status: "active" },
    { id: 2, name: "Bedroom Node", location: "cuarto", token: "esp32_token_cuarto_02", status: "active" }
];

// ----------------------------------------------------------------------
// DOM REFERENCES
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

// Mode controls
export let modeRealtimeBtn = null;
export let modeHistoryBtn = null;
export let modeAnalyticsBtn = null;

export let historyControls = null;
export let historyHoursInput = null;

// Range controls (dates)
export let historyStartInput = null;
export let historyEndInput = null;
export let rangeSearchBtn = null;

// Views (Panels)
export let chartContainer = null;
export let analyticsPanel = null;
export let dashboardView = null; // New Main View
export let sensorManagementView = null; // New Management View

// Auth & Sensors (New)

export let sensorListContainer = null;
export let btnAddSensor = null;

// Prediction controls
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

  modeRealtimeBtn = document.getElementById("mode-realtime");
  modeHistoryBtn = document.getElementById("mode-history");
  modeAnalyticsBtn = document.getElementById("mode-analytics");

  historyControls = document.getElementById("history-controls");
  historyHoursInput = document.getElementById("history-hours-input");
  
  historyStartInput = document.getElementById("history-start");
  historyEndInput = document.getElementById("history-end");
  rangeSearchBtn = document.getElementById("mode-range-search");

  // Views
  chartContainer = document.getElementById("chart-container");
  analyticsPanel = document.getElementById("analytics-panel");
  
  // New Views Refs
  dashboardView = document.getElementById("dashboard-view");
  sensorManagementView = document.getElementById("sensor-management-view");

  // New Auth Refs

  
  // New Sensor Mgmt Refs
  sensorListContainer = document.getElementById("sensor-list-container");
  btnAddSensor = document.getElementById("btn-add-sensor");

  predictionDate = document.getElementById("prediction-date");
  predictButton = document.getElementById("predict-button");
  predictionResultsDiv = document.getElementById("prediction-results");
};