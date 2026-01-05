# 🌡️ SensorHub Pro - IoT Analytics Dashboard

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Backend-Flask-blue)
![Redis](https://img.shields.io/badge/Realtime-Redis-red)
![DB](https://img.shields.io/badge/Storage-SQLite%20%7C%20PostgreSQL-003B57)
![Javascript](https://img.shields.io/badge/Frontend-ES6%2B-yellow)
![Tailwind](https://img.shields.io/badge/Style-TailwindCSS-38b2ac)

**SensorHub Pro** is a comprehensive IoT environmental monitoring platform designed to provide real-time data visualization, deep historical analysis, and scalable sensor management.

Beyond displaying raw data, the system evaluates **Infrastructure Health** (Uptime, power outages) and utilizes **Machine Learning algorithms** (Linear Regression) to project future climate trends.

## ✨ Key Features

### 📡 Real-Time Monitoring
- **Live Data Streaming:** High-performance streaming using **Redis Pub/Sub** and **Server-Sent Events (SSE)**.
- **External API Integration:** Connects with OpenWeatherMap to compare indoor vs. outdoor conditions.
- **Multi-Zone Support:** Seamlessly monitors multiple nodes (Living Room, Bedroom, Outdoor).

### 📊 Advanced Analytics & BI
- **System Health (Uptime):** Automatic detection of power outages or sensor disconnections (gaps > 20 min).
- **Thermal Stability:** Calculates Standard Deviation (SD) to evaluate thermal insulation efficiency.
- **Flexible History:** Persistent storage using **SQLAlchemy** (Support for SQLite or PostgreSQL) with fast filtering by range or "Last N Hours".
- **Visualization:** Interactive comparative charts (Chart.js) and Min/Max/Avg data tables.

### 🤖 AI & Predictions
- **Prediction Engine:** Client-side Linear Regression implementation to forecast short-term temperature trends (Morning, Afternoon, Night).

### ⚙️ Configuration & Management
- **Sensor Management:** Dynamic UI to add, edit, or remove sensors on the fly.
- **System Settings:** Configurable data save interval (DB persistence frequency) directly from the UI.
- **Authentication:** Modern Sign In / Sign Up interface for secure access.

## 🛠️ Tech Stack

* **Backend:** Python (Flask), Flask-Blueprints.
* **Real-time Engine:** Redis (Key-Value & Pub/Sub).
* **Storage:** SQLite (default) or PostgreSQL. Configurable via `DATABASE_URL`.
* **Frontend:** HTML5, Vanilla JavaScript (ES Modules), TailwindCSS.
* **Hardware (Client):** Compatible with ESP32/ESP8266 nodes (HTTP POST).

## 🚀 Installation & Setup

### Prerequisites
- **Redis Server** installed and running (`redis-server`).
- **Python 3.13+**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/sensorhub-pro.git
    cd sensorhub-pro
    ```

2.  **Install dependencies using `uv`:**
    ```bash
    uv sync
    ```

3.  **Environment Configuration (.env):**
    Create a `.env` file in the root directory. You can use the following template:

    ```ini
    # Security
    SECRET_KEY=your_secret_key_here  # Used for Flask sessions
    ADMIN_PASSWORD=admin123          # Password to access the Admin/Config panel

    # External APIs
    OPENWEATHER_API_KEY=your_owm_key # get one at openweathermap.org

    # Database & Cache
    DATABASE_URL=sqlite:///sensors.db # or postgresql://user:pass@localhost/dbname
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_DB=0

    # Server
    PORT=5000
    ```

    | Variable | Description | Default |
    | :--- | :--- | :--- |
    | `ADMIN_PASSWORD` | **Required.** Protects the sensor configuration panel. | `None` (must be set) |
    | `OPENWEATHER_API_KEY` | **Required** for "Outdoor" weather data. | `None` |
    | `SECRET_KEY` | Flask session security. | `dev_key` |
    | `DATABASE_URL` | SQLAlchemy connection string. | `sqlite:///sensors.db` |
    | `REDIS_HOST` | Redis server address. | `localhost` |

    ```bash
    uv run manage.py
    ```
    Visit `http://localhost:5000` in your browser.

5.  **Run ESP32 Simulator (Optional):**
    If you don't have physical sensors yet, you can send simulated data:
    
    1.  Go to the Web UI -> **Config** -> **Add New Sensor**.
    2.  Select **ESP32**, give it a name, and Create.
    3.  **Copy the Token** displayed in the alert.
    4.  Run the simulator:
    ```bash
    uv run test/esp32_simulator.py <PASTE_YOUR_TOKEN_HERE>
    ```

## 📸 Screenshots

### Dashboard & Analytics
![Screenshot 1](static/images/screenshot_1.png)


### Sensor Management & History
![Screenshot 2](static/images/screenshot_2.png)

---
Built with ❤️ by JorgeArguello
