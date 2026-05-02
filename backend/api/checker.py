from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.api.auth import get_current_user
from app.models.user import UserOut
from app.services.checker_service import check_assignment
from app.database import get_db
from bson import ObjectId

router = APIRouter()


@router.post("/check/{assignment_id}")
async def trigger_check(
    assignment_id: str,
    background_tasks: BackgroundTasks,
    current_user: UserOut = Depends(get_current_user)
):
    db = get_db()
    try:
        obj_id = ObjectId(assignment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid assignment ID")

    assignment = await db.assignments.find_one({"_id": obj_id}, {"extracted_text": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Only teacher or owner can trigger check
    if current_user.role == "student" and assignment["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    background_tasks.add_task(check_assignment, assignment_id)
    return {"message": "Check triggered", "assignment_id": assignment_id}


@router.get("/result/{assignment_id}")
async def get_result(
    assignment_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    db = get_db()

    result = await db.results.find_one({"assignment_id": assignment_id})
    if not result:
        # Check if assignment exists and its status
        try:
            assignment = await db.assignments.find_one(
                {"_id": ObjectId(assignment_id)},
                {"status": 1, "student_id": 1}
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid assignment ID")

        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        status = assignment.get("status", "pending")
        if status in ("pending", "checking"):
            return {"status": status, "message": "Check in progress..."}

        raise HTTPException(status_code=404, detail="Result not found")

    # Students can only see their own results
    if current_user.role == "student" and result["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result["id"] = str(result["_id"])
    result.pop("_id")
    return result