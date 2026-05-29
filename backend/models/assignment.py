from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)


class AssignmentInDB(BaseModel):
    id: Optional[str] = None
    student_id: str
    student_name: str
    title: str
    subject: str
    filename: str
    extracted_text: str
    word_count: int
    status: Literal["pending", "checking", "done", "error"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AssignmentOut(BaseModel):
    id: str
    student_id: str
    student_name: str
    title: str
    subject: str
    filename: str
    word_count: int
    status: str
    created_at: datetime