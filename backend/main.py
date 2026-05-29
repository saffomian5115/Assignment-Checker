from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, close_db

app = FastAPI(
    title="AI Assignment Checker",
    description="Automated assignment grading with grammar, plagiarism & content checks",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "AI Assignment Checker is running"}


# Import routers (will be added as modules complete)
from api import auth, assignments, checker, teacher, student

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["Assignments"])
app.include_router(checker.router, prefix="/api/checker", tags=["Checker"])
app.include_router(teacher.router, prefix="/api/teacher", tags=["Teacher"])
app.include_router(student.router, prefix="/api/student", tags=["Student"])