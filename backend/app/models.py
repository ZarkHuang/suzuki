import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

# 使用者資料表 (SaaS 多用戶支援)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    username = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # 關聯
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    fuel_logs = relationship("FuelLog", back_populates="owner", cascade="all, delete-orphan")
    maintenance_logs = relationship("MaintenanceLog", back_populates="owner", cascade="all, delete-orphan")
    modifications = relationship("Modification", back_populates="owner", cascade="all, delete-orphan")

# 車輛基礎設定
class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(50), default="SUZUKI SUI 125")
    plate_number = Column(String(20), default="MY-SUI125")
    current_odo = Column(Integer, default=0)
    tank_capacity = Column(Float, default=5.5)
    fuel_type = Column(String(20), default="92 無鉛汽油")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="vehicles")

# 加油紀錄
class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    date = Column(String(20), nullable=False) # 格式 YYYY-MM-DD
    odometer = Column(Integer, nullable=False)
    liters = Column(Float, nullable=False)
    price_per_liter = Column(Float, default=0.0)
    total_cost = Column(Float, nullable=False)
    is_full = Column(Integer, default=1) # 1: 加滿, 0: 未加滿
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="fuel_logs")

# 保養紀錄
class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    item_id = Column(String(50), nullable=False) # 對應原廠項目 ID (如 oil, gear_oil)
    date = Column(String(20), nullable=False)
    odometer = Column(Integer, nullable=False)
    cost = Column(Float, default=0.0)
    brand = Column(String(50), nullable=True) # 使用品牌/型號
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="maintenance_logs")

# 改裝日誌
class Modification(Base):
    __tablename__ = "modifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    category = Column(String(30), nullable=False) # 外觀精品, 懸吊制動, 動力傳動, 實用機能
    title = Column(String(100), nullable=False)
    cost = Column(Float, default=0.0)
    odometer = Column(Integer, default=0)
    date = Column(String(20), nullable=False)
    note = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="modifications")

