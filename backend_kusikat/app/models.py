from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.database import Base
from datetime import datetime


# Tabel User
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_expires = Column(DateTime, nullable=True)


# Tabel Sensor — dengan kolom status tambahan
class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    temperature = Column(Float)
    humidity = Column(Float)
    voc = Column(Float)  # nilai VOC dalam ppm
    status = Column(String(20), nullable=True)  # ✅ TAMBAHAN: "segar", "mulai_layu", "hampir_busuk", "busuk"
    recorded_at = Column(DateTime, default=datetime.utcnow)


# Tabel Password Reset Token
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), nullable=False, index=True)
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)