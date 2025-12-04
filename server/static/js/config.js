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
// Apuntamos a tu servidor local
export const OPENWEATHER_URL = "/api/weather/";

// ----------------------------------------------------------------------
// VARIABLES DE ESTADO GLOBALES
// ----------------------------------------------------------------------
export let realtimeData = {
  local: { temperatura: 0, humedad: 0 }, // Inicializamos en 0 para evitar nulls en la gráfica
  sala: { temperatura: 0, humedad: 0 },
  cuarto: { temperatura: 0, humedad: 0 },
};

// Array para guardar la historia real
export let historicalData = []; 

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

export let date1Input = null;
export let date2Input = null;
export let compareButton = null;
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

  date1Input = document.getElementById("date1-input");
  date2Input = document.getElementById("date2-input");
  compareButton = document.getElementById("compare-button");
  predictionDate = document.getElementById("prediction-date");
  predictButton = document.getElementById("predict-button");
  predictionResultsDiv = document.getElementById("prediction-results");
};