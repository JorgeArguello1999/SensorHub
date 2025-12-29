// utils.js
export const setError = (message) => {
  const el = document.getElementById("error-message");
  if (el) {
    el.innerHTML = message
      ? `<div class="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>${message}</div>`
      : "";
  }
};

export const generateMockHistoryForDate = () => {
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
 * Generic function to convert data to CSV and trigger a download
 */
export const triggerCsvDownload = (headers, rows, filename) => {
    // 1. Join headers and rows
    const csvContent = [
        headers.join(","), // Headers
        ...rows.map(row => row.join(",")) // Rows
    ].join("\n");

    // 2. Create Blob
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    
    // 3. Trigger download
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
 * PREDICTION ENGINE
 */
export const createLinearRegressionModel = (data) => {
    if (!data || data.length < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = data.length;

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

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
        slope,
        intercept,
        startTime,
        predict: (futureDateObj) => {
            const xFuture = (futureDateObj.getTime() - startTime) / 60000;
            return (slope * xFuture) + intercept;
        }
    };
};

export const formatTimeDisplay = (dateObj) => {
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};