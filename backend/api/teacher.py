from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from api.auth import require_teacher
from models.user import UserOut
from database import get_db
from bson import ObjectId

router = APIRouter()


class GradeOverride(BaseModel):
    grade: str
    comment: Optional[str] = None


class CommentBody(BaseModel):
    comment: str


@router.get("/assignments")
async def get_all_assignments(current_user: UserOut = Depends(require_teacher)):
    db = get_db()
    cursor = db.assignments.find({}, {"extracted_text": 0}).sort("created_at", -1)
    assignments = []
    async for a in cursor:
        a["id"] = str(a["_id"])
        a.pop("_id")
        assignments.append(a)
    return assignments


@router.get("/assignment/{assignment_id}")
async def get_assignment_detail(
    assignment_id: str,
    current_user: UserOut = Depends(require_teacher)
):
    db = get_db()
    try:
        obj_id = ObjectId(assignment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    assignment = await db.assignments.find_one({"_id": obj_id}, {"extracted_text": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    result = await db.results.find_one({"assignment_id": assignment_id})

    assignment["id"] = str(assignment["_id"])
    assignment.pop("_id")

    if result:
        result["id"] = str(result["_id"])
        result.pop("_id")

    return {"assignment": assignment, "result": result}


@router.put("/assignment/{assignment_id}/grade")
async def override_grade(
    assignment_id: str,
    body: GradeOverride,
    current_user: UserOut = Depends(require_teacher)
):
    db = get_db()
    valid_grades = {"A", "B", "C", "D", "F"}
    if body.grade.upper() not in valid_grades:
        raise HTTPException(status_code=400, detail=f"Grade must be one of {valid_grades}")

    update_data = {
        "teacher_grade": body.grade.upper(),
        "teacher_comment": body.comment,
        "overridden_by": current_user.id
    }
    res = await db.results.update_one(
        {"assignment_id": assignment_id},
        {"$set": update_data}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Result not found")

    return {"message": "Grade updated", "grade": body.grade.upper()}


@router.post("/assignment/{assignment_id}/comment")
async def add_comment(
    assignment_id: str,
    body: CommentBody,
    current_user: UserOut = Depends(require_teacher)
):
    db = get_db()
    res = await db.results.update_one(
        {"assignment_id": assignment_id},
        {"$set": {"teacher_comment": body.comment, "overridden_by": current_user.id}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Result not found")
    return {"message": "Comment saved"}


@router.get("/analytics/overview")
async def analytics_overview(current_user: UserOut = Depends(require_teacher)):
    db = get_db()

    total = await db.assignments.count_documents({})
    pending = await db.assignments.count_documents({"status": {"$in": ["pending", "checking"]}})
    plagiarism_count = await db.results.count_documents({"is_plagiarized": True})

    # Average final score
    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$final_score"}}}]
    avg_cursor = db.results.aggregate(pipeline)
    avg_result = await avg_cursor.to_list(1)
    avg_score = round(avg_result[0]["avg"], 2) if avg_result else 0.0

    # Grade distribution
    grade_pipeline = [{"$group": {"_id": "$grade", "count": {"$sum": 1}}}]
    grade_cursor = db.results.aggregate(grade_pipeline)
    grade_dist = {}
    async for g in grade_cursor:
        grade_dist[g["_id"]] = g["count"]

    return {
        "total_assignments": total,
        "pending": pending,
        "plagiarism_cases": plagiarism_count,
        "average_score": avg_score,
        "grade_distribution": grade_dist
    }


@router.get("/analytics/student/{student_id}")
async def student_analytics(
    student_id: str,
    current_user: UserOut = Depends(require_teacher)
):
    db = get_db()

    results_cursor = db.results.find({"student_id": student_id})
    results = []
    async for r in results_cursor:
        r["id"] = str(r["_id"])
        r.pop("_id")
        results.append(r)

    if not results:
        return {"student_id": student_id, "submissions": 0, "results": []}

    avg_score = round(sum(r["final_score"] for r in results) / len(results), 2)
    avg_grammar = round(sum(r["grammar_score"] for r in results) / len(results), 2)
    avg_content = round(sum(r["content_score"] for r in results) / len(results), 2)

    return {
        "student_id": student_id,
        "submissions": len(results),
        "average_final_score": avg_score,
        "average_grammar_score": avg_grammar,
        "average_content_score": avg_content,
        "results": results
    }