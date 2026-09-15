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

4.  **Run the application:**
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

## 🐳 Docker Deployment

Deploy the entire stack (app + Redis) with a single container. Ideal for production or any environment with Docker installed.

### 1. Build the Docker Image
From the project root, build the image with the latest changes:

```bash
docker build -t sensorhub:latest .
```

### 2. Run the Container

The `docker-entrypoint.sh` starts the internal Redis server and then launches the Flask/Gunicorn application. Two run modes are available:

#### Option A: Standard Mode (Dashboard ready to receive data)
Persist your database by mounting `sensors.db` to the host:

```bash
docker run -d --name sensorhub \
  -p 5000:5000 \
  -v $(pwd)/sensors.db:/app/sensors.db \
  -e ADMIN_PASSWORD=admin123 \
  sensorhub:latest
```

> **Note:** If you have a `.env` file, you can use `--env-file` instead of individual `-e` flags:
> ```bash
> docker run -d --name sensorhub -p 5000:5000 -v $(pwd)/sensors.db:/app/sensors.db --env-file .env sensorhub:latest
> ```

#### Option B: Simulator Mode (Recommended for testing/demo)
If no physical devices are connected and you want to see live metrics and charts immediately, enable the built-in ESP32 simulator with `START_SIMULATOR=1`:

```bash
docker run -d --name sensorhub \
  -p 5000:5000 \
  -v $(pwd)/sensors.db:/app/sensors.db \
  -e ADMIN_PASSWORD=admin123 \
  -e START_SIMULATOR=1 \
  sensorhub:latest
```

### 3. Access the System
- **Web Dashboard:** Open [http://localhost:5000](http://localhost:5000) in your browser.
- **Admin Access:** Default password is `admin123` (or the value you set in `ADMIN_PASSWORD`).

### 4. Useful Management Commands

- **View real-time logs:**
  ```bash
  docker logs -f sensorhub
  ```
- **Stop the container:**
  ```bash
  docker stop sensorhub
  ```
- **Restart a stopped container:**
  ```bash
  docker start sensorhub
  ```
- **Remove the container:**
  ```bash
  docker rm -f sensorhub
  ```
- **Run internal verification tests:**
  ```bash
  docker run --rm -e RUN_TESTS=1 sensorhub:latest
  ```

## ⚙️ Configuration & Management 

### Admin Access
1. Click the **"Admin Access"** button in the sidebar footer.
2. Enter the default password (set in `.env` as `ADMIN_PASSWORD`, default is **`admin123`**).
3. Once authenticated, you can manage sensors and system settings.

### System Settings (New)
You can configure how often the system saves sensor data to the persistent database (SQLite/Postgres). This is useful to balance between high-resolution history and database size.
- Go to the **Config Modal** (after Admin login).
- Click on **System Settings**.
- Set the **"Data Save Interval"** in minutes (Default: 15 min).

### Managing Sensors
- **Add Sensor:** Choose between "ESP32 Device" (Physical) or "OpenWeather" (Virtual API).
- **Remove Sensor:** Click the trash icon next to any sensor in the list.

## 🤖 AI & Predictions Usage

The Dashboard features a client-side AI module that uses **Linear Regression** to predict temperatures for key times of the day (Morning, Afternoon, Night) based on the last 12 hours of data.

- **Automatic:** Predictions update automatically as new data flows in.
- **Custom Check:** You can manually input a specific time in the "AI Predictions" panel to get a forecasted temperature for that specific moment.

## 📸 Gallery

<p align="center">
  <img src="static/images/screenshot_1.png" width="45%" alt="Dashboard Overview">
  <img src="static/images/screenshot_2.png" width="45%" alt="Analytics">
</p>
<p align="center">
  <img src="static/images/screenshot_3.png" width="45%" alt="Sensor Config">
  <img src="static/images/screenshot_4.png" width="45%" alt="History View">
</p>
<p align="center">
  <img src="static/images/screenshot_5.png" width="30%" alt="Admin Access">
  <img src="static/images/screenshot_6.png" width="30%" alt="List of Sensors">
</p>
<p align="center">
  <img src="static/images/screenshot_7.png" width="30%" alt="Sensor Configuration">
  <img src="static/images/screenshot_8.png" width="30%" alt="Database Settings">
</p>

## 🔌 ESP32 Firmware Setup
To connect a physical ESP32 sensor:
1. Go to the **Web Dashboard** -> **Config** (Admin) -> **Add Sensor**.
2. Select **ESP32 Device**, give it a name, and copy the **Device Token**.
3. Download the firmware using the **"Download .ino Sketch"** button in the modal.
4. Open the file in **Arduino IDE** and update:
   - `ssid`: Your WiFi Name.
   - `password`: Your WiFi Password.
   - `serverBaseUrl`: Your Server URL (e.g. `http://192.168.1.10:5000`).
   - `deviceToken`: The token you copied.
5. Flash the ESP32. It will start sending data every 10 seconds.

## ⚠️ Known Issues
- **AI Predictions (Beta):** The Linear Regression module currently requires a stable stream of data (minimum 2 points) to generate forecasts. In some environments with intermittent sensor availability, the predictions may display as "Calculating..." or "Low Data". This is under investigation.

---
Built with ❤️ by JorgeArguello
