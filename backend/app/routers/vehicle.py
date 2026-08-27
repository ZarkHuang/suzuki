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

@router.post("", response_model=schemas.VehicleResponse)
@router.put("", response_model=schemas.VehicleResponse)
def update_vehicle(
    vehicle_in: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
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
    if "license_plate" in update_data and "plate_number" not in update_data:
        update_data["plate_number"] = update_data["license_plate"]

    for field, value in update_data.items():
        if hasattr(vehicle, field) and value is not None:
            setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.patch("/odometer")
def update_odometer(
    new_odo: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
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
    return {"message": "Odometer updated successfully", "current_odo": vehicle.current_odo}
