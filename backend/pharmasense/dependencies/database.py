from collections.abc import AsyncGenerator
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pharmasense.config import settings


@lru_cache(maxsize=1)
def _get_engine():
    return create_async_engine(
        settings.database_url,
        echo=not settings.is_production,
        pool_pre_ping=True,
    )


@lru_cache(maxsize=1)
def _get_session_factory():
    return async_sessionmaker(_get_engine(), expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _get_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
