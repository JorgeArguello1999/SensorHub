// config.js

// ----------------------------------------------------------------------
// CONFIGURACIÓN FIREBASE
// ----------------------------------------------------------------------
export const firebaseConfig = {
  databaseURL: "https://esp32-firebase-69994-default-rtdb.firebaseio.com/",
};

// ----------------------------------------------------------------------
// CONFIGURACIÓN OPENWEATHERMAP
// ----------------------------------------------------------------------
export const OPENWEATHER_API_KEY = "157973ff5bf045a8c66f1b4d7eab78aa";
export const LATITUDE = -1.27442;
export const LONGITUDE = -78.638786;
export const OPENWEATHER_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&APPID=${OPENWEATHER_API_KEY}`;

// ----------------------------------------------------------------------
// VARIABLES DE ESTADO GLOBALES
// ----------------------------------------------------------------------
export let realtimeData = {
  local: { temperatura: null, humedad: null },
  sala: { temperatura: 0, humedad: 0 },
  cuarto: { temperatura: 0, humedad: 0 },
};
export let historicalData = [];
export let comparisonChartInstance = null;
export let historicalChartInstance = null;
export let currentChartDataType = "temperatura"; // Controla la pestaña activa

// ----------------------------------------------------------------------
// REFERENCIAS DOM (inicializadas más tarde)
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

/**
 * Inicializa referencias DOM. Llamar en DOMContentLoaded antes de usar elementos.
 */
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