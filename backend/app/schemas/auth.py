"""Pydantic schemas for authentication and OTP verification."""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str = "Student / Planner"
    plan_tier: str = "Go"
    avatar_color: str = "#10b981"
    is_verified: bool = True


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None


class SignupResponse(BaseModel):
    status: str = "pending_otp"
    email: str
    message: str
    expires_in_seconds: Optional[int] = 300
    access_token: Optional[str] = None
    user: Optional[UserProfileResponse] = None



class VerifyOtpRequest(BaseModel):
    email: str = Field(..., min_length=3)
    otp: str = Field(..., min_length=4, max_length=8)


class ResendOtpRequest(BaseModel):
    email: str = Field(..., min_length=3)


class AuthResponse(BaseModel):
    success: bool = True
    user: UserProfileResponse
    access_token: str
    token_type: str = "bearer"
    message: str
