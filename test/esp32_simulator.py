import requests
import time
import random
import sys

# Configuration
SERVER_BASE = "http://localhost:5000/api/ingest"

def generate_sensor_data():
    """Generate random realistic sensor data."""
    return {
        "temperature": round(random.uniform(18.0, 26.0), 1),
        "humidity": round(random.uniform(40.0, 70.0), 1)
    }

def simulate_esp32():
    print(f"🚀 Starting ESP32 Simulator")
    
    if len(sys.argv) > 1:
        token = sys.argv[1]
    else:
        token = input("🔑 Enter Sensor Token (from Web UI): ").strip()
    
    if not token:
        print("❌ Token required.")
        return

    url = f"{SERVER_BASE}/{token}"
    print(f"📡 Sending data to: {url}")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            data = generate_sensor_data()
            try:
                response = requests.post(url, json=data, timeout=2)
                if response.status_code == 200:
                    print(f"✅ Sent: {data}")
                else:
                    print(f"⚠️ Failed: {response.status_code} - {response.text}")
            except requests.exceptions.ConnectionError:
                print(f"❌ Connection Error: Is the server running?")
            except Exception as e:
                print(f"❌ Error: {e}")
            
            time.sleep(5) # Delay

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")

if __name__ == "__main__":
    simulate_esp32()
