import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import get_db
from bson import ObjectId
from typing import List

PLAGIARISM_THRESHOLD = 0.7


def preprocess_text(text: str) -> str:
    """Lowercase and remove punctuation"""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def calculate_similarity(text1: str, text2: str) -> float:
    """Cosine similarity between two texts using TF-IDF"""
    try:
        processed = [preprocess_text(text1), preprocess_text(text2)]
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=1,
            stop_words='english'
        )
        tfidf_matrix = vectorizer.fit_transform(processed)
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        return float(similarity[0][0])
    except Exception:
        return 0.0


async def check_plagiarism(new_text: str, assignment_id: str) -> dict:
    """
    Compare new assignment against all existing assignments in DB.
    Excludes self from comparison.
    """
    db = get_db()

    # Fetch all other assignments with extracted text
    cursor = db.assignments.find(
        {"_id": {"$ne": ObjectId(assignment_id)}},
        {"extracted_text": 1, "student_id": 1, "student_name": 1, "title": 1}
    )

    matched_assignments: List[dict] = []
    highest_similarity = 0.0

    async for existing in cursor:
        existing_text = existing.get("extracted_text", "")
        if not existing_text:
            continue

        similarity = calculate_similarity(new_text, existing_text)

        if similarity >= PLAGIARISM_THRESHOLD:
            matched_assignments.append({
                "assignment_id": str(existing["_id"]),
                "student_name": existing.get("student_name", "Unknown"),
                "title": existing.get("title", ""),
                "similarity_score": round(similarity * 100, 1)
            })

        if similarity > highest_similarity:
            highest_similarity = similarity

    is_plagiarized = len(matched_assignments) > 0

    # Plagiarism score: 10 = fully original, 0 = fully plagiarized
    plagiarism_score = round(max(0.0, 10.0 - (highest_similarity * 10)), 2)

    return {
        "is_plagiarized": is_plagiarized,
        "similarity_score": round(highest_similarity * 100, 1),
        "plagiarism_score": plagiarism_score,
        "matched_assignments": matched_assignments,
        "total_matches": len(matched_assignments)
    }