# 🌡️ SensorHub Pro - IoT Analytics Dashboard

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Backend-Flask-blue)
![Firebase](https://img.shields.io/badge/Database-Firebase-orange)
![Javascript](https://img.shields.io/badge/Frontend-ES6%2B-yellow)
![Tailwind](https://img.shields.io/badge/Style-TailwindCSS-38b2ac)

**SensorHub Pro** is a comprehensive IoT environmental monitoring platform designed to provide real-time data visualization, deep historical analysis, and scalable sensor management.

Beyond displaying raw data, the system evaluates **Infrastructure Health** (Uptime, power outages) and utilizes **Machine Learning algorithms** (Linear Regression) to project future climate trends.

## ✨ Key Features

### 📡 Real-Time Monitoring
- **Live Data Streaming:** Uses **Server-Sent Events (SSE)** for instant updates without page reloads.
- **External API Integration:** Connects with OpenWeatherMap to compare indoor vs. outdoor conditions.
- **Multi-Zone Support:** Seamlessly monitors multiple nodes (Living Room, Bedroom, Outdoor).

### 📊 Advanced Analytics & BI
- **System Health (Uptime):** Automatic detection of power outages or sensor disconnections (gaps > 20 min).
- **Thermal Stability:** Calculates Standard Deviation (SD) to evaluate thermal insulation efficiency.
- **Flexible History:** Filter data by "Last N Hours" or specific date ranges using custom Datetime Pickers.
- **Visualization:** Interactive comparative charts (Chart.js) and Min/Max/Avg data tables.

### 🤖 AI & Predictions
- **Prediction Engine:** Client-side Linear Regression implementation to forecast short-term temperature trends (Morning, Afternoon, Night).

### ⚙️ Sensor Management (Admin)
- **Management Interface:** Dynamic UI to add, edit, or remove sensors on the fly.
- **Security:** Generation of unique authentication tokens for each ESP32 node.
- **Authentication:** Modern Sign In / Sign Up interface for secure access.

## 🛠️ Tech Stack

* **Backend:** Python (Flask), Flask-Blueprints.
* **Database:** Google Firebase (Firestore & Realtime Database).
* **Frontend:** HTML5, Vanilla JavaScript (ES Modules), TailwindCSS.
* **Libraries:** Chart.js (Data Visualization), Lucide (Icons).
* **Hardware (Client):** Compatible with ESP32/ESP8266 nodes.

## 🚀 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/sensorhub-pro.git](https://github.com/your-username/sensorhub-pro.git)
    cd sensorhub-pro
    ```

2.  **Set up virtual environment and install dependencies:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Environment Configuration:**
    Create a `.env` file or configure your variables:
    * `OPENWEATHER_API_KEY`: Your OpenWeatherMap API Key.
    * Firebase Credentials (`serviceAccountKey.json`).

4.  **Run the application:**
    ```bash
    python index.py
    ```
    Visit `http://localhost:5000` in your browser.

## 📸 Screenshots

*(Add screenshots of your "Live", "Analytics", and "Sensor Management" tabs here)*

---
Built with ❤️ by JorgeArguello
