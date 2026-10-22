/**
 * ================================================================
 *  DDAS - Dam Disaster Alert System
 *  ESP32 MQTT Sensor Firmware v3.0
 *  PlatformIO + VS Code
 * ================================================================
 *
 *  Sensor  : HC-SR04 Ultrasonic Distance Sensor
 *  Protocol: MQTT via Eclipse Mosquitto Broker (Docker)
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  HC-SR04 Wiring                                         │
 *  │   VCC  → ESP32 5V  (or 3.3V with voltage divider)      │
 *  │   GND  → ESP32 GND                                      │
 *  │   TRIG → GPIO 5  (Output - trigger pulse)               │
 *  │   ECHO → GPIO 18 (Input  - echo return)                 │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  Dam Water Level Calculation                            │
 *  │                                                         │
 *  │  Sensor mounted at dam TOP looking DOWN:                │
 *  │                                                         │
 *  │  [HC-SR04]  ← SENSOR_MOUNT_HEIGHT_M (e.g. 10m)        │
 *  │      |                                                  │
 *  │      | distance_m  (measured)                          │
 *  │      ↓                                                  │
 *  │  ~~~~~~~~~~  ← water surface                           │
 *  │      |                                                  │
 *  │      | waterLevel_m = MOUNT_HEIGHT - distance           │
 *  │      ↓                                                  │
 *  │  =========  ← dam floor                                │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  MQTT Topics:
 *    PUBLISH   ddas/sensors/{sensorUid}/readings  ← water level data
 *    PUBLISH   ddas/sensors/{sensorUid}/status    ← device health / LWT
 *    SUBSCRIBE ddas/sensors/{sensorUid}/config    → config from server
 *
 *  Libraries (platformio.ini):
 *    knolleary/PubSubClient @ ^2.8
 *    bblanchon/ArduinoJson  @ ^6.21.3
 *
 *  Commands:
 *    pio run --target upload   → ESP32 firmware upload
 *    pio device monitor        → Serial output monitor
 * ================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>   // v6 API: StaticJsonDocument / DynamicJsonDocument

// ================================================================
//  SECTION 1: USER CONFIGURATION — මෙහි ඔබේ values දෙන්න
// ================================================================

// --- WiFi ---
const char* WIFI_SSID     = "YOUR_WIFI_NAME";       // ← ඔබේ WiFi SSID
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← ඔබේ WiFi Password

// --- MQTT Broker (Eclipse Mosquitto via Docker) ---
// ⚠ localhost / 127.0.0.1 දෙන්න එපා! ESP32 ට connect නොවේ.
// Docker run කරන PC/Server IP address එක දෙන්න.
// (cmd: ipconfig → Wireless LAN adapter → IPv4 Address)
const char* MQTT_BROKER   = "192.168.1.X";   // ← ඔබේ PC/Server IP
const int   MQTT_PORT     = 1883;
const char* MQTT_USERNAME = "";               // allow_anonymous true → හිස් කරන්න
const char* MQTT_PASSWORD = "";              // allow_anonymous true → හිස් කරන්න

// --- Device Identity (DB sensor record සමග match කරන්න) ---
const char* SENSOR_UID  = "SNS-DAM01-WL-001";  // ← DB හි sensor UID
const int   SENSOR_ID   = 101;                  // ← DB හි sensor ID (int)
const int   DAM_ID      = 1;                    // ← DB හි dam ID
const char* DEVICE_NAME = "ESP32DamSensorClient"; // MQTT Client ID (unique)

// ================================================================
//  SECTION 2: HC-SR04 ULTRASONIC SENSOR PINS
// ================================================================

const int TRIG_PIN = 5;    // GPIO5  — Trigger (Output)
const int ECHO_PIN = 18;   // GPIO18 — Echo    (Input)

// Speed of sound in cm/µs at ~20°C (standard)
// Temperature compensation සඳහා: speed = 0.0343 * sqrt(T/293.15)
const float SOUND_SPEED_CM_US = 0.034;

// ================================================================
//  SECTION 3: DAM SENSOR MOUNTING CONFIGURATION
// ================================================================

// Sensor, dam top හි mount කර ජලය දෙසට pointing කරන විට:
// waterLevel = SENSOR_MOUNT_HEIGHT - measured_distance
// ඔබේ dam structure අනුව මෙය වෙනස් කරන්න (meters)
const float SENSOR_MOUNT_HEIGHT_M = 10.0;   // ← Sensor mount height (meters)
const float SENSOR_MIN_DISTANCE_M = 0.20;   // HC-SR04 minimum range (blind zone)
const float SENSOR_MAX_DISTANCE_M = 4.00;   // HC-SR04 reliable max range (4m)
const float DAM_MAX_WATER_LEVEL_M = 9.80;   // Maximum safe water level

const char* READING_UNIT = "meters";

// ================================================================
//  SECTION 4: TIMING
// ================================================================

const unsigned long SEND_RATE_MS       = 10000;  // 10 seconds (ඔබේ example අනුව)
const unsigned long STATUS_INTERVAL_MS = 60000;  // Status heartbeat: 1 minute
const unsigned long MQTT_RECONNECT_MS  = 5000;   // Reconnect retry delay

// ================================================================
//  SECTION 5: BATTERY MONITORING (Optional)
// ================================================================

const int   BATTERY_PIN           = 35;    // GPIO35 ADC (voltage divider)
const float BATTERY_DIVIDER_RATIO = 2.0;
const float BATTERY_MAX_VOLTAGE   = 4.2;
const float BATTERY_MIN_VOLTAGE   = 3.0;

// ================================================================
//  GLOBALS
// ================================================================

WiFiClient   wifiClient;
PubSubClient client(wifiClient);   // ← ඔබේ example variable name

// MQTT topic strings (setup() හිදී build වේ)
char TOPIC_READINGS[80];
char TOPIC_STATUS[80];
char TOPIC_CONFIG[80];

unsigned long lastSendTime         = 0;
unsigned long lastStatusTime       = 0;
unsigned long lastReconnectAttempt = 0;
int           consecutiveFailures  = 0;
const int     FAILURE_THRESHOLD    = 5;

// Server pushed config (via MQTT subscribe)
int serverIntervalSeconds = 300;

// ================================================================
//  FUNCTION PROTOTYPES
// ================================================================

void   setup_wifi();
void   reconnect();
void   publishReading();
void   publishStatus(const char* status);
void   onMqttMessage(char* topic, byte* payload, unsigned int len);
float  measureDistance();
float  calculateWaterLevel(float distanceCm);
float  readBatteryLevel();
float  getSignalStrength();
String assessQuality(float distanceCm, float waterLevel);
float  round2(float value);

// ================================================================
//  SETUP
// ================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    // Build MQTT topic strings from SENSOR_UID
    snprintf(TOPIC_READINGS, sizeof(TOPIC_READINGS), "ddas/sensors/%s/readings", SENSOR_UID);
    snprintf(TOPIC_STATUS,   sizeof(TOPIC_STATUS),   "ddas/sensors/%s/status",   SENSOR_UID);
    snprintf(TOPIC_CONFIG,   sizeof(TOPIC_CONFIG),   "ddas/sensors/%s/config",   SENSOR_UID);

    Serial.println("\n========================================");
    Serial.println("  DDAS ESP32 MQTT Firmware v3.0");
    Serial.printf ("  Sensor    : HC-SR04 Ultrasonic\n");
    Serial.printf ("  Sensor UID: %s\n", SENSOR_UID);
    Serial.printf ("  Dam ID    : %d\n", DAM_ID);
    Serial.printf ("  Broker    : %s:%d\n", MQTT_BROKER, MQTT_PORT);
    Serial.printf ("  Pub Topic : %s\n", TOPIC_READINGS);
    Serial.printf ("  Sub Topic : %s\n", TOPIC_CONFIG);
    Serial.printf ("  Send Rate : %lums\n", SEND_RATE_MS);
    Serial.println("========================================\n");

    // HC-SR04 pin setup
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    digitalWrite(TRIG_PIN, LOW);

    // WiFi connect
    setup_wifi();

    // MQTT setup
    client.setServer(MQTT_BROKER, MQTT_PORT);
    client.setCallback(onMqttMessage);
    client.setKeepAlive(60);
    client.setBufferSize(512);

    // Initial MQTT connect
    reconnect();

    Serial.println("[DDAS] Ready. Publishing every " + String(SEND_RATE_MS / 1000) + "s\n");
}

// ================================================================
//  MAIN LOOP
// ================================================================

void loop() {
    // MQTT connection check (non-blocking)
    if (!client.connected()) {
        unsigned long now = millis();
        if (now - lastReconnectAttempt >= MQTT_RECONNECT_MS) {
            lastReconnectAttempt = now;
            reconnect();
        }
        return;
    }

    client.loop();  // Incoming MQTT messages process කරන්න

    unsigned long now = millis();

    // Sensor reading publish
    if (now - lastSendTime >= SEND_RATE_MS || lastSendTime == 0) {
        lastSendTime = now;
        publishReading();
    }

    // Device status heartbeat
    if (now - lastStatusTime >= STATUS_INTERVAL_MS || lastStatusTime == 0) {
        lastStatusTime = now;
        publishStatus("active");
    }
}

// ================================================================
//  WIFI (ඔබේ example function name: setup_wifi)
// ================================================================

void setup_wifi() {
    delay(10);
    Serial.printf("[WIFI] Connecting to: %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 40) {
        delay(500);
        Serial.print(".");
        retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" Connected!");
        Serial.printf("[WIFI] IP: %s | RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println(" FAILED! (will retry in loop)");
    }
}

// ================================================================
//  MQTT RECONNECT (ඔබේ example function name: reconnect)
//  Last Will & Testament (LWT) සමග
// ================================================================

void reconnect() {
    if (client.connected()) return;

    Serial.print("[MQTT] Connecting...");

    // LWT payload — unexpected disconnect detect කිරීමට
    StaticJsonDocument<128> lwtDoc;
    lwtDoc["sensorUid"] = SENSOR_UID;
    lwtDoc["status"]    = "offline";
    lwtDoc["reason"]    = "unexpected_disconnect";
    char lwtPayload[128];
    serializeJson(lwtDoc, lwtPayload, sizeof(lwtPayload));

    bool connected;
    if (strlen(MQTT_USERNAME) > 0) {
        connected = client.connect(DEVICE_NAME,
                                   MQTT_USERNAME, MQTT_PASSWORD,
                                   TOPIC_STATUS, 1, true, lwtPayload);
    } else {
        // ඔබේ example: client.connect("ESP32DamSensorClient")
        connected = client.connect(DEVICE_NAME,
                                   nullptr, nullptr,
                                   TOPIC_STATUS, 1, true, lwtPayload);
    }

    if (connected) {
        Serial.println(" Connected!");

        // Config topic subscribe (server updates ලැබීමට)
        client.subscribe(TOPIC_CONFIG, 1);
        Serial.printf("[MQTT] Subscribed: %s\n", TOPIC_CONFIG);

        // Online status announce (retained)
        publishStatus("active");

    } else {
        int state = client.state();
        Serial.printf(" Failed! State=%d\n", state);
        // State code meanings:
        // -4 = TIMEOUT | -3 = LOST | -2 = FAILED | -1 = DISCONNECTED
        //  1 = BAD_PROTOCOL |  2 = BAD_CLIENT_ID |  4 = BAD_CREDENTIALS
        Serial.printf("[MQTT] Broker: %s:%d | Check IP and allow_anonymous\n",
                      MQTT_BROKER, MQTT_PORT);
        delay(5000);
    }
}

// ================================================================
//  MQTT MESSAGE CALLBACK
//  Server config updates receive කිරීමට
// ================================================================

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
    Serial.printf("[MQTT] Received on: %s\n", topic);

    if (String(topic) == String(TOPIC_CONFIG)) {
        DynamicJsonDocument doc(256);
        DeserializationError err = deserializeJson(doc, payload, length);

        if (!err) {
            int newInterval = doc["readingIntervalSeconds"] | serverIntervalSeconds;
            if (newInterval != serverIntervalSeconds) {
                Serial.printf("[CONFIG] Interval changed: %ds → %ds\n",
                              serverIntervalSeconds, newInterval);
                serverIntervalSeconds = newInterval;
            }
            Serial.printf("[CONFIG] Updated: interval=%ds\n", serverIntervalSeconds);
        } else {
            Serial.printf("[CONFIG] JSON error: %s\n", err.c_str());
        }
    }
}

// ================================================================
//  SENSOR: HC-SR04 MEASUREMENT
// ================================================================

/**
 * HC-SR04 Distance Measurement.
 *
 * Principle:
 *  1. TRIG pin LOW → HIGH (10µs pulse) → sensor emits 40kHz ultrasonic burst
 *  2. ECHO pin goes HIGH until echo returns
 *  3. duration = echo HIGH time (microseconds)
 *  4. distance_cm = duration × speed_of_sound / 2
 *     (÷2 because sound travels TO surface and BACK)
 *
 * Returns: distance in centimeters (-1.0 if timeout/out of range)
 */
float measureDistance() {
    // Trigger pulse
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);    // ← ඔබේ example: delayMicroseconds(10)
    digitalWrite(TRIG_PIN, LOW);

    // Echo pulse measure (timeout = 30000µs → ~5m max range)
    long duration = pulseIn(ECHO_PIN, HIGH, 30000);

    if (duration == 0) {
        Serial.println("[SENSOR] Timeout! Object out of range or no echo.");
        return -1.0;
    }

    // Distance formula: d = (duration × speed) / 2
    // ← ඔබේ example: duration * SOUND_SPEED / 2
    float distanceCm = duration * SOUND_SPEED_CM_US / 2.0;

    return distanceCm;
}

/**
 * Convert sensor distance to DAM WATER LEVEL (meters).
 *
 * Sensor top of dam හි mount → ජලය දෙසට pointing
 * Water Level = Mount Height − Measured Distance
 *
 * Example:
 *   Mount height = 10m, Sensor reads 3m distance
 *   Water level  = 10 - 3 = 7m ✓
 *
 * Returns: water level in meters (-1.0 if invalid)
 */
float calculateWaterLevel(float distanceCm) {
    if (distanceCm < 0) return -1.0;  // Sensor timeout

    float distanceM = distanceCm / 100.0;  // cm → meters

    // Blind zone / out of range check
    if (distanceM < SENSOR_MIN_DISTANCE_M || distanceM > SENSOR_MAX_DISTANCE_M) {
        Serial.printf("[SENSOR] Distance %.2fm out of range [%.2f, %.2f]\n",
                      distanceM, SENSOR_MIN_DISTANCE_M, SENSOR_MAX_DISTANCE_M);
        return -1.0;
    }

    // ← ඔබේ example formula: waterLevelMeters = (duration * SOUND_SPEED / 2) / 100.0
    // Professional version: sensor mount height minus distance
    float waterLevel = SENSOR_MOUNT_HEIGHT_M - distanceM;

    // Clamp to valid range
    waterLevel = constrain(waterLevel, 0.0, DAM_MAX_WATER_LEVEL_M);

    return waterLevel;
}

// ================================================================
//  MQTT PUBLISH: SENSOR READING
//  ඔබේ example topic: "ddas/sensors/water_level"
//  Professional version: "ddas/sensors/{sensorUid}/readings"
// ================================================================

void publishReading() {
    // Take 3 measurements and average for stability
    const int SAMPLES = 3;
    float distanceSum = 0;
    int   validCount  = 0;

    for (int i = 0; i < SAMPLES; i++) {
        float d = measureDistance();
        if (d > 0) {
            distanceSum += d;
            validCount++;
        }
        delay(60);  // HC-SR04 minimum 60ms between measurements
    }

    if (validCount == 0) {
        consecutiveFailures++;
        Serial.printf("[SENSOR] All samples failed! (%d consecutive)\n", consecutiveFailures);
        publishStatus("faulty");
        return;
    }

    float distanceCm  = distanceSum / validCount;
    float waterLevel  = calculateWaterLevel(distanceCm);
    float batteryPct  = readBatteryLevel();
    float signalDbm   = getSignalStrength();
    String quality    = assessQuality(distanceCm, waterLevel);

    if (waterLevel < 0) {
        Serial.println("[SENSOR] Invalid water level calculated. Skipping publish.");
        consecutiveFailures++;
        return;
    }

    // ----------------------------------------------------------------
    //  JSON Payload (ArduinoJson v6: StaticJsonDocument)
    //  ← ඔබේ example: {"sensorId": 101, "damId": 1, "readingValue": X, "unit": "meters"}
    //  Professional version: additional metadata fields
    // ----------------------------------------------------------------
    StaticJsonDocument<256> doc;
    doc["sensorId"]       = SENSOR_ID;           // ← ඔබේ example field
    doc["damId"]          = DAM_ID;              // ← ඔබේ example field
    doc["sensorUid"]      = SENSOR_UID;
    doc["readingValue"]   = round2(waterLevel);  // ← ඔබේ example field
    doc["unit"]           = READING_UNIT;        // ← ඔබේ example field
    doc["distanceCm"]     = round2(distanceCm);  // Raw sensor value (debug)
    doc["quality"]        = quality;
    doc["batteryLevel"]   = round2(batteryPct);
    doc["signalStrength"] = round2(signalDbm);
    doc["uptimeMs"]       = millis();

    char payload[256];
    serializeJson(doc, payload, sizeof(payload));

    // Publish to MQTT topic
    // ← ඔබේ example: client.publish("ddas/sensors/water_level", payload.c_str());
    bool ok = client.publish(TOPIC_READINGS, payload, false);

    if (ok) {
        consecutiveFailures = 0;
        Serial.printf("[MQTT] ✓ Published → level=%.2fm | dist=%.1fcm | bat=%.1f%% | sig=%.0fdBm | q=%s\n",
                      waterLevel, distanceCm, batteryPct, signalDbm, quality.c_str());
        Serial.printf("[MQTT]   Topic  : %s\n", TOPIC_READINGS);
        Serial.printf("[MQTT]   Payload: %s\n", payload);
    } else {
        consecutiveFailures++;
        Serial.printf("[MQTT] ✗ Publish failed! (%d consecutive)\n", consecutiveFailures);
    }
}

// ================================================================
//  MQTT PUBLISH: DEVICE STATUS (Heartbeat + LWT)
// ================================================================

void publishStatus(const char* status) {
    StaticJsonDocument<256> doc;
    doc["sensorUid"]           = SENSOR_UID;
    doc["sensorId"]            = SENSOR_ID;
    doc["damId"]               = DAM_ID;
    doc["status"]              = status;
    doc["batteryLevel"]        = round2(readBatteryLevel());
    doc["signalStrength"]      = round2(getSignalStrength());
    doc["consecutiveFailures"] = consecutiveFailures;
    doc["uptimeMs"]            = millis();
    doc["firmwareVersion"]     = "3.0.0-mqtt-hcsr04";

    char payload[256];
    serializeJson(doc, payload, sizeof(payload));

    // Retained = true: Server always sees last known device status
    client.publish(TOPIC_STATUS, payload, true);
    Serial.printf("[STATUS] Published: %s\n", status);
}

// ================================================================
//  SENSOR HELPERS
// ================================================================

float readBatteryLevel() {
    const int SAMPLES = 5;
    float sum = 0;
    for (int i = 0; i < SAMPLES; i++) {
        sum += analogRead(BATTERY_PIN);
        delay(5);
    }
    float voltage = (sum / SAMPLES / 4095.0) * 3.3 * BATTERY_DIVIDER_RATIO;
    float pct = ((voltage - BATTERY_MIN_VOLTAGE) /
                 (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) * 100.0;
    return constrain(pct, 0.0, 100.0);
}

float getSignalStrength() {
    return (WiFi.status() == WL_CONNECTED) ? (float)WiFi.RSSI() : -100.0;
}

String assessQuality(float distanceCm, float waterLevel) {
    if (distanceCm < 0 || waterLevel < 0)           return "error";
    if (distanceCm / 100.0 < SENSOR_MIN_DISTANCE_M) return "suspect";  // Blind zone
    if (waterLevel >= DAM_MAX_WATER_LEVEL_M * 0.95)  return "critical"; // >95% full
    if (consecutiveFailures > 0)                     return "degraded";
    return "good";
}

float round2(float value) {
    return round(value * 100.0) / 100.0;
}
