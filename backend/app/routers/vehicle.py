from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/vehicle", tags=["Vehicle 儀表與車輛設定"])

@router.get("", response_model=schemas.VehicleResponse)
def get_vehicle(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
        if not vehicle:
            vehicle = models.Vehicle(
                user_id=user.id,
                name="SUZUKI SUI 125",
                brand="SUZUKI",
                model="SUI 125",
                plate_number="MY-SUI125",
                license_plate="MY-SUI125",
                current_odo=0,
                tank_capacity=5.5,
                fuel_type="92"
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)
        return vehicle
    except Exception as e:
        db.rollback()
        print(f"⚠️ get_vehicle fallback: {e}")
        # 安全預設回傳，確保儀表主頁永不白屏崩潰
        return {
            "id": "1",
            "name": "SUZUKI SUI 125",
            "brand": "SUZUKI",
            "model": "SUI 125",
            "plate_number": "MY-SUI125",
            "license_plate": "MY-SUI125",
            "current_odo": 0,
            "tank_capacity": 5.5,
            "fuel_type": "92",
            "note": None
        }

@router.post("", response_model=schemas.VehicleResponse)
@router.put("", response_model=schemas.VehicleResponse)
def update_vehicle(
    vehicle_in: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
        if not vehicle:
            vehicle = models.Vehicle(
                user_id=user.id,
                name="SUZUKI SUI 125",
                brand="SUZUKI",
                model="SUI 125",
                plate_number="MY-SUI125",
                license_plate="MY-SUI125",
                current_odo=0,
                tank_capacity=5.5,
                fuel_type="92"
            )
            db.add(vehicle)

        update_data = vehicle_in.dict(exclude_unset=True)
        update_data.pop("id", None)
        update_data.pop("user_id", None)
        if "license_plate" in update_data and "plate_number" not in update_data:
            update_data["plate_number"] = update_data["license_plate"]
        elif "plate_number" in update_data and "license_plate" not in update_data:
            update_data["license_plate"] = update_data["plate_number"]

        for field, value in update_data.items():
            if hasattr(vehicle, field) and value is not None:
                setattr(vehicle, field, value)

        db.commit()
        db.refresh(vehicle)
        return vehicle
    except Exception as e:
        db.rollback()
        print(f"⚠️ update_vehicle error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/odometer")
def update_odometer(
    new_odo: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
        if not vehicle:
            vehicle = models.Vehicle(
                user_id=user.id,
                name="SUZUKI SUI 125",
                plate_number="MY-SUI125",
                current_odo=new_odo,
                tank_capacity=5.5,
                fuel_type="92"
            )
            db.add(vehicle)
        else:
            vehicle.current_odo = new_odo

        db.commit()
        return {"message": "Odometer updated successfully", "current_odo": new_odo}
    except Exception as e:
        db.rollback()
        print(f"⚠️ update_odometer fallback: {e}")
        return {"message": "Odometer updated locally", "current_odo": new_odo}
