from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ===================================================================
# 🔐 User Authentication & Management
# ===================================================================

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone_number: str = Field(..., pattern=r"^\+?[\d\s\-\(\)]{10,15}$")


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    phone_number: Optional[str] = None

    model_config = {"from_attributes": True}


# ===================================================================
# 🔑 Password & Profile Management
# ===================================================================

class SetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class UpdatePhoneRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[\d\s\-\(\)]{10,15}$")


# ===================================================================
# 📧 Forgot Password & OTP
# ===================================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., pattern=r"^\d{6}$")  # OTP 6 digit


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)


# ===================================================================
# 📊 Sensor Data
# ===================================================================

class SensorData(BaseModel):
    temperature: float = Field(..., ge=-20, le=60)
    humidity: float = Field(..., ge=0, le=100)
    voc: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(
        None,
        pattern=r"^(segar|mulai_layu|hampir_busuk|busuk)$"
    )
    recorded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SensorDataCreate(BaseModel):
    temperature: float = Field(..., ge=-20, le=60)
    humidity: float = Field(..., ge=0, le=100)
    voc: float = Field(..., ge=0)
    status: Optional[str] = Field(
        None,
        pattern=r"^(segar|mulai_layu|hampir_busuk|busuk)$"
    )


# ===================================================================
# 🤖 AI & Chatbot Schemas
# ===================================================================

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class ChatResponse(BaseModel):
    reply: str


class RecipeRequest(BaseModel):
    user_message: str = Field(..., min_length=1)
    vegetable_name: str = Field(default="Bayam", min_length=1)
    freshness_status: str = Field(
        ...,
        pattern=r"^(Segar|Mulai Layu|Hampir Busuk|Busuk)$"
    )
    temperature: float = Field(..., ge=-20, le=60)
    humidity: float = Field(..., ge=0, le=100)
    voc: Optional[float] = Field(None, ge=0)


class RecipeResponse(BaseModel):
    recipe_name: str = Field(..., min_length=1, max_length=100)
    ingredients: List[str] = Field(..., min_items=1)
    steps: List[str] = Field(..., min_items=1)