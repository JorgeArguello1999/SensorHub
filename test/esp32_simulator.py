import requests
import time
import random
import json

# Configuration
SERVER_URL = "http://localhost:5000/api/sensors"
LOCATIONS = ["sala", "cuarto"]

def generate_sensor_data():
    """Generate random realistic sensor data."""
    return {
        "temperatura": round(random.uniform(18.0, 26.0), 1),
        "humedad": round(random.uniform(40.0, 70.0), 1)
    }

def simulate_esp32():
    print(f"🚀 Starting ESP32 Simulator targeting {SERVER_URL}")
    print("Preciona Ctrl+C para detener.")
    
    try:
        while True:
            for loc in LOCATIONS:
                data = generate_sensor_data()
                payload = {
                    "path": f"/{loc}",
                    "data": data
                }
                
                try:
                    response = requests.post(SERVER_URL, json=payload, timeout=2)
                    if response.status_code == 200:
                        print(f"✅ Sent {loc}: {data}")
                    else:
                        print(f"⚠️ Failed {loc}: {response.status_code} - {response.text}")
                except requests.exceptions.ConnectionError:
                    print(f"❌ Connection Error: Is the server running at {SERVER_URL}?")
                except Exception as e:
                    print(f"❌ Error: {e}")
                
                time.sleep(1) # Small delay between requests
            
            print("---")
            time.sleep(5) # Wait 5 seconds before next batch

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")

if __name__ == "__main__":
    simulate_esp32()
