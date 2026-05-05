import httpx
from database import get_settings
from typing import List


async def check_grammar(text: str) -> dict:
    """
    Send text to self-hosted LanguageTool Docker instance.
    Docker command: docker run -d -p 8010:8010 silviof/docker-languagetool
    """
    settings = get_settings()
    url = f"{settings.languagetool_url}/v2/check"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, data={
                "text": text,
                "language": "en-US",
                "disabledRules": "WHITESPACE_RULE"
            })
            response.raise_for_status()
            data = response.json()

    except httpx.ConnectError:
        # LanguageTool not running — return neutral result
        return {
            "total_errors": 0,
            "errors": [],
            "grammar_score": 7.0,
            "note": "LanguageTool not available"
        }
    except Exception as e:
        return {
            "total_errors": 0,
            "errors": [],
            "grammar_score": 7.0,
            "note": f"Grammar check error: {str(e)}"
        }

    # Parse matches
    matches = data.get("matches", [])
    word_count = len(text.split())

    parsed_errors: List[dict] = []
    for match in matches:
        context = match.get("context", {})
        replacements = [r["value"] for r in match.get("replacements", [])[:3]]
        rule = match.get("rule", {})

        parsed_errors.append({
            "message": match.get("message", ""),
            "context": context.get("text", ""),
            "offset": context.get("offset", 0),
            "length": context.get("length", 0),
            "suggestions": replacements,
            "rule_id": rule.get("id", ""),
            "type": rule.get("issueType", "grammar"),
            "category": rule.get("category", {}).get("name", "")
        })

    total_errors = len(parsed_errors)

    # Score: 10 - (errors per 100 words * 10), capped 0-10
    error_density = (total_errors / max(word_count, 1)) * 100
    grammar_score = max(0.0, min(10.0, 10.0 - error_density))

    return {
        "total_errors": total_errors,
        "errors": parsed_errors,
        "grammar_score": round(grammar_score, 2),
        "word_count": word_count
    }