import fitz  # PyMuPDF
from docx import Document as DocxDocument
from fastapi import UploadFile, HTTPException
import io


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def parse_pdf(content: bytes) -> str:
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")


def parse_docx(content: bytes) -> str:
    try:
        doc = DocxDocument(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {str(e)}")


def parse_txt(content: bytes) -> str:
    try:
        return content.decode("utf-8", errors="ignore").strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse TXT: {str(e)}")


async def extract_text_from_upload(file: UploadFile) -> tuple[str, str]:
    """Returns (extracted_text, filename)"""
    import os

    # Validate extension
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read content
    content = await file.read()

    # Validate size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Parse based on extension
    if ext == ".pdf":
        text = parse_pdf(content)
    elif ext == ".docx":
        text = parse_docx(content)
    elif ext == ".txt":
        text = parse_txt(content)

    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from file. File may be empty.")

    return text, file.filename