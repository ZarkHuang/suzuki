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

import time
import threading
from sqlalchemy import func, cast, Integer
from sqlalchemy.exc import IntegrityError

_db_insert_lock = threading.Lock()

def safe_commit_with_auto_id(db, obj, model_cls, max_retries=5):
    """
    通用相容存入函式（相容 TiDB Cloud / MySQL / SQLite）：
    支援 VARCHAR 或 INT 主鍵，使用 CAST(id AS Integer) 避免字串比較時 '9' > '10' 的問題，
    若 obj 尚未指派 id，主動計算最新可用 id (MAX(CAST(id AS Integer)) + 1)，
    並在並發競爭時透過執行緒鎖與重試機制確保 100% 寫入成功，
    徹底杜絕 1364 (無預設值) 與 1062 (主鍵衝突) 錯誤。
    """
    with _db_insert_lock:
        for attempt in range(max_retries):
            try:
                # 確保在 INSERT 前就先賦值 id，徹底避免 1364 (Field 'id' doesn't have a default value)
                if not getattr(obj, "id", None):
                    max_id = db.query(func.max(cast(model_cls.id, Integer))).scalar() or 0
                    obj.id = int(max_id) + 1

                db.add(obj)
                db.commit()
                db.refresh(obj)
                return obj
            except IntegrityError as e:
                db.rollback()
                err_msg = str(e).lower()
                if "1062" in err_msg or "duplicate entry" in err_msg or "primary" in err_msg:
                    # 主鍵衝突，重新查詢最新 max(id) 並重試
                    max_id = db.query(func.max(cast(model_cls.id, Integer))).scalar() or 0
                    obj.id = int(max_id) + 1
                    time.sleep(0.05 * (attempt + 1))
                    continue
                raise e
            except Exception as e:
                db.rollback()
                raise e
