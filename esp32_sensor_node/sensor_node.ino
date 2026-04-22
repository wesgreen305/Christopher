//// Arduino Sketch
//// ready-to-flash Arduino sketch for temp/pH/DO sensors
/*
  ChristopherOS - ESP32 Sensor Node
  ─────────────────────────────────
  Reads temperature, pH, and DO sensors,
  then POSTs readings to your Pi's API every 60 seconds.

  Required libraries (install via Arduino Library Manager):
  - ArduinoJson  (Benoit Blanchon)
  - OneWire      (for DS18B20 temp sensor)
  - DallasTemperature

  Wiring:
  - DS18B20 temp sensor → GPIO 4
  - pH sensor analog out → GPIO 34 (ADC)
  - DO sensor analog out → GPIO 35 (ADC)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ── CONFIG ── Change these ──────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_BASE      = "http://192.168.1.100:8000/api";  // Your Pi's IP
const char* SENSOR_ID     = "esp32_tank_01";
const char* ZONE          = "fish_tank";
const int   INTERVAL_MS   = 60000;  // Post every 60 seconds
// ────────────────────────────────────────────────────

#define TEMP_PIN    4
#define PH_PIN      34
#define DO_PIN      35

OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);

void postReading(const char* sensor_type, float value, const char* unit) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_BASE) + "/sensors/reading";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["sensor_id"]   = SENSOR_ID;
  doc["sensor_type"] = sensor_type;
  doc["value"]       = value;
  doc["unit"]        = unit;
  doc["zone"]        = ZONE;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);

  Serial.printf("POST %s = %.3f → HTTP %d\n", sensor_type, value, code);
  http.end();
}

float readPH() {
  // Calibrate these values for your specific pH probe
  // Most pH probes output 0-3.3V corresponding to pH 0-14
  int raw = analogRead(PH_PIN);
  float voltage = raw * (3.3 / 4095.0);
  float ph = 3.5 * voltage + 0.0;  // Adjust slope/offset after calibration
  return constrain(ph, 0, 14);
}

float readDO() {
  // Dissolved oxygen probe - calibrate for your specific sensor
  // Typical range: 0-20 mg/L
  int raw = analogRead(DO_PIN);
  float voltage = raw * (3.3 / 4095.0);
  float mg_per_l = voltage * 4.0;  // Adjust multiplier for your probe
  return constrain(mg_per_l, 0, 20);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi failed - will retry");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n🌿 ChristopherOS Sensor Node starting...");

  tempSensor.begin();
  connectWiFi();
}

void loop() {
  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    connectWiFi();
  }

  Serial.println("\n── Reading sensors ──");

  // Temperature (DS18B20)
  tempSensor.requestTemperatures();
  float temp = tempSensor.getTempCByIndex(0);
  if (temp != DEVICE_DISCONNECTED_C) {
    postReading("temperature", temp, "°C");
  } else {
    Serial.println("⚠️  Temp sensor not found");
  }

  // pH
  float ph = readPH();
  postReading("ph", ph, "pH");

  // Dissolved Oxygen
  float dox = readDO();
  postReading("dissolved_oxygen", dox, "mg/L");

  Serial.printf("Next reading in %d seconds...\n", INTERVAL_MS / 1000);
  delay(INTERVAL_MS);
}