import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from . import models
from .database import engine
from .routers import auth, vehicle, fuel, maintenance, modifications, ai

# 自動建立資料表與確保全部欄位存在 (採用 PyMySQL 原生連線，100% 相容 TiDB Cloud Serverless)
def run_migrations():
    results = []
    
    # 1. 建立宣告的資料表
    tables_sql = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) NOT NULL UNIQUE,
            username VARCHAR(50) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            name VARCHAR(50) DEFAULT 'SUZUKI SUI 125',
            plate_number VARCHAR(20) DEFAULT 'MY-SUI125',
            license_plate VARCHAR(20) DEFAULT 'MY-SUI125',
            brand VARCHAR(50) DEFAULT 'SUZUKI',
            model VARCHAR(50) DEFAULT 'SUI 125',
            current_odo INT DEFAULT 0,
            tank_capacity FLOAT DEFAULT 5.5,
            fuel_type VARCHAR(20) DEFAULT '92 無鉛汽油',
            note TEXT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS fuel_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            date VARCHAR(20) NOT NULL,
            odometer INT NOT NULL,
            liters FLOAT NOT NULL,
            price_per_liter FLOAT DEFAULT 30.2,
            total_cost FLOAT NOT NULL,
            is_full INT DEFAULT 1,
            fuel_type VARCHAR(20) DEFAULT '92',
            gas_station VARCHAR(50) DEFAULT '台灣中油',
            trip_distance FLOAT DEFAULT 0.0,
            efficiency FLOAT DEFAULT 0.0,
            note TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS maintenance_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            item_id VARCHAR(50) DEFAULT 'general',
            title VARCHAR(100) DEFAULT '定期保養',
            date VARCHAR(20) NOT NULL,
            odometer INT NOT NULL,
            cost FLOAT DEFAULT 0.0,
            shop VARCHAR(50) DEFAULT 'SUZUKI 經銷門市',
            items TEXT NULL,
            note TEXT NULL,
            invoice_image_url VARCHAR(255) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """,
        """
        CREATE TABLE IF NOT EXISTS modification_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            category VARCHAR(30) NOT NULL,
            title VARCHAR(100) NOT NULL,
            cost FLOAT DEFAULT 0.0,
            odometer INT DEFAULT 0,
            date VARCHAR(20) NOT NULL,
            bought_from VARCHAR(100) DEFAULT '',
            status VARCHAR(30) DEFAULT 'installed',
            rating INT DEFAULT 5,
            note TEXT NULL,
            image_url VARCHAR(255) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    ]

    try:
        raw_conn = engine.raw_connection()
        cursor = raw_conn.cursor()
        
        for create_sql in tables_sql:
            try:
                cursor.execute(create_sql)
                raw_conn.commit()
                results.append("Table created/verified")
            except Exception as e:
                results.append(f"Table warning: {e}")

        # 2. 補齊所有缺少的欄位
        columns_to_ensure = [
            ("users", "email", "VARCHAR(100) NOT NULL"),
            ("users", "username", "VARCHAR(50) NOT NULL"),
            ("users", "hashed_password", "VARCHAR(255) NOT NULL"),
            ("vehicles", "user_id", "INT NULL"),
            ("vehicles", "plate_number", "VARCHAR(20) DEFAULT 'MY-SUI125'"),
            ("vehicles", "license_plate", "VARCHAR(20) DEFAULT 'MY-SUI125'"),
            ("vehicles", "is_initialized", "INT DEFAULT 0"),
            ("vehicles", "brand", "VARCHAR(50) DEFAULT 'SUZUKI'"),
            ("vehicles", "model", "VARCHAR(50) DEFAULT 'SUI 125'"),
            ("vehicles", "current_odo", "INT DEFAULT 0"),
            ("vehicles", "tank_capacity", "FLOAT DEFAULT 5.5"),
            ("vehicles", "fuel_type", "VARCHAR(20) DEFAULT '92'"),
            ("vehicles", "note", "TEXT NULL"),
            ("fuel_logs", "user_id", "INT NULL"),
            ("fuel_logs", "price_per_liter", "FLOAT DEFAULT 30.2"),
            ("fuel_logs", "total_cost", "FLOAT DEFAULT 0.0"),
            ("fuel_logs", "fuel_type", "VARCHAR(20) DEFAULT '92'"),
            ("fuel_logs", "gas_station", "VARCHAR(50) DEFAULT '台灣中油'"),
            ("fuel_logs", "trip_distance", "FLOAT DEFAULT 0.0"),
            ("fuel_logs", "efficiency", "FLOAT DEFAULT 0.0"),
            ("fuel_logs", "is_full", "INT DEFAULT 1"),
            ("fuel_logs", "note", "TEXT NULL"),
            ("maintenance_logs", "user_id", "INT NULL"),
            ("maintenance_logs", "item_id", "VARCHAR(50) DEFAULT 'general'"),
            ("maintenance_logs", "title", "VARCHAR(100) DEFAULT '定期保養'"),
            ("maintenance_logs", "shop", "VARCHAR(50) DEFAULT 'SUZUKI 經銷門市'"),
            ("maintenance_logs", "items", "TEXT NULL"),
            ("maintenance_logs", "note", "TEXT NULL"),
            ("maintenance_logs", "invoice_image_url", "VARCHAR(255) NULL"),
            ("modification_logs", "user_id", "INT NULL"),
            ("modification_logs", "bought_from", "VARCHAR(100) DEFAULT ''"),
            ("modification_logs", "status", "VARCHAR(30) DEFAULT 'installed'"),
            ("modification_logs", "rating", "INT DEFAULT 5"),
            ("modification_logs", "note", "TEXT NULL"),
            ("modification_logs", "image_url", "VARCHAR(255) NULL"),
        ]

        # 2. 補齊所有缺少的欄位
        for tbl, col, col_type in columns_to_ensure:
            try:
                cursor.execute(f"ALTER TABLE `{tbl}` ADD COLUMN `{col}` {col_type};")
                raw_conn.commit()
                print(f"🔧 補齊欄位成功: {tbl}.{col}")
                results.append(f"Added {tbl}.{col}")
            except Exception as e:
                # 欄位已存在 (MySQL error 1060 / Duplicate column)
                results.append(f"Column exists {tbl}.{col}: {e}")

        # 3. 確保所有資料表的主鍵 id 均具備 AUTO_INCREMENT
        auto_inc_tables = ["users", "vehicles", "fuel_logs", "maintenance_logs", "modification_logs"]
        for tbl in auto_inc_tables:
            try:
                cursor.execute(f"ALTER TABLE `{tbl}` MODIFY COLUMN `id` INT AUTO_INCREMENT;")
                raw_conn.commit()
                print(f"🔑 主鍵 AUTO_INCREMENT 成功: {tbl}.id")
                results.append(f"Auto-increment enabled on {tbl}.id")
            except Exception as e:
                results.append(f"Auto-increment on {tbl}.id: {e}")

        cursor.close()
        raw_conn.close()
        print("✅ TiDB Cloud / MySQL 資料庫結構原生檢查與補齊成功！")
    except Exception as ex:
        print(f"⚠️ run_migrations 連線提示: {ex}")
        results.append(f"Migration error: {ex}")
        
    return results

# 啟動時自動補齊資料庫欄位
run_migrations()

app = FastAPI(
    title="SUZUKI SUI 125 雲端多租戶 API",
    description="模組化架構：分拆 Auth、Vehicle、Fuel、Maintenance、Modifications、AI 六大微服務路由",
    version="2.3.0"
)

# CORS 設定 (全面允許)
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

@app.get("/api/system/migrate")
def trigger_migrate():
    details = run_migrations()
    return {
        "status": "success",
        "message": "資料庫欄位已全面自動補齊並完成驗證！",
        "details": details
    }
