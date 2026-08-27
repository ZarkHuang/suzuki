from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/fuel", tags=["Fuel 加油與油耗紀錄"])

@router.get("", response_model=List[schemas.FuelLogResponse])
def get_fuel_logs(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    logs = db.query(models.FuelLog).filter(models.FuelLog.user_id == user.id).order_by(models.FuelLog.odometer.desc()).all()
    return logs


@router.post("", response_model=schemas.FuelLogResponse, status_code=status.HTTP_201_CREATED)
def create_fuel_log(
    log_in: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    db_log = models.FuelLog(
        user_id=user.id,
        date=log_in.date,
        odometer=log_in.odometer,
        liters=log_in.liters,
        price_per_liter=log_in.price_per_liter or 30.2,
        total_cost=log_in.total_cost or 0.0,
        fuel_type=log_in.fuel_type or "92",
        gas_station=log_in.gas_station or "台灣中油",
        trip_distance=log_in.trip_distance or 0.0,
        efficiency=log_in.efficiency or 0.0,
        is_full=1 if log_in.full_tank else 0,
        note=log_in.note or ""
    )
    db.add(db_log)

    # 同步更新車輛里程
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
    if vehicle and log_in.odometer > (vehicle.current_odo or 0):
        vehicle.current_odo = log_in.odometer

    db.commit()
    db.refresh(db_log)
    return db_log

@router.delete("/{log_id}")
def delete_fuel_log(
    log_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.FuelLog).filter(models.FuelLog.id == log_id, models.FuelLog.user_id == user.id)
    log = query.first()
    if not log:
        raise HTTPException(status_code=404, detail="紀錄未找到")
    db.delete(log)
    db.commit()
    return {"message": "Deleted successfully", "id": log_id}
