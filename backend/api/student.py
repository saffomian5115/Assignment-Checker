from fastapi import APIRouter, Depends, HTTPException
from api.auth import require_student, get_current_user
from models.user import UserOut
from database import get_db
from bson import ObjectId

router = APIRouter()


@router.get("/my-assignments")
async def my_assignments(current_user: UserOut = Depends(require_student)):
    db = get_db()
    cursor = db.assignments.find(
        {"student_id": current_user.id},
        {"extracted_text": 0}
    ).sort("created_at", -1)

    assignments = []
    async for a in cursor:
        a["id"] = str(a["_id"])
        a.pop("_id")
        assignments.append(a)
    return assignments


@router.get("/result/{assignment_id}")
async def get_my_result(
    assignment_id: str,
    current_user: UserOut = Depends(require_student)
):
    db = get_db()

    result = await db.results.find_one({"assignment_id": assignment_id})
    if not result:
        raise HTTPException(status_code=404, detail="Result not available yet")

    if result["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result["id"] = str(result["_id"])
    result.pop("_id")
    return result


@router.get("/progress")
async def my_progress(current_user: UserOut = Depends(require_student)):
    db = get_db()

    results_cursor = db.results.find(
        {"student_id": current_user.id}
    ).sort("created_at", 1)

    results = []
    async for r in results_cursor:
        results.append({
            "assignment_id": r["assignment_id"],
            "final_score": r["final_score"],
            "grade": r.get("teacher_grade") or r["grade"],
            "grammar_score": r["grammar_score"],
            "content_score": r["content_score"],
            "plagiarism_score": r["plagiarism_score"],
            "created_at": r["created_at"]
        })

    if not results:
        return {"submissions": 0, "progress": []}

    avg_score = round(sum(r["final_score"] for r in results) / len(results), 2)
    best_score = max(r["final_score"] for r in results)

    return {
        "submissions": len(results),
        "average_score": avg_score,
        "best_score": best_score,
        "progress": results
    }


@router.get("/notifications")
async def get_notifications(current_user: UserOut = Depends(get_current_user)):
    db = get_db()
    cursor = db.notifications.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).limit(20)

    notifications = []
    async for n in cursor:
        n["id"] = str(n["_id"])
        n.pop("_id")
        notifications.append(n)
    return notifications


@router.put("/notifications/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}