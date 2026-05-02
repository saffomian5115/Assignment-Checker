import httpx
import json
from app.database import get_settings

MAX_WORDS = 2000

PROMPT_TEMPLATE = """You are an academic assignment evaluator. Evaluate the following assignment and return ONLY a JSON object with no extra text.

Subject: {subject}

Assignment Text:
{text}

Return this exact JSON format:
{{
  "relevance": <0-10>,
  "structure": <0-10>,
  "depth": <0-10>,
  "clarity": <0-10>,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "summary": "2-3 sentence overall assessment"
}}"""


def truncate_text(text: str, max_words: int = MAX_WORDS) -> str:
    words = text.split()
    if len(words) > max_words:
        return " ".join(words[:max_words]) + "...[truncated]"
    return text


async def analyze_content(text: str, subject: str) -> dict:
    """Send assignment to Ollama Llama2 for content quality analysis"""
    settings = get_settings()
    url = f"{settings.llama_url}/api/generate"

    truncated_text = truncate_text(text)
    prompt = PROMPT_TEMPLATE.format(subject=subject, text=truncated_text)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json={
                "model": "llama2",
                "prompt": prompt,
                "stream": False,
                "format": "json"
            })
            response.raise_for_status()
            data = response.json()

        raw_text = data.get("response", "")

        # Parse JSON response safely
        try:
            # Strip markdown code fences if present
            clean = raw_text.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            result = json.loads(clean)
        except json.JSONDecodeError:
            return _fallback_result("Could not parse Llama2 response")

        # Validate and clamp scores
        def clamp(val, lo=0, hi=10):
            try:
                return max(lo, min(hi, float(val)))
            except (TypeError, ValueError):
                return 5.0

        relevance = clamp(result.get("relevance", 5))
        structure = clamp(result.get("structure", 5))
        depth = clamp(result.get("depth", 5))
        clarity = clamp(result.get("clarity", 5))
        content_score = round((relevance + structure + depth + clarity) / 4, 2)

        return {
            "relevance": relevance,
            "structure": structure,
            "depth": depth,
            "clarity": clarity,
            "content_score": content_score,
            "strengths": result.get("strengths", [])[:5],
            "improvements": result.get("improvements", [])[:5],
            "summary": result.get("summary", "")[:500]
        }

    except httpx.ConnectError:
        return _fallback_result("Ollama/Llama2 not available")
    except Exception as e:
        return _fallback_result(f"Content analysis error: {str(e)}")


def _fallback_result(note: str) -> dict:
    return {
        "relevance": 5.0,
        "structure": 5.0,
        "depth": 5.0,
        "clarity": 5.0,
        "content_score": 5.0,
        "strengths": [],
        "improvements": [],
        "summary": "",
        "note": note
    }