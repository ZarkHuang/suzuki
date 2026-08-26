import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from . import models
from .database import engine
from .routers import auth, vehicle, fuel, maintenance, modifications, ai

# 自動建立資料表與確保 users 表與 user_id 欄位存在
try:
    models.Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) NOT NULL UNIQUE,
                username VARCHAR(50) NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))
        
        for tbl in ["vehicles", "fuel_logs", "maintenance_logs", "modifications"]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN user_id INT NULL;"))
            except Exception:
                pass
    print("✅ MySQL 資料表與 users 表檢查/建立成功！")
except Exception as e:
    print(f"⚠️ 資料表初始化提示: {e}")


app = FastAPI(
    title="SUZUKI SUI 125 雲端多租戶 API",
    description="模組化架構：分拆 Auth、Vehicle、Fuel、Maintenance、Modifications、AI 六大微服務路由",
    version="2.1.0"
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態檔案目錄 (用於改裝/發票圖片上傳)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ================= 掛載五大分類獨立 API 路由器 =================
app.include_router(auth.router)
app.include_router(vehicle.router)
app.include_router(fuel.router)
app.include_router(maintenance.router)
app.include_router(modifications.router)
app.include_router(modifications.router, prefix="/api/mods") # 兼顧別名
app.include_router(ai.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Suzuki SUI 125 MotoLog Backend (Modular Architecture)",
        "modules": ["auth", "vehicle", "fuel", "maintenance", "modifications", "ai"],
        "docs_url": "/docs"
    }
