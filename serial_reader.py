# serial_reader.py
import serial
import json
import requests
import time
import sys

# Konfigurasi
SERIAL_PORT = "COM6"        # GANTI SESUAI PORT ESP32 KAMU
BAUD_RATE = 115200
FASTAPI_URL = "http://localhost:8000/api/sensors/"

def main():
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
        print(f"✅ Terhubung ke {SERIAL_PORT}")
        time.sleep(2)  # tunggu ESP32 stabil

        while True:
            line = ser.readline().decode('utf-8').strip()
            if line and line.startswith('{'):
                try:
                    # Parse JSON
                    data = json.loads(line)
                    print("📡 Terima:", data)

                    # Validasi minimal
                    if all(k in data for k in ['temperature', 'humidity', 'voc']):
                        # Kirim ke FastAPI
                        resp = requests.post(FASTAPI_URL, json=data, timeout=5)
                        print("📤 Status:", resp.status_code, resp.json())
                    else:
                        print("⚠️ Data tidak lengkap:", data)
                except json.JSONDecodeError:
                    print("⚠️ Bukan JSON:", line)
                except requests.RequestException as e:
                    print("❌ Gagal kirim ke FastAPI:", e)
    except serial.SerialException as e:
        print("❌ Gagal buka port serial:", e)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Berhenti.")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()

if __name__ == "__main__":
    main()