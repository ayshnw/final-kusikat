from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SenderType(str, Enum):
    user = "user"
    bot = "bot"


class MessageType(str, Enum):
    text = "text"
    recipe = "recipe"


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


class SetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class UpdatePhoneRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+?[\d\s\-\(\)]{10,15}$")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., pattern=r"^\d{6}$")


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)


class VerifyOtpRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    phone_number: str
    otp: str = Field(..., pattern=r"^\d{6}$")


class SensorData(BaseModel):
    temperature: float = Field(..., ge=-20, le=60)
    humidity: float = Field(..., ge=0, le=100)
    voc: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(
        None,
        pattern=r"^(?i)(segar|mulai layu|hampir busuk|busuk)$"
    )
    recorded_at: Optional[datetime] = None
    model_config = {"from_attributes": True}

class SensorDataCreate(BaseModel):
    temperature: float = Field(..., ge=-20, le=60)
    humidity: float = Field(..., ge=0, le=100)
    voc: float = Field(..., ge=0)
    status: Optional[str] = Field(
        None,
        pattern=r"^(?i)(segar|mulai layu|hampir busuk|busuk)$"
    )


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    time_context: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


class RecipeRequest(BaseModel):
    food_item: str = Field(default="Bayam", min_length=1)
    freshness_status: str = Field(
        ...,
        pattern=r"^(?i)(segar|mulai layu|hampir busuk|busuk)$"
    )
    temperature: float = Field(..., ge=-20, le=60)
    humidity: float = Field(..., ge=0, le=100)
    voc: Optional[float] = Field(None, ge=0)
    estimated_days_left: Optional[float] = None


class RecipeResponse(BaseModel):
    recipe_name: str = Field(..., min_length=1, max_length=100)
    ingredients: List[str] = Field(..., min_items=1)
    steps: List[str] = Field(..., min_items=1)
    estimated_days_left: Optional[float] = None


class ChatMessageBase(BaseModel):
    message_type: MessageType
    sender: SenderType
    content: Optional[str] = None
    recipe_name: Optional[str] = None
    ingredients: Optional[List[str]] = None
    steps: Optional[List[str]] = None


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessage(ChatMessageBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryRequest(BaseModel):
    messages: List[ChatMessageCreate]


class ClearChatHistoryResponse(BaseModel):
    message: str = "Riwayat chat berhasil dihapus"


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    sent_at: Optional[datetime] = None
    sent_date: Optional[str] = None

    model_config = {"from_attributes": True}