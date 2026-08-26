from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime

# ================= 使用者與認證 Schemas =================
class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleAuthInput(BaseModel):
    email: str
    name: str
    sub: Optional[str] = None
    picture: Optional[str] = None


class Token(BaseModel):

    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ================= 車輛相關 Schemas =================
class VehicleBase(BaseModel):
    id: str
    name: str
    brand: str
    model: str
    tank_capacity: float
    fuel_type: str
    current_odo: int
    license_plate: str
    note: Optional[str] = None

class VehicleOut(VehicleBase):
    class Config:
        from_attributes = True

class FuelLogBase(BaseModel):
    id: Optional[str] = None
    vehicle_id: Optional[str] = "sui-125-default"
    date: str
    odometer: int
    liters: float
    price_per_liter: Optional[float] = 30.2
    total_cost: float
    fuel_type: Optional[str] = "92"
    gas_station: Optional[str] = "台灣中油"
    trip_distance: Optional[int] = 0
    efficiency: Optional[float] = 0.0
    full_tank: Optional[bool] = True
    note: Optional[str] = None

class FuelLogOut(FuelLogBase):
    id: str
    class Config:
        from_attributes = True

class MaintenanceLogBase(BaseModel):
    id: Optional[str] = None
    vehicle_id: Optional[str] = "sui-125-default"
    date: str
    odometer: int
    title: str
    shop_name: Optional[str] = "SUZUKI 形象店"
    cost: Optional[float] = 0.0
    items: Optional[List[str]] = []
    note: Optional[str] = None
    receipt_image: Optional[str] = None

class MaintenanceLogOut(BaseModel):
    id: str
    vehicle_id: str
    date: str
    odometer: int
    title: str
    shop_name: str
    cost: float
    items: List[str] = []
    note: Optional[str] = None
    receipt_image: Optional[str] = None

class ModificationLogBase(BaseModel):
    id: Optional[str] = None
    vehicle_id: Optional[str] = "sui-125-default"
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

class ModificationLogOut(ModificationLogBase):
    id: str
    class Config:
        from_attributes = True

class AiDiagnosisRequest(BaseModel):
    query: str
    current_odo: Optional[int] = 0
    vehicle_model: Optional[str] = "Suzuki SUI 125"

class AiDiagnosisResponse(BaseModel):
    diagnosis: str
    urgency: str
    suggested_actions: List[str]
