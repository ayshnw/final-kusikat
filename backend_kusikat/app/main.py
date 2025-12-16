from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import os
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from contextlib import asynccontextmanager

from app.routes.ai import router as ai_router
from app.auth.google_auth import router as google_auth

from app.database import SessionLocal, engine, Base
from app.models import User, PasswordResetToken, Sensor

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
)

# Auth
from app.auth.jwt_handler import create_access_token


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

SECRET_KEY = os.getenv("SECRET_KEY")
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

def hash_password(password: str) -> str:
    if len(password) > 72:
        password = password[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    if len(plain) > 72:
        plain = plain[:72]
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ Membuat tabel database...")
    Base.metadata.create_all(bind=engine)
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

app.include_router(google_auth, prefix="/auth")
app.include_router(ai_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Backend ResQ Freeze berjalan!"}


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
        expires_delta=timedelta(minutes=60)
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
    user.phone_number = request.phone_number
    db.commit()
    return {"message": "Nomor telepon diperbarui"}


# ==================== SENSOR ENDPOINTS ====================
@app.get("/api/sensors/latest")
def get_latest_sensor(db: Session = Depends(get_db)):
    latest = db.query(Sensor).order_by(Sensor.recorded_at.desc()).first()
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
def get_sensor_history(limit: int = 12, db: Session = Depends(get_db)):
    # Pastikan limit tidak melebihi 100
    limit = min(limit, 100)
    data = db.query(Sensor).order_by(Sensor.recorded_at.desc()).limit(limit).all()[::-1]
    return [
        {
            "time": d.recorded_at.strftime("%H:%M") if d.recorded_at else "00:00",
            "suhu": float(d.temperature) if d.temperature is not None else 0.0,
            "kelembapan": float(d.humidity) if d.humidity is not None else 0.0,
            "voc": float(d.voc) if d.voc is not None else 0.0,
            "status": d.status or "segar" 
        }
        for d in data
    ]


# ============ ENDPOINT: TERIMA DATA SENSOR DARI ESP32 ============
@app.post("/api/sensors/", status_code=status.HTTP_201_CREATED)
def create_sensor_data(
    data: SensorDataCreate,
    db: Session = Depends(get_db)
):
    default_user_id = 1
    user = db.query(User).filter(User.id == default_user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User default (id=1) tidak ditemukan")

    if data.voc < 50:
        status_str = "segar"
    elif data.voc < 150:
        status_str = "mulai_layu"
    elif data.voc < 400:
        status_str = "hampir_busuk"
    else:
        status_str = "busuk"

    recorded_at = datetime.now(timezone(timedelta(hours=7)))

    sensor = Sensor(
        user_id=default_user_id,
        temperature=data.temperature,
        humidity=data.humidity,
        voc=data.voc,
        status=status_str,
        recorded_at=recorded_at
    )
    db.add(sensor)

    # === AUTO-CLEANUP: HANYA SIMPAN 100 DATA TERBARU ===
    total = db.query(Sensor).count()
    if total > 100:
        # Ambil ID 100 data terbaru
        recent_ids = db.query(Sensor.id)\
                       .order_by(Sensor.recorded_at.desc())\
                       .limit(100)\
                       .subquery()
        # Hapus semua selain 100 terbaru
        db.query(Sensor)\
          .filter(~Sensor.id.in_(db.query(recent_ids.c.id)))\
          .delete(synchronize_session=False)

    db.commit()
    db.refresh(sensor)

    return {
        "message": "Data sensor berhasil disimpan",
        "id": sensor.id,
        "recorded_at": sensor.recorded_at.isoformat()
    }