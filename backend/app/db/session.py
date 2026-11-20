from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
import sqlalchemy
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Lightweight migration: add forecast-tracking columns if they don't exist
    # (existing SQLite databases created before this change won't have them).
    # Run outside the create_all transaction so a duplicate-column error
    # doesn't roll back table creation.
    migration_sql = [
        "ALTER TABLE predictions ADD COLUMN baseline_price FLOAT NULL;",
        "ALTER TABLE predictions ADD COLUMN baseline_timestamp BIGINT NULL;",
        "ALTER TABLE predictions ADD COLUMN user_note TEXT NULL;",
        "ALTER TABLE predictions ADD COLUMN user_expected_direction TEXT NULL;",
    ]
    async with engine.begin() as conn:
        for sql in migration_sql:
            try:
                await conn.execute(sqlalchemy.text(sql))
            except Exception:
                # Column already exists — ignore and continue.
                pass
        await conn.commit()


async def close_db() -> None:
    await engine.dispose()