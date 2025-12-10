export const setError = (message) => {
  // ...existing code...
  const el = document.getElementById("error-message");
  if (el) {
    el.innerHTML = message
      ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">${message}</div>`
      : "";
  }
};

export const generateMockHistoryForDate = () => {
   // ...existing code...
   const data = [];
    for (let h = 0; h < 24; h++) {
        data.push({
        hora: `${h.toString().padStart(2, "0")}:00`,
        Sala: 19 + Math.random() * 4,
        Local: 18 + Math.random() * 5,
        Cuarto: 20 + Math.random() * 3,
        });
    }
    return data;
};

/**
 * NEW: Generic function to convert data to CSV and trigger a download
 * @param {Array<string>} headers - e.g. ["Timestamp", "Temp Local", ...]
 * @param {Array<Array<any>>} rows - matrix of rows
 * @param {string} filename - file name to save
 */
export const triggerCsvDownload = (headers, rows, filename) => {
    // 1. Join headers and rows
    const csvContent = [
        headers.join(","), // Headers
        ...rows.map(row => row.join(",")) // Rows
    ].join("\n");

    // 2. Create Blob with BOM so Excel handles special characters correctly
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    
    // 3. Create temporary link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * PREDICTION ENGINE: Simple Linear Regression (y = m*x + b)
 * Builds a trend model from real historical data.
 * @param {Array} data - Array of objects { timestamp, val }
 * @returns {Object} { slope, intercept, predict: function(futureDate) }
 */
export const createLinearRegressionModel = (data) => {
    // We need at least 2 points to build a line
    if (!data || data.length < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = data.length;

    // Convert timestamps to numeric values (minutes since the starting point)
    // This normalizes X so numbers are not enormous (as with Date.now())
    const startTime = new Date(data[0].timestamp).getTime();

    const normalizedData = data.map(point => {
        const x = (new Date(point.timestamp).getTime() - startTime) / 60000; // x in minutes
        const y = point.val;
        return { x, y };
    });

    normalizedData.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += (p.x * p.y);
        sumXX += (p.x * p.x);
    });

    // Least squares formulas
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
        slope,
        intercept,
        startTime, // Keep reference time
        // Function to predict Y given a future Date object
        predict: (futureDateObj) => {
            const xFuture = (futureDateObj.getTime() - startTime) / 60000;
            return (slope * xFuture) + intercept;
        }
    };
};

/**
 * Format a time for display on cards (e.g., 08:00 AM)
 */
export const formatTimeDisplay = (dateObj) => {
    return dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
};