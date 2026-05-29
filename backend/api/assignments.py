from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from models.user import UserOut
from models.assignment import AssignmentOut
from api.auth import get_current_user, require_student
from utils.file_parser import extract_text_from_upload
from database import get_db
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter()


def serialize_assignment(a: dict) -> dict:
    a["id"] = str(a["_id"])
    a.pop("extracted_text", None)  # Don't expose raw text in list
    return a


@router.post("/submit", status_code=201)
async def submit_assignment(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    subject: str = Form(...),
    file: UploadFile = File(...),
    current_user: UserOut = Depends(require_student)
):
    db = get_db()

    # Extract text from uploaded file
    extracted_text, filename = await extract_text_from_upload(file)
    word_count = len(extracted_text.split())

    # Save assignment to DB
    assignment_doc = {
        "student_id": current_user.id,
        "student_name": current_user.name,
        "title": title,
        "subject": subject,
        "filename": filename,
        "extracted_text": extracted_text,
        "word_count": word_count,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    result = await db.assignments.insert_one(assignment_doc)
    assignment_id = str(result.inserted_id)

    # Auto-trigger check in background
    background_tasks.add_task(run_check_background, assignment_id)

    return {
        "id": assignment_id,
        "title": title,
        "subject": subject,
        "filename": filename,
        "word_count": word_count,
        "status": "checking",
        "message": "Assignment submitted. Checking in progress..."
    }


async def run_check_background(assignment_id: str):
    """Background task to run all checks"""
    from services.checker_service import check_assignment
    try:
        await check_assignment(assignment_id)
    except Exception as e:
        db = get_db()
        await db.assignments.update_one(
            {"_id": ObjectId(assignment_id)},
            {"$set": {"status": "error"}}
        )
        print(f"❌ Check failed for {assignment_id}: {e}")


@router.get("/my", response_model=List[dict])
async def get_my_assignments(current_user: UserOut = Depends(get_current_user)):
    db = get_db()
    cursor = db.assignments.find(
        {"student_id": current_user.id},
        {"extracted_text": 0}  # Exclude raw text from list
    ).sort("created_at", -1)

    assignments = []
    async for a in cursor:
        a["id"] = str(a["_id"])
        a.pop("_id")
        assignments.append(a)

    return assignments


@router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    db = get_db()
    try:
        obj_id = ObjectId(assignment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid assignment ID")

    a = await db.assignments.find_one({"_id": obj_id}, {"extracted_text": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Students can only see their own
    if current_user.role == "student" and a["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    a["id"] = str(a["_id"])
    a.pop("_id")
    return a