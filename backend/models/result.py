from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CheckResult(BaseModel):
    assignment_id: str
    student_id: str

    # Grammar
    grammar_score: float
    total_grammar_errors: int
    grammar_errors: List[dict] = []

    # Plagiarism
    plagiarism_score: float
    is_plagiarized: bool
    similarity_score: float
    matched_assignments: List[dict] = []

    # Content
    content_score: float
    relevance: float
    structure: float
    depth: float
    clarity: float
    strengths: List[str] = []
    improvements: List[str] = []
    content_summary: str = ""

    # Final
    final_score: float
    grade: str

    # Teacher override
    teacher_grade: Optional[str] = None
    teacher_comment: Optional[str] = None
    overridden_by: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)