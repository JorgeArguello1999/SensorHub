#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <DHT.h>

// --------------------------------------------------
// SENSOR CONFIGURATION
// --------------------------------------------------
#define DHTPIN_CUARTO 14
#define DHTPIN_SALA 27
#define DHTTYPE DHT22

DHT sensorCuarto(DHTPIN_CUARTO, DHTTYPE);
DHT sensorSala(DHTPIN_SALA, DHTTYPE);

// --------------------------------------------------
// WiFi CONFIG
// --------------------------------------------------
const char* ssid = "";
const char* password = "";

// --------------------------------------------------
// FIREBASE CONFIG
// --------------------------------------------------
#define API_KEY       ""
#define DATABASE_URL  ""
#define USER_EMAIL    ""
#define USER_PASS     ""

UserAuth user_auth(API_KEY, USER_EMAIL, USER_PASS);

FirebaseApp app;
WiFiClientSecure ssl_client;
using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);
RealtimeDatabase db;

void processData(AsyncResult &aResult);

// Send to Firebase every 10 seconds
unsigned long lastSend = 0;
const unsigned long interval = 10000;

// --------------------------------------------------
// FUNCTION: Read sensor
// --------------------------------------------------
bool leerSensor(DHT& sensor, float& h, float& t) {
  h = sensor.readHumidity();
  t = sensor.readTemperature();

  if (isnan(h) || isnan(t)) return false;
  return true;
}

// --------------------------------------------------
// SETUP
// --------------------------------------------------
void setup() {
  Serial.begin(115200);

  sensorCuarto.begin();
  sensorSala.begin();

  Serial.println("Conectando a WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Initialize Firebase
  ssl_client.setInsecure();  
  initializeApp(aClient, app, getAuth(user_auth), processData, "authTask");
  app.getApp<RealtimeDatabase>(db);
  db.url(DATABASE_URL);

  Serial.println("Firebase listo.");
}

// --------------------------------------------------
// LOOP
// --------------------------------------------------
void loop() {
  app.loop();

  if (!app.ready()) return;

  unsigned long now = millis();
  if (now - lastSend < interval) return;
  lastSend = now;

  float hDorm, tDorm, hSala, tSala;

  // Read sensors
  bool okDorm = leerSensor(sensorCuarto, hDorm, tDorm);
  delay(150);
  bool okSala = leerSensor(sensorSala, hSala, tSala);

  // Upload to Firebase
  if (okDorm) {
    db.set<float>(aClient, "/cuarto/temperatura", tDorm, processData, "TDorm");
    db.set<float>(aClient, "/cuarto/humedad", hDorm, processData, "HDorm");

    Serial.printf("C -> T: %.2f°C | H: %.2f%%\n", tDorm, hDorm);
  } else {
    Serial.println("ERROR leyendo sensor Cuarto");
  }

  if (okSala) {
    db.set<float>(aClient, "/sala/temperatura", tSala, processData, "TSala");
    db.set<float>(aClient, "/sala/humedad", hSala, processData, "HSala");

    Serial.printf("Sala -> T: %.2f°C | H: %.2f%%\n", tSala, hSala);
  } else {
    Serial.println("ERROR leyendo sensor SALA");
  }
}

// --------------------------------------------------
// FIREBASE DEBUG
// --------------------------------------------------
void processData(AsyncResult &aResult) {
  if (!aResult.isResult()) return;

  if (aResult.isEvent())
    Serial.printf("Event: %s -> %s\n", aResult.uid().c_str(), aResult.eventLog().message().c_str());

  if (aResult.isError())
    Serial.printf("Firebase Error: %s\n", aResult.error().message().c_str());
}
