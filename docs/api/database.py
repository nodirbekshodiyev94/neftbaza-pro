"""PostgreSQL ulanishi: engine, sessiya va modellar uchun asosiy klass."""
import os

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Ulanish satri muhit o'zgaruvchisidan olinadi, parol kodga yozilmaydi.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://neftbaza_app:PAROL@localhost:5432/neftbaza",
)

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    # Barcha jadvallar "neftbaza" sxemasida: search_path'ga bog'liq bo'lmaymiz.
    metadata = MetaData(schema="neftbaza")


async def get_session() -> AsyncSession:
    """FastAPI dependency: har bir so'rov uchun alohida sessiya."""
    async with SessionLocal() as session:
        yield session
