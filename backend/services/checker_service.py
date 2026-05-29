import asyncio
from database import get_db
from services.grammar_service import check_grammar
from services.plagiarism_service import check_plagiarism
from services.content_service import analyze_content
from bson import ObjectId
from datetime import datetime


def calculate_grade(score: float) -> str:
    if score >= 9:
        return "A"
    elif score >= 7:
        return "B"
    elif score >= 5:
        return "C"
    elif score >= 3:
        return "D"
    else:
        return "F"


async def check_assignment(assignment_id: str) -> dict:
    db = get_db()

    # Fetch assignment
    assignment = await db.assignments.find_one({"_id": ObjectId(assignment_id)})
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    text = assignment.get("extracted_text", "")
    subject = assignment.get("subject", "General")

    # Update status to checking
    await db.assignments.update_one(
        {"_id": ObjectId(assignment_id)},
        {"$set": {"status": "checking"}}
    )

    # Run all checks in parallel
    grammar_result, plagiarism_result, content_result = await asyncio.gather(
        check_grammar(text),
        check_plagiarism(text, assignment_id),
        analyze_content(text, subject),
        return_exceptions=True
    )

    # Handle exceptions gracefully
    if isinstance(grammar_result, Exception):
        grammar_result = {"grammar_score": 5.0, "total_errors": 0, "errors": []}
    if isinstance(plagiarism_result, Exception):
        plagiarism_result = {"plagiarism_score": 10.0, "is_plagiarized": False, "similarity_score": 0, "matched_assignments": []}
    if isinstance(content_result, Exception):
        content_result = {"content_score": 5.0, "relevance": 5, "structure": 5, "depth": 5, "clarity": 5, "strengths": [], "improvements": [], "summary": ""}

    # Calculate weighted final score
    grammar_score = grammar_result.get("grammar_score", 5.0)
    content_score = content_result.get("content_score", 5.0)
    plagiarism_score = plagiarism_result.get("plagiarism_score", 10.0)
    is_plagiarized = plagiarism_result.get("is_plagiarized", False)

    # Weights: Grammar 30%, Content 50%, Plagiarism 20%
    final_score = (grammar_score * 0.30) + (content_score * 0.50) + (plagiarism_score * 0.20)

    # Override if plagiarized
    if is_plagiarized:
        final_score = 0.0

    final_score = round(final_score, 2)
    grade = calculate_grade(final_score)

    result_doc = {
        "assignment_id": assignment_id,
        "student_id": assignment["student_id"],

        # Grammar
        "grammar_score": grammar_score,
        "total_grammar_errors": grammar_result.get("total_errors", 0),
        "grammar_errors": grammar_result.get("errors", []),

        # Plagiarism
        "plagiarism_score": plagiarism_score,
        "is_plagiarized": is_plagiarized,
        "similarity_score": plagiarism_result.get("similarity_score", 0),
        "matched_assignments": plagiarism_result.get("matched_assignments", []),

        # Content
        "content_score": content_score,
        "relevance": content_result.get("relevance", 5),
        "structure": content_result.get("structure", 5),
        "depth": content_result.get("depth", 5),
        "clarity": content_result.get("clarity", 5),
        "strengths": content_result.get("strengths", []),
        "improvements": content_result.get("improvements", []),
        "content_summary": content_result.get("summary", ""),

        # Final
        "final_score": final_score,
        "grade": grade,
        "created_at": datetime.utcnow()
    }

    # Save result (upsert)
    await db.results.update_one(
        {"assignment_id": assignment_id},
        {"$set": result_doc},
        upsert=True
    )

    # Update assignment status
    await db.assignments.update_one(
        {"_id": ObjectId(assignment_id)},
        {"$set": {"status": "done", "grade": grade, "final_score": final_score}}
    )

    print(f"✅ Check complete: {assignment_id} — Grade: {grade} ({final_score}/10)")
    return result_doc