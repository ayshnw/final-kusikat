from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, Date, ForeignKey, Enum
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime
from enum import Enum as PyEnum


# =============== ENUMS ===============
class SenderType(PyEnum):
    user = "user"
    bot = "bot"


class MessageType(PyEnum):
    text = "text"
    recipe = "recipe"


# =============== MODELS ===============

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


class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    temperature = Column(Float)
    humidity = Column(Float)
    voc = Column(Float)  
    status = Column(String(20), nullable=True)  
    recorded_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    sent_date = Column(Date, nullable=True)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), nullable=False, index=True)
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)


class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_type = Column(String(10), nullable=False, default="text") 
    sender = Column(String(10), nullable=False)                        
    content = Column(Text, nullable=True)          
    recipe_name = Column(String(255), nullable=True)
    ingredients = Column(Text, nullable=True)      
    steps = Column(Text, nullable=True)         
    created_at = Column(DateTime, default=func.now(), nullable=False)