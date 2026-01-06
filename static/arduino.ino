#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h> // Make sure to install ArduinoJson library via Library Manager

// ---------------------------------------------------------------------------
// 1. CONFIGURATION
// ---------------------------------------------------------------------------

// WiFi Credentials
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server Configuration
// IMPORTANT: Use your computer's local IP address if running locally (e.g., http://192.168.1.15:5000)
// If deployed, use your domain (e.g., https://my-sensor-app.com)
const char* serverBaseUrl = "http://YOUR_SERVER_IP:5000"; 

// Update Interval (Milliseconds)
const unsigned long interval = 10000; // 10 seconds

// Sensor Configuration
#define DHTPIN 4     // Digital Pin connected to DHT Sensor
#define DHTTYPE DHT22   // DHT 11 or DHT 22

// ---------------------------------------------------------------------------
// 2. GLOBAL OBJECTS
// ---------------------------------------------------------------------------

DHT dht(DHTPIN, DHTTYPE);
unsigned long lastSendTime = 0;

// SENSOR TOKEN (Get this from the Web Panel -> Config -> Add Sensor)
// You can hardcode it here or manage multiple devices
String deviceToken = "PASTE_YOUR_TOKEN_HERE"; 

// ---------------------------------------------------------------------------
// 3. SETUP
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  dht.begin();

  // Connect to WiFi
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// ---------------------------------------------------------------------------
// 4. MAIN LOOP
// ---------------------------------------------------------------------------
void loop() {
  // Check Wifi Status
  if(WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi Disconnected. Reconnecting...");
    WiFi.disconnect();
    WiFi.reconnect();
    delay(5000);
    return;
  }

  unsigned long currentMillis = millis();

  if (currentMillis - lastSendTime >= interval) {
    lastSendTime = currentMillis;

    // 1. Read Sensor
    float h = dht.readHumidity();
    float t = dht.readTemperature();

    // Check if read failed
    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    Serial.printf("Temp: %.1fC, Hum: %.1f%%\n", t, h);

    // 2. Prepare JSON Payload
    // Uses ArduinoJson (StaticJsonDocument for small payload)
    StaticJsonDocument<200> doc;
    doc["temperature"] = t;
    doc["humidity"] = h;
    
    String jsonOutput;
    serializeJson(doc, jsonOutput);

    // 3. Send HTTP POST
    HTTPClient http;
    String url = String(serverBaseUrl) + "/api/ingest/" + deviceToken;
    
    Serial.print("Sending data to: ");
    Serial.println(url);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonOutput);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("HTTP Response code: %d\n", httpResponseCode);
      Serial.println(response);
    } else {
      Serial.printf("Error code: %d\n", httpResponseCode);
    }

    http.end();
  }
}
