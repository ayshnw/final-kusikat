import requests

# ================== KONFIGURASI ==================
WA_API_URL = "https://api.aliffajriadi.my.id/botwa/api/kirim-pesan"  # ✅ SPASI DIHAPUS!
WA_API_KEY = "apikeyrivaldokelompokpbliot02334"

# GANTI NOMOR INI (FORMAT WA, AWALI 62)
PHONE_NUMBER = "6282268660185"

MESSAGE = "✅ Testing Bot WA berhasil!\n\nIni pesan dari test_bot_wa.py 🚀"

# ================== REQUEST ==================
headers = {
    "Content-Type": "application/json",
    "x-api-key": WA_API_KEY
}

payload = {
    "nomor": PHONE_NUMBER,
    "pesan": MESSAGE
}

print("📨 Mengirim pesan ke WhatsApp...")

try:
    response = requests.post(
        WA_API_URL,
        json=payload,
        headers=headers,
        timeout=10
    )

    print("Status Code:", response.status_code)
    print("Response:", response.text)

    if response.status_code == 200:
        print("✅ BERHASIL: Pesan terkirim ke WhatsApp")
    else:
        print("❌ GAGAL: Pesan tidak terkirim")

except Exception as e:
    print("❌ ERROR:", e)