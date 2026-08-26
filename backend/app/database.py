import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./motolog.db")

# 如果是 SQLite 需特別設定 check_same_thread
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
elif "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
    # 本機 MySQL
    engine = create_engine(DATABASE_URL, pool_recycle=3600, pool_pre_ping=True)
else:
    # 所有雲端 MySQL (TiDB Cloud / Aiven / PlanetScale 等) 強制啟用 SSL 安全傳輸
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "ssl": {
                "check_hostname": False
            }
        },
        pool_recycle=300,
        pool_pre_ping=True
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
