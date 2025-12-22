import requests
import random
import time

WA_API_URL = "https://api.aliffajriadi.my.id/botwa/api/kirim-pesan"
WA_API_KEY = "apikeyrivaldokelompokpbliot02334"

otp_storage = {}
OTP_EXPIRE_SECONDS = 300


def normalize_phone(phone: str) -> str:
    phone = phone.strip()
    if phone.startswith("0"):
        return "62" + phone[1:]
    return phone


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def send_otp_whatsapp(phone_number: str) -> bool:
    phone_number = normalize_phone(phone_number)
    otp = generate_otp()

    payload = {
        "nomor": phone_number,
        "pesan": f"Kode OTP ResQ Freeze kamu adalah: {otp}\n\nBerlaku 5 menit."
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": WA_API_KEY
    }

    try:
        response = requests.post(WA_API_URL, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            otp_storage[phone_number] = {
                "otp": otp,
                "expired_at": time.time() + OTP_EXPIRE_SECONDS
            }
            print("OTP DISIMPAN:", phone_number, otp)
            return True

    except Exception as e:
        print("❌ WhatsApp OTP Error:", e)

    return False


def verify_otp(phone_number: str, otp: str) -> bool:
    phone_number = normalize_phone(phone_number)
    data = otp_storage.get(phone_number)

    print("VERIFY OTP:", phone_number, otp, data)

    if not data:
        return False

    if time.time() > data["expired_at"]:
        del otp_storage[phone_number]
        return False

    if data["otp"] != otp:
        return False

    del otp_storage[phone_number]
    return True
