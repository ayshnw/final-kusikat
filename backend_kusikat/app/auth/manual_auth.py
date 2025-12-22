from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.database import get_db
from app.models import User
from app.utils.whatsapp_otp import send_otp_whatsapp, verify_otp
from app.schemas import VerifyOtpRegisterRequest

router = APIRouter()

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)


@router.post("/request-otp")
def request_otp(phone_number: str):
    if not send_otp_whatsapp(phone_number):
        raise HTTPException(status_code=500, detail="Gagal mengirim OTP")

    return {"message": "Kode OTP berhasil dikirim ke WhatsApp"}


@router.post("/verify-otp")
def verify_otp_and_register(
    request: VerifyOtpRegisterRequest,
    db: Session = Depends(get_db)
):
    # 1️⃣ Verifikasi OTP
    if not verify_otp(request.phone_number, request.otp):
        raise HTTPException(status_code=400, detail="OTP salah atau kadaluarsa")

    # 2️⃣ Cek email
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3️⃣ HASH PASSWORD (AMAN 72 BYTE)
    password = request.password
    if len(password) > 72:
        password = password[:72]

    hashed_password = pwd_context.hash(password)

    # 4️⃣ Simpan user
    user = User(
        username=request.name,
        email=request.email,
        password=hashed_password,
        phone_number=request.phone_number
    )

    db.add(user)
    db.commit()

    return {"message": "Verifikasi berhasil! Akun Anda telah dibuat."}
