from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongo_uri: str = "mongodb://localhost:27017/ai_assignment_checker"
    secret_key: str = "changeme"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    llama_url: str = "http://localhost:11434"
    languagetool_url: str = "http://localhost:8010"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


class Database:
    client: AsyncIOMotorClient = None
    db = None


db_instance = Database()


async def connect_db():
    settings = get_settings()
    db_instance.client = AsyncIOMotorClient(settings.mongo_uri)
    db_instance.db = db_instance.client.get_default_database()
    print("✅ MongoDB connected")


async def close_db():
    if db_instance.client:
        db_instance.client.close()
        print("🔌 MongoDB disconnected")


def get_db():
    return db_instance.db