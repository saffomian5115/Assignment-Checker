from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Literal["teacher", "student"] = "student"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    password_hash: str
    role: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None