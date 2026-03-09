/**
 * DDAS - Dam Disaster Alert System
 * ESP32 Sensor Firmware
 *
 * Reads a water level sensor, reports battery level, WiFi signal strength,
 * and device status to the DDAS API via the Device Endpoint.
 *
 * The server buffers readings and saves the mean value at the configured
 * readingIntervalSeconds. The ESP32 sends readings as fast as it can
 * (configurable SEND_RATE_MS) — the server handles the averaging.
 *
 * On startup and periodically, the ESP32 fetches its configuration
 * from the /ping endpoint to stay in sync with dashboard settings.
 *
 * API: POST /api/v1/device/readings
 * Auth: X-Device-API-Key header
 *
 * Payload:
 *   {
 *     "readingValue": 241.30,
 *     "unit": "meters",
 *     "quality": "good",
 *     "batteryLevel": 85.50,
 *     "signalStrength": -42.00,
 *     "status": "active"
 *   }
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===================== CONFIGURATION =====================

// WiFi
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";

// DDAS API — base URL (without trailing slash)
const char* API_BASE_URL = "https://YOUR_SERVER/api/v1/device";
const char* API_KEY      = "ddasdk_YOUR_DEVICE_API_KEY_HERE";

// Sensor pin (analog)
const int SENSOR_PIN = 34;  // GPIO34 (ADC1_CH6)

// Battery monitoring pin (voltage divider)
const int BATTERY_PIN = 35; // GPIO35 (ADC1_CH7)

// Send rate — how often the ESP32 sends readings to the server.
// The server buffers these and saves the mean at the configured interval.
// Example: 100ms = 10 readings/sec, server interval = 1s → mean of 10 values saved.
const unsigned long SEND_RATE_MS = 100;  // Send every 100ms (adjust as needed)

// How often to re-fetch config from /ping (milliseconds) — default 5 minutes
const unsigned long CONFIG_REFRESH_MS = 5 * 60 * 1000;

// Battery voltage divider ratio (R1 + R2) / R2
const float BATTERY_DIVIDER_RATIO = 2.0;
const float BATTERY_MAX_VOLTAGE   = 4.2;  // Fully charged LiPo
const float BATTERY_MIN_VOLTAGE   = 3.0;  // Empty LiPo

// Sensor calibration
const float SENSOR_MIN_RAW   = 0.0;     // ADC value at minimum water level
const float SENSOR_MAX_RAW   = 4095.0;  // ADC value at maximum water level
const float WATER_LEVEL_MIN  = 0.0;     // meters at min ADC
const float WATER_LEVEL_MAX  = 300.0;   // meters at max ADC
const char* READING_UNIT     = "meters";

// Retry config
const int MAX_WIFI_RETRIES   = 20;
const int MAX_HTTP_RETRIES   = 3;
const int HTTP_TIMEOUT_MS    = 10000;

// ===================== GLOBALS =====================

unsigned long lastSendTime = 0;
unsigned long lastConfigFetchTime = 0;
int consecutiveFailures = 0;
const int FAILURE_THRESHOLD = 10;

// Server-side config (fetched from /ping)
int serverIntervalSeconds = 300;  // Will be updated from server
String serverSensorUid = "";
String serverSensorStatus = "";

// ===================== SETUP =====================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println("  DDAS ESP32 Sensor - Starting up...");
    Serial.println("  Send rate: " + String(SEND_RATE_MS) + "ms");
    Serial.println("  Server does the averaging!");
    Serial.println("========================================");

    // Configure ADC
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Connect to WiFi
    connectWiFi();

    // Fetch config from server (also verifies API key)
    fetchConfig();

    Serial.println("Setup complete. Streaming readings...");
    Serial.println();
}

// ===================== MAIN LOOP =====================

void loop() {
    unsigned long now = millis();

    // Periodically refresh config from server
    if (now - lastConfigFetchTime >= CONFIG_REFRESH_MS) {
        fetchConfig();
        lastConfigFetchTime = now;
    }

    // Send readings at the configured send rate
    if (now - lastSendTime >= SEND_RATE_MS || lastSendTime == 0) {
        lastSendTime = now;

        // Ensure WiFi is connected
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WIFI] Reconnecting...");
            connectWiFi();
            if (WiFi.status() != WL_CONNECTED) return; // Skip this cycle
        }

        // Read sensor data
        float waterLevel = readWaterLevel();
        float batteryPct = readBatteryLevel();
        float signalDbm  = getSignalStrength();
        String quality   = assessQuality(waterLevel);
        String status    = getDeviceStatus();

        // Send to API (server buffers and averages)
        bool success = sendReading(waterLevel, READING_UNIT, quality, batteryPct, signalDbm, status);

        if (success) {
            consecutiveFailures = 0;
        } else {
            consecutiveFailures++;
            if (consecutiveFailures % 10 == 0) {
                Serial.printf("[API] ✗ %d consecutive failures\n", consecutiveFailures);
            }
        }
    }
}

// ===================== SENSOR READING =====================

/**
 * Read water level from analog sensor and convert to meters.
 */
float readWaterLevel() {
    // Take multiple samples and average for stability
    const int SAMPLES = 10;
    float sum = 0;

    for (int i = 0; i < SAMPLES; i++) {
        sum += analogRead(SENSOR_PIN);
        delay(10);
    }

    float avgRaw = sum / SAMPLES;

    // Map ADC value to water level in meters
    float waterLevel = mapFloat(avgRaw, SENSOR_MIN_RAW, SENSOR_MAX_RAW,
                                WATER_LEVEL_MIN, WATER_LEVEL_MAX);

    // Clamp to valid range
    waterLevel = constrain(waterLevel, WATER_LEVEL_MIN, WATER_LEVEL_MAX);

    return waterLevel;
}

/**
 * Read battery voltage via divider and convert to percentage (0-100).
 */
float readBatteryLevel() {
    const int SAMPLES = 5;
    float sum = 0;

    for (int i = 0; i < SAMPLES; i++) {
        sum += analogRead(BATTERY_PIN);
        delay(5);
    }

    float avgRaw = sum / SAMPLES;

    // Convert ADC → voltage → actual battery voltage
    float voltage = (avgRaw / 4095.0) * 3.3 * BATTERY_DIVIDER_RATIO;

    // Convert voltage to percentage
    float percentage = ((voltage - BATTERY_MIN_VOLTAGE) /
                        (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) * 100.0;

    // Clamp 0-100
    percentage = constrain(percentage, 0.0, 100.0);

    return percentage;
}

/**
 * Get WiFi signal strength in dBm (typically -100 to 0).
 */
float getSignalStrength() {
    if (WiFi.status() == WL_CONNECTED) {
        return (float)WiFi.RSSI();
    }
    return -100.0; // No connection
}

/**
 * Assess reading quality based on sensor value plausibility.
 */
String assessQuality(float waterLevel) {
    if (waterLevel <= WATER_LEVEL_MIN || waterLevel >= WATER_LEVEL_MAX) {
        return "suspect"; // At sensor limits
    }
    return "good";
}

/**
 * Determine device status based on health indicators.
 */
String getDeviceStatus() {
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
        return "faulty";
    }
    if (WiFi.status() != WL_CONNECTED) {
        return "offline";
    }
    return "active";
}

// ===================== API COMMUNICATION =====================

/**
 * Send a sensor reading to the DDAS API with battery/signal/status metadata.
 * The server buffers these and computes the mean at the configured interval.
 * Returns true on success (HTTP 200 = buffered, HTTP 201 = mean saved).
 */
bool sendReading(float value, const char* unit, String quality,
                 float batteryLevel, float signalStrength, String status) {

    if (WiFi.status() != WL_CONNECTED) {
        return false;
    }

    // Build JSON payload
    JsonDocument doc;
    doc["readingValue"]    = round2(value);
    doc["unit"]            = unit;
    doc["quality"]         = quality;
    doc["batteryLevel"]    = round2(batteryLevel);
    doc["signalStrength"]  = round2(signalStrength);
    doc["status"]          = status;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    String url = String(API_BASE_URL) + "/readings";

    // Send with retries
    for (int attempt = 1; attempt <= MAX_HTTP_RETRIES; attempt++) {
        HTTPClient http;
        http.begin(url);
        http.setTimeout(HTTP_TIMEOUT_MS);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("X-Device-API-Key", API_KEY);

        int httpCode = http.POST(jsonPayload);

        if (httpCode == 200 || httpCode == 201) {
            // Parse response to check if reading was saved or buffered
            String response = http.getString();
            http.end();

            JsonDocument resDoc;
            DeserializationError err = deserializeJson(resDoc, response);
            if (!err) {
                bool saved = resDoc["data"]["saved"] | false;
                int bufferSize = resDoc["data"]["bufferSize"] | 0;

                if (saved) {
                    // Mean was computed and saved
                    float meanValue = resDoc["data"]["savedReading"]["meanValue"] | 0.0f;
                    int count = resDoc["data"]["savedReading"]["readingCount"] | 0;
                    Serial.printf("[API] ✓ SAVED mean=%.2f from %d readings\n", meanValue, count);
                }
                // else: silently buffered (don't spam serial at high send rates)
            }

            return true;
        }

        if (attempt < MAX_HTTP_RETRIES) {
            http.end();
            delay(500 * attempt);
        } else {
            http.end();
        }
    }

    return false;
}

/**
 * Fetch sensor configuration from the /ping endpoint.
 * Updates serverIntervalSeconds and other config from the server.
 */
void fetchConfig() {
    if (WiFi.status() != WL_CONNECTED) return;

    Serial.println("[CONFIG] Fetching sensor config from server...");

    String url = String(API_BASE_URL) + "/ping";

    HTTPClient http;
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("X-Device-API-Key", API_KEY);

    int httpCode = http.GET();

    if (httpCode == 200) {
        String response = http.getString();
        http.end();

        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, response);

        if (!err) {
            int newInterval = doc["data"]["readingIntervalSeconds"] | 300;
            const char* sensorUid = doc["data"]["sensorUid"] | "unknown";
            const char* sensorStatus = doc["data"]["sensorStatus"] | "active";

            if (newInterval != serverIntervalSeconds) {
                Serial.printf("[CONFIG] Interval changed: %ds → %ds\n",
                              serverIntervalSeconds, newInterval);
            }

            serverIntervalSeconds = newInterval;
            serverSensorUid = String(sensorUid);
            serverSensorStatus = String(sensorStatus);

            Serial.printf("[CONFIG] ✓ Sensor: %s | Interval: %ds | Status: %s\n",
                          serverSensorUid.c_str(), serverIntervalSeconds, serverSensorStatus.c_str());
        } else {
            Serial.printf("[CONFIG] ✗ JSON parse error: %s\n", err.c_str());
        }
    } else {
        Serial.printf("[CONFIG] ✗ HTTP %d — check API key and server URL\n", httpCode);
        http.end();
    }
}

// ===================== WIFI =====================

/**
 * Connect to WiFi with retries.
 */
void connectWiFi() {
    Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < MAX_WIFI_RETRIES) {
        delay(500);
        Serial.print(".");
        retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" Connected!");
        Serial.printf("[WIFI] IP: %s | Signal: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println(" FAILED!");
        Serial.println("[WIFI] Could not connect. Will retry on next reading.");
    }
}

// ===================== UTILITIES =====================

/**
 * Float version of Arduino map() function.
 */
float mapFloat(float x, float inMin, float inMax, float outMin, float outMax) {
    return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Round float to 2 decimal places.
 */
float round2(float value) {
    return round(value * 100.0) / 100.0;
}
