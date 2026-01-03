from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone, date as dt_date
import os
import smtplib
import random
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from contextlib import asynccontextmanager
import requests
from typing import List
import re

# === ROUTES ===
from app.routes.ai import router as ai_router
from app.auth.google_auth import router as google_auth
from app.auth.manual_auth import router as manual_auth_router

# === DATABASE & MODELS ===
from app.database import SessionLocal, engine, Base
from app.models import User, PasswordResetToken, Sensor, Notification, ChatHistory
from passlib.context import CryptContext

# === SCHEMAS ===
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    SetPasswordRequest,
    ChangePasswordRequest,
    UpdatePhoneRequest,
    SensorDataCreate,
    ChatMessage,
    ChatMessageCreate,
)

from app.auth.jwt_handler import create_access_token


# === Setup ===
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    if len(password) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔥 VALIDASI SECRET_KEY
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("❌ SECRET_KEY belum diset di environment!")
ALGORITHM = "HS256"
security = HTTPBearer()

def verify_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    payload = verify_token(credentials.credentials)
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return user


# 🔥 FUNGSI VALIDASI NOMOR TELEPON (tanpa lib tambahan)
def clean_phone_number(raw: str) -> str:
    """
    Normalisasi & validasi nomor:
    - Hapus spasi/simbol
    - 08xx → +628xx
    - Pastikan format: +628[8-12 digit]
    """
    if not raw or not isinstance(raw, str):
        raise ValueError("Nomor telepon wajib diisi")
    # Hapus semua non-digit kecuali '+' di awal
    cleaned = re.sub(r"[^\d+]", "", raw.strip())
    # Konversi 08 → +628
    if cleaned.startswith("0"):
        cleaned = "62" + cleaned[1:]
    if cleaned.startswith("62"):
        cleaned = "+" + cleaned
    # Validasi: +628 diikuti 8-12 digit
    if not re.match(r"^\+628[0-9]{8,12}$", cleaned):
        raise ValueError("Nomor telepon tidak valid (contoh: 081234567890)")
    return cleaned


# === Fungsi Kirim WA saat Status Berubah ===
def _send_wa_if_status_changed(
    new_status: str,
    previous_status: str,
    phone: str,
    current_user: User,
    db: Session
):
    if new_status == previous_status:
        return

    title = f"{previous_status} -> {new_status}"
    msg = (
        f"🔄 Status sayur Anda berubah!\n"
        f"Dari: {previous_status}\n"
        f"Menjadi: {new_status}\n\n"
        f"Periksa smart container Anda untuk detail lebih lanjut."
    )

    today = dt_date.today()
    existing = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.title == title,
        Notification.sent_date == today
    ).first()

    if existing:
        print(f"📅 Notifikasi transisi '{title}' sudah dikirim hari ini. Skip.")
        return

    try:
        clean_phone = clean_phone_number(phone)  # ✅ pakai fungsi validasi

        # 🔥 FIXED: URL tanpa spasi!
        url = "https://api.aliffajriadi.my.id/botwa/api/kirim-pesan"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": "apikeyrivaldokelompokpbliot02334"
        }
        payload = {"nomor": clean_phone, "pesan": msg}
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            new_notif = Notification(
                user_id=current_user.id,
                title=title,
                message=msg,
                sent_at=datetime.now(timezone(timedelta(hours=7))),
                sent_date=today
            )
            db.add(new_notif)
            db.commit()
            print(f"✅ Notifikasi status '{title}' terkirim dan disimpan ke DB.")
        else:
            print(f"❌ Gagal kirim WA [{response.status_code}]: {response.text}")

    except Exception as e:
        print(f"Error kirim WA status change: {e}")


# === Lifespan ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ Membuat tabel database...")
    Base.metadata.create_all(bind=engine)
    
    # 🔥 Auto-create user ID=1 untuk IoT (jika belum ada)
    db = SessionLocal()
    try:
        default_user = db.query(User).filter(User.id == 1).first()
        if not default_user:
            print("⚠️  Membuat user default (id=1) untuk IoT...")
            default_user = User(
                id=1,
                username="iot_device",
                email="iot@resqfreeze.local",
                password=None,
                phone_number="081234567890"  # bisa di-update via API
            )
            db.add(default_user)
            db.commit()
            print("✅ User default (id=1) berhasil dibuat.")
        else:
            print("✅ User default (id=1) sudah ada.")
    except Exception as e:
        print(f"❌ Gagal create user default: {e}")
    finally:
        db.close()

    print("✅ Database siap.")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === ROUTER ===
app.include_router(google_auth, prefix="/auth")
app.include_router(ai_router, prefix="/api")
app.include_router(manual_auth_router, prefix="/api/auth")


# === ROOT ===
@app.get("/")
def root():
    return {"message": "Backend ResQ Freeze berjalan!"}


# ==================== 🔥 CHAT HISTORY ENDPOINTS ====================
@app.get("/api/chat-history", response_model=List[ChatMessage])
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_messages = db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id
    ).order_by(ChatHistory.created_at).all()

    result = []
    for msg in db_messages:
        ingredients = json.loads(msg.ingredients) if msg.ingredients else []
        steps = json.loads(msg.steps) if msg.steps else []
        result.append(ChatMessage(
            id=msg.id,
            user_id=msg.user_id,
            message_type=msg.message_type,
            sender=msg.sender,
            content=msg.content,
            recipe_name=msg.recipe_name,
            ingredients=ingredients,
            steps=steps,
            created_at=msg.created_at
        ))
    return result


@app.post("/api/chat-history", status_code=status.HTTP_201_CREATED)
def create_chat_message(
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ingredients_str = json.dumps(message.ingredients) if message.ingredients else None
    steps_str = json.dumps(message.steps) if message.steps else None

    db_message = ChatHistory(
        user_id=current_user.id,
        message_type=message.message_type,
        sender=message.sender,
        content=message.content,
        recipe_name=message.recipe_name,
        ingredients=ingredients_str,
        steps=steps_str
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return {"id": db_message.id}


@app.delete("/api/chat-history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(ChatHistory).filter(
        ChatHistory.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "Riwayat chat berhasil dihapus"}


@app.get("/api/notifications")
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = db.query(Notification)\
                      .filter(Notification.user_id == current_user.id)\
                      .order_by(Notification.sent_at.desc())\
                      .all()
    
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "sent_date": n.sent_date.isoformat() if n.sent_date else None,
        }
        for n in notifications
    ]


# === AUTH & USER ===
@app.post("/api/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(
        (User.email == request.email) | (User.username == request.username)
    ).first():
        raise HTTPException(400, "Username atau email sudah terdaftar")
    
    user = User(
        username=request.username,
        email=request.email,
        password=hash_password(request.password),
        phone_number=request.phone_number,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Registrasi berhasil!", "user": {"id": user.id, "username": user.username}}

@app.post("/api/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password):
        raise HTTPException(401, "Username atau password salah")
    
    token = create_access_token(
        data={"sub": user.email, "id": user.id},
        expires_delta=timedelta(hours=24)
    )
    return {
        "message": "Login berhasil",
        "access_token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email}
    }

@app.get("/api/me")
def me(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = verify_token(credentials.credentials)
    user = db.query(User).filter(User.id == payload.get("id")).first()
    if not user:
        raise HTTPException(404, "User tidak ditemukan")
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "phone_number": user.phone_number,
        "google_id": user.google_id,
        "has_password": user.password is not None
    }

@app.post("/api/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        return {"message": "Jika email terdaftar, kami telah mengirim kode OTP."}

    otp = str(random.randint(100000, 999999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)
    db.add(PasswordResetToken(email=request.email, otp=otp, expires_at=expires))
    db.commit()

    try:
        msg = MIMEMultipart()
        msg["From"] = "no-reply@resqfreeze.com"
        msg["To"] = request.email
        msg["Subject"] = "Kode OTP - Reset Password"
        msg.attach(MIMEText(
            f"Halo {user.username},\n\nKode OTP Anda: {otp}\n\nBerlaku 5 menit.",
            "plain"
        ))
        with smtplib.SMTP(os.getenv("EMAIL_HOST"), int(os.getenv("EMAIL_PORT"))) as server:
            server.starttls()
            server.login(os.getenv("EMAIL_USERNAME"), os.getenv("EMAIL_PASSWORD"))
            server.send_message(msg)
    except Exception as e:
        print("Gagal kirim email:", e)

    return {"message": "Jika email terdaftar, kami telah mengirim kode OTP."}

@app.post("/api/auth/request-otp")
def request_otp(
    phone_number: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    if not phone_number:
        raise HTTPException(400, "Nomor telepon wajib diisi")

    try:
        clean_phone = clean_phone_number(phone_number)  # ✅ validasi
    except ValueError as e:
        raise HTTPException(400, str(e))

    otp = str(random.randint(100000, 999999))

    try:
        # 🔥 FIXED: URL tanpa spasi!
        url = "https://api.aliffajriadi.my.id/botwa/api/kirim-pesan"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": "apikeyrivaldokelompokpbliot02334"
        }
        payload = {
            "nomor": clean_phone,
            "pesan": f"Kode OTP ResQ Freeze kamu adalah: {otp}\n\nBerlaku 5 menit."
        }

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code != 200:
            raise HTTPException(500, f"Gagal kirim OTP via WA: {response.text}")

        return {"message": "OTP dikirim ke WhatsApp", "otp": otp}

    except Exception as e:
        print(f"Error kirim OTP: {e}")
        raise HTTPException(500, "Gagal mengirim OTP")

@app.post("/api/verify-otp")
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.email == request.email,
        PasswordResetToken.otp == request.otp
    ).first()
    if not token or datetime.now(timezone.utc) > token.expires_at.replace(tzinfo=timezone.utc):
        if token:
            db.delete(token)
            db.commit()
        raise HTTPException(400, "OTP salah atau kadaluarsa")
    db.delete(token)
    db.commit()
    return {"success": True}

@app.post("/api/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(404, "User tidak ditemukan")
    user.password = hash_password(request.new_password)
    db.commit()
    return {"message": "Password berhasil diubah!"}

@app.post("/api/user/set-password")
def set_password(request: SetPasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.password:
        raise HTTPException(400, "Password sudah diatur. Gunakan 'Ganti Password'.")
    user.password = hash_password(request.new_password)
    db.commit()
    return {"message": "Password berhasil diatur"}

@app.put("/api/user/password")
def change_password(request: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.password:
        raise HTTPException(400, "Atur password terlebih dahulu.")
    if not verify_password(request.old_password, user.password):
        raise HTTPException(400, "Password lama salah.")
    user.password = hash_password(request.new_password)
    db.commit()
    return {"message": "Password berhasil diubah"}

@app.put("/api/user/phone")
def update_phone(request: UpdatePhoneRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        request.phone_number = clean_phone_number(request.phone_number)  # ✅ validasi saat update
    except ValueError as e:
        raise HTTPException(400, str(e))
    user.phone_number = request.phone_number
    db.commit()
    return {"message": "Nomor telepon diperbarui"}

@app.put("/api/user/username")
def update_username(
    request: dict = Body(..., example={"username": "Firli Hanifurahman"}),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_username = request.get("username", "").strip()
    if not new_username:
        raise HTTPException(400, "Username tidak boleh kosong")
    if len(new_username) < 3:
        raise HTTPException(400, "Username minimal 3 karakter")
    if len(new_username) > 50:
        raise HTTPException(400, "Username maksimal 50 karakter")
    if not re.match(r"^[a-zA-Z0-9_\- .']+$", new_username):
        raise HTTPException(400, "Username hanya boleh berisi huruf, angka, spasi, _, -, ., atau '")

    existing = db.query(User).filter(
        User.username == new_username,
        User.id != current_user.id
    ).first()
    if existing:
        raise HTTPException(409, "Username sudah digunakan oleh pengguna lain")

    current_user.username = new_username
    db.commit()

    return {
        "message": "Username berhasil diperbarui",
        "username": new_username
    }

# ==================== SENSOR ENDPOINTS ====================
@app.post("/api/sensors/", status_code=status.HTTP_201_CREATED)
def create_sensor_data(data: SensorDataCreate, db: Session = Depends(get_db)):
    default_user_id = 1
    user = db.query(User).filter(User.id == default_user_id).first()
    if not user:
        raise HTTPException(status_code=500, detail="User default (id=1) tidak ditemukan — cek lifespan!")

    if data.voc < 50:
        new_status = "segar"
    elif data.voc < 150:
        new_status = "mulai_layu"
    elif data.voc < 400:
        new_status = "hampir_busuk"
    else:
        new_status = "busuk"

    recorded_at = datetime.now(timezone(timedelta(hours=7)))

    last_sensor = db.query(Sensor).filter(Sensor.user_id == default_user_id)\
                                 .order_by(Sensor.recorded_at.desc()).first()
    previous_status = last_sensor.status if last_sensor else new_status

    sensor = Sensor(
        user_id=default_user_id,
        temperature=data.temperature,
        humidity=data.humidity,
        voc=data.voc,
        status=new_status,
        recorded_at=recorded_at
    )
    db.add(sensor)

    total = db.query(Sensor).filter(Sensor.user_id == default_user_id).count()
    if total > 100:
        recent_ids = db.query(Sensor.id)\
                       .filter(Sensor.user_id == default_user_id)\
                       .order_by(Sensor.recorded_at.desc())\
                       .limit(100)\
                       .subquery()
        db.query(Sensor)\
          .filter(Sensor.user_id == default_user_id)\
          .filter(~Sensor.id.in_(db.query(recent_ids.c.id)))\
          .delete(synchronize_session=False)

    db.commit()
    db.refresh(sensor)

    if user.phone_number and new_status != previous_status:
        _send_wa_if_status_changed(
            new_status=new_status,
            previous_status=previous_status,
            phone=user.phone_number,
            current_user=user,
            db=db
        )

    return {
        "message": "Data sensor berhasil disimpan",
        "id": sensor.id,
        "status": new_status,
        "recorded_at": sensor.recorded_at.isoformat()
    }

@app.get("/api/sensors/latest")
def get_latest_sensor(db: Session = Depends(get_db)):
    latest = db.query(Sensor).filter(Sensor.user_id == 1)\
                            .order_by(Sensor.recorded_at.desc()).first()
    if not latest:
        now_wib = datetime.now(timezone(timedelta(hours=7)))
        return {
            "temperature": 0.0,
            "humidity": 0.0,
            "voc": 0.0,
            "status": "segar",
            "recorded_at": now_wib.isoformat()
        }
    return {
        "id": latest.id,
        "user_id": latest.user_id,
        "temperature": float(latest.temperature) if latest.temperature is not None else 0.0,
        "humidity": float(latest.humidity) if latest.humidity is not None else 0.0,
        "voc": float(latest.voc) if latest.voc is not None else 0.0,
        "status": latest.status or "segar", 
        "recorded_at": latest.recorded_at.isoformat() if latest.recorded_at else datetime.now(timezone(timedelta(hours=7))).isoformat()
    }

@app.get("/api/sensors/history")
def get_sensor_history(
    limit: int = Query(12, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 🔥 FIXED: ambil terbaru dulu, lalu reverse → urut waktu lama → baru
    data = (
        db.query(Sensor)
        .filter(Sensor.user_id == current_user.id)
        .order_by(Sensor.recorded_at.desc())  # DESC
        .limit(limit)
        .all()
    )[::-1]  # reverse → ASC

    return [
        {
            "timestamp": d.recorded_at.isoformat() if d.recorded_at else None,
            "suhu": float(d.temperature) if d.temperature is not None else None,
            "kelembapan": float(d.humidity) if d.humidity is not None else None,
            "voc": float(d.voc) if d.voc is not None else None,
            "status": d.status or "unknown"
        }
        for d in data
    ]

@app.post("/api/send-notification")
def send_notification_to_wa(
    request: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = request.get("message")
    phone = request.get("phone") or current_user.phone_number

    if not message:
        raise HTTPException(400, "Pesan wajib diisi")
    if not phone:
        raise HTTPException(400, "Nomor telepon tidak ditemukan. Silakan lengkapi profil Anda.")

    try:
        clean_phone = clean_phone_number(phone)  # ✅ validasi
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        # 🔥 FIXED: URL tanpa spasi!
        url = "https://api.aliffajriadi.my.id/botwa/api/kirim-pesan"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": "apikeyrivaldokelompokpbliot02334"
        }
        payload = {
            "nomor": clean_phone,
            "pesan": message
        }

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            return {"status": "success", "message": "Notifikasi terkirim ke WhatsApp"}
        else:
            raise HTTPException(500, f"Gagal kirim WA: {response.text}")

    except Exception as e:
        raise HTTPException(500, f"Error saat kirim WA: {str(e)}")