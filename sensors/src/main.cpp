#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ----------------- PIN KONFIG -----------------
const int SDA_PIN   = 21;    // LCD SDA
const int SCL_PIN   = 22;    // LCD SCL
const int MQ_AO_PIN = 34;    // MQ135 Analog Output → GPIO34
const int DHT_PIN   = 26;    // DHT22 Data

#define DHT_TYPE DHT22

// ----------------- OBJEK -----------------
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHT_TYPE);

// ----------------- KONFIGURASI MQ135 -----------------
const float RL = 10.0;       // Resistor load modul MQ135 (biasanya 10kΩ)
float RO = 0.0;              // Akan dikalibrasi saat startup

// ----------------- VARIABEL GLOBAL -----------------
unsigned long lastDhtRead = 0;
const unsigned long DHT_INTERVAL_MS = 2000;
float lastTemp = NAN;
float lastHum  = NAN;
float lastPpm  = 0.0;

// ----------------- FUNGSI PERHITUNGAN -----------------
float calculateSensorResistance(int analogValue) {
  if (analogValue <= 1) analogValue = 2; // hindari div by zero
  return ((4095.0 / analogValue) - 1) * RL;
}

float calculateRsRo(float sensorResistance) {
  if (RO <= 0) return 0;
  return sensorResistance / RO;
}

float ppmFromRsRo(float rsRo) {
  if (rsRo <= 0) return 0;
  // Rumus: ppm = 100 * (Rs/R0)^(-2.0) → cocok untuk CO2 & gas umum MQ135
  return 100.0 * pow(rsRo, -2.0);
}

// ----------------- KALIBRASI R0 -----------------
void calibrateRO() {
  Serial.println("🔧 Kalibrasi R0 selama 10 detik...");
  Serial.println("Pastikan sensor DI UDARA BERSIH (jauh dari asap/sayur busuk)!");
  delay(10000);

  int sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(MQ_AO_PIN);
    delay(500);
  }
  int avg = sum / 10;

  float sensorRs = calculateSensorResistance(avg);
  RO = sensorRs / 4.4; // 4.4 ≈ Rs/R0 di udara bersih (CO2 ~400ppm)
  Serial.printf("✅ R0 terkalibrasi: %.2f kΩ\n", RO);
}

// ----------------- STATUS GAS -----------------
String getGasStatus(float ppm) {
  if (ppm < 50) {
    return "SEGAR     ";
  } else if (ppm < 150) {
    return "MULAI LAYU";
  } else if (ppm < 400) {
    return "HMPR BUSUK";
  } else {
    return "BUSUK     ";
  }
}

// ----------------- UPDATE LCD -----------------
void updateDisplay() {
  char line0[17];
  char line1[17];

  if (isnan(lastTemp) || isnan(lastHum)) {
    snprintf(line0, sizeof(line0), "T: --.-C H: --%%");
  } else {
    snprintf(line0, sizeof(line0), "T:%4.1fC H:%2.0f%%", lastTemp, lastHum);
  }

  String status = getGasStatus(lastPpm);
  snprintf(line1, sizeof(line1), "GAS: %s", status.c_str());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line0);
  lcd.setCursor(0, 1);
  lcd.print(line1);
}

// ----------------- BACA SENSOR -----------------
void readSensors() {
  // Baca DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    lastTemp = t;
    lastHum  = h;
  }

  // Baca MQ135
  int analogValue = analogRead(MQ_AO_PIN);
  float sensorRs = calculateSensorResistance(analogValue);
  float rsRo = calculateRsRo(sensorRs);
  lastPpm = ppmFromRsRo(rsRo);
}

// ----------------- SETUP -----------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n🚀 ESP32 + MQ135(AO) + DHT22 + LCD I2C");

  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Inisialisasi...");

  dht.begin();
  pinMode(MQ_AO_PIN, INPUT);

  calibrateRO(); // Kalibrasi R0 saat startup

  readSensors();
  updateDisplay();
}

// ----------------- LOOP -----------------
void loop() {
  unsigned long now = millis();

  if (now - lastDhtRead >= DHT_INTERVAL_MS) {
    lastDhtRead = now;
    readSensors();
    updateDisplay();

    // Kirim JSON ke Serial (untuk Python → FastAPI)
    if (!isnan(lastTemp) && !isnan(lastHum)) {
      Serial.printf("{\"temperature\": %.2f, \"humidity\": %.2f, \"voc\": %.1f}\n", lastTemp, lastHum, lastPpm);
    }
  }

  delay(100);
}