import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./motolog.db")

# 如果是 SQLite 需特別設定 check_same_thread
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
elif "tidbcloud.com" in DATABASE_URL or "ssl" in DATABASE_URL.lower():
    # TiDB Cloud 雲端 MySQL 需啟用 SSL 憑證驗證
    engine = create_engine(
        DATABASE_URL,
        connect_args={"ssl": {}},
        pool_recycle=300,
        pool_pre_ping=True
    )
else:
    engine = create_engine(DATABASE_URL, pool_recycle=3600, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
