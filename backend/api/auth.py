from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from models.user import UserCreate, UserLogin, Token, UserOut, TokenData
from utils.auth_utils import hash_password, verify_password, create_access_token, decode_token
from database import get_db
from bson import ObjectId

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def serialize_user(user: dict) -> dict:
    user["id"] = str(user["_id"])
    return user


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise credentials_exception

    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"], role=user["role"])


async def require_teacher(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return current_user


async def require_student(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user


@router.post("/register", response_model=Token, status_code=201)
async def register(user_data: UserCreate):
    db = get_db()

    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user_doc = {
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id, "role": user_data.role})
    return Token(
        access_token=token,
        user=UserOut(id=user_id, name=user_data.name, email=user_data.email, role=user_data.role)
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_db()

    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "role": user["role"]})
    return Token(
        access_token=token,
        user=UserOut(id=user_id, name=user["name"], email=user["email"], role=user["role"])
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_user)):
    return current_user