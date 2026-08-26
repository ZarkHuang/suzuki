from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/vehicle", tags=["Vehicle 儀表與車輛設定"])

@router.get("", response_model=schemas.VehicleResponse)
def get_vehicle(
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.Vehicle)
    if user:
        vehicle = query.filter((models.Vehicle.user_id == user.id) | (models.Vehicle.user_id.is_(None))).first()
    else:
        vehicle = query.first()

    if not vehicle:
        vehicle = models.Vehicle(
            id=f"veh-{user.id if user else 'default'}",
            user_id=user.id if user else None,
            name="SUZUKI SUI 125",
            brand="SUZUKI",
            model="SUI 125",
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
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.Vehicle)
    if user:
        vehicle = query.filter((models.Vehicle.user_id == user.id) | (models.Vehicle.user_id.is_(None))).first()
    else:
        vehicle = query.first()

    if not vehicle:
        vehicle = models.Vehicle(
            id=f"veh-{user.id if user else 'default'}",
            user_id=user.id if user else None,
            name="SUZUKI SUI 125",
            brand="SUZUKI",
            model="SUI 125",
            license_plate="MY-SUI125",
            current_odo=0,
            tank_capacity=5.5,
            fuel_type="92"
        )
        db.add(vehicle)

    update_data = vehicle_in.dict(exclude_unset=True)
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
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.Vehicle)
    if user:
        vehicle = query.filter(models.Vehicle.user_id == user.id).first()
    else:
        vehicle = query.filter(models.Vehicle.user_id.is_(None)).first() or query.first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    vehicle.current_odo = new_odo
    db.commit()
    return {"message": "Odometer updated successfully", "current_odo": vehicle.current_odo}
