import json
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text
from sqlalchemy.sql import func
from .database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), default="Suzuki SUI 125")
    brand = Column(String(100), default="SUZUKI")
    model = Column(String(100), default="SUI 125")
    tank_capacity = Column(Float, default=5.5)
    fuel_type = Column(String(20), default="92")
    current_odo = Column(Integer, default=300)
    license_plate = Column(String(50), default="ABC-1234")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(String(50), primary_key=True, index=True)
    vehicle_id = Column(String(50), index=True, default="sui-125-default")
    date = Column(String(20), nullable=False)
    odometer = Column(Integer, nullable=False)
    liters = Column(Float, nullable=False)
    price_per_liter = Column(Float, default=30.2)
    total_cost = Column(Float, nullable=False)
    fuel_type = Column(String(20), default="92")
    gas_station = Column(String(50), default="台灣中油")
    trip_distance = Column(Integer, default=0)
    efficiency = Column(Float, default=0.0)
    full_tank = Column(Boolean, default=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(String(50), primary_key=True, index=True)
    vehicle_id = Column(String(50), index=True, default="sui-125-default")
    date = Column(String(20), nullable=False)
    odometer = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    shop_name = Column(String(100), default="SUZUKI 形象店")
    cost = Column(Float, default=0.0)
    items_json = Column(Text, default="[]")  # JSON 格式字串
    note = Column(Text, nullable=True)
    receipt_image = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class ModificationLog(Base):
    __tablename__ = "modification_logs"

    id = Column(String(50), primary_key=True, index=True)
    vehicle_id = Column(String(50), index=True, default="sui-125-default")
    date = Column(String(20), nullable=False)
    odometer = Column(Integer, default=0)
    title = Column(String(200), nullable=False)
    category = Column(String(50), default="exterior")
    cost = Column(Float, default=0.0)
    bought_from = Column(String(100), nullable=True)
    status = Column(String(50), default="installed")
    rating = Column(Integer, default=5)
    note = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
