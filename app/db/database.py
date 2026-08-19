"""PostgreSQL connection and session management."""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from ..config import get_settings
from .models import Base
from ..utils.logger import get_logger

logger = get_logger(__name__)

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def database_enabled() -> bool:
    return bool(get_settings().database_url.strip())


def get_engine() -> Engine | None:
    global _engine, _SessionLocal
    if not database_enabled():
        return None
    if _engine is None:
        url = get_settings().database_url
        _engine = create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
        logger.info("PostgreSQL engine initialized")
    return _engine


def init_db() -> bool:
    """Create tables if DATABASE_URL is configured. Returns True on success."""
    engine = get_engine()
    if engine is None:
        logger.warning("DATABASE_URL not set — using file-based storage (no per-user isolation)")
        return False
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database tables ready")
        return True
    except Exception as exc:
        logger.error("Database init failed: %s", exc)
        return False


@contextmanager
def get_session() -> Generator[Session, None, None]:
    if _SessionLocal is None:
        get_engine()
    if _SessionLocal is None:
        raise RuntimeError("Database not configured")
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
