from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
import datetime


# ================= 使用者與認證 Schemas =================
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ================= 車輛相關 Schemas =================
class VehicleBase(BaseModel):
    id: Optional[Any] = None
    name: Optional[str] = "SUZUKI SUI 125"
    brand: Optional[str] = "SUZUKI"
    model: Optional[str] = "SUI 125"
    tank_capacity: Optional[float] = 5.5
    fuel_type: Optional[str] = "92"
    current_odo: Optional[int] = 0
    license_plate: Optional[str] = "MY-SUI125"
    plate_number: Optional[str] = "MY-SUI125"
    note: Optional[str] = None

class VehicleUpdate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: Optional[Any] = None
    class Config:
        from_attributes = True

VehicleOut = VehicleResponse

# ================= 加油紀錄 Schemas =================
class FuelLogBase(BaseModel):
    id: Optional[Any] = None
    vehicle_id: Optional[str] = None
    date: str
    odometer: int
    liters: float
    price_per_liter: Optional[float] = 30.2
    total_cost: Optional[float] = 0.0
    fuel_type: Optional[str] = "92"
    gas_station: Optional[str] = "台灣中油"
    trip_distance: Optional[float] = 0.0
    efficiency: Optional[float] = 0.0
    full_tank: Optional[bool] = True
    note: Optional[str] = None

class FuelLogCreate(FuelLogBase):
    pass

class FuelLogResponse(BaseModel):
    id: Any
    user_id: Optional[int] = None
    date: str
    odometer: int
    liters: float
    price_per_liter: Optional[float] = 30.2
    total_cost: Optional[float] = 0.0
    fuel_type: Optional[str] = "92"
    gas_station: Optional[str] = "台灣中油"
    trip_distance: Optional[float] = 0.0
    efficiency: Optional[float] = 0.0
    is_full: Optional[int] = 1
    note: Optional[str] = None

    class Config:
        from_attributes = True

FuelLogOut = FuelLogResponse

# ================= 保養紀錄 Schemas =================
class MaintenanceLogBase(BaseModel):
    id: Optional[Any] = None
    vehicle_id: Optional[str] = None
    date: str
    odometer: int
    title: Optional[str] = "定期保養"
    item_id: Optional[str] = "general"
    shop: Optional[str] = "SUZUKI 經銷門市"
    shop_name: Optional[str] = "SUZUKI 經銷門市"
    cost: Optional[float] = 0.0
    items: Optional[Any] = []
    note: Optional[str] = None
    invoice_image_url: Optional[str] = None

class MaintenanceLogCreate(MaintenanceLogBase):
    pass

class MaintenanceLogResponse(BaseModel):
    id: Any
    user_id: Optional[int] = None
    date: str
    odometer: int
    title: Optional[str] = "定期保養"
    item_id: Optional[str] = "general"
    shop: Optional[str] = "SUZUKI 經銷門市"
    cost: Optional[float] = 0.0
    items: Optional[Any] = None
    note: Optional[str] = None
    invoice_image_url: Optional[str] = None

    class Config:
        from_attributes = True

MaintenanceLogOut = MaintenanceLogResponse

# ================= 改裝日誌 Schemas =================
class ModificationBase(BaseModel):
    id: Optional[Any] = None
    vehicle_id: Optional[str] = None
    date: str
    odometer: Optional[int] = 0
    title: str
    category: Optional[str] = "exterior"
    cost: Optional[float] = 0.0
    bought_from: Optional[str] = None
    status: Optional[str] = "installed"
    rating: Optional[int] = 5
    note: Optional[str] = None
    image_url: Optional[str] = None

class ModificationCreate(ModificationBase):
    pass

class ModificationResponse(BaseModel):
    id: Any
    user_id: Optional[int] = None
    date: str
    odometer: Optional[int] = 0
    title: str
    category: Optional[str] = "exterior"
    cost: Optional[float] = 0.0
    bought_from: Optional[str] = None
    status: Optional[str] = "installed"
    rating: Optional[int] = 5
    note: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

ModificationLogBase = ModificationBase
ModificationLogOut = ModificationResponse

# ================= AI 健檢 Schemas =================
class AiDiagnosisRequest(BaseModel):
    query: str
    current_odo: Optional[int] = 0
    vehicle_model: Optional[str] = "Suzuki SUI 125"

class AiDiagnosisResponse(BaseModel):
    diagnosis: str
    urgency: str
    suggested_actions: List[str]

