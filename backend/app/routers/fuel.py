import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/fuel", tags=["Fuel 加油與油耗紀錄"])

@router.get("", response_model=schemas.PaginatedFuelLogResponse)
def get_fuel_logs(
    page: int = 1,
    page_size: int = 10,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        base_query = db.query(models.FuelLog).filter(models.FuelLog.user_id == user.id)
        data_total = base_query.count()

        # 若有傳入 limit，以 limit 為單頁筆數
        actual_page_size = limit if (limit is not None and limit > 0) else (page_size if page_size > 0 else 10)
        actual_page = page if page > 0 else 1
        actual_offset = offset if (offset is not None and offset >= 0) else ((actual_page - 1) * actual_page_size)

        logs = base_query.order_by(models.FuelLog.odometer.desc()).offset(actual_offset).limit(actual_page_size).all()
        page_total = math.ceil(data_total / actual_page_size) if (actual_page_size > 0 and data_total > 0) else (1 if data_total == 0 else 1)

        return {
            "list": logs,
            "pagination": {
                "page": actual_page,
                "page_size": actual_page_size,
                "page_total": page_total,
                "data_total": data_total
            }
        }
    except Exception as e:
        db.rollback()
        print(f"⚠️ get_fuel_logs fallback: {e}")
        return {
            "list": [],
            "pagination": {
                "page": 1,
                "page_size": 10,
                "page_total": 0,
                "data_total": 0
            }
        }


@router.post("", response_model=schemas.FuelLogResponse, status_code=status.HTTP_201_CREATED)
def create_fuel_log(
    log_in: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    from sqlalchemy import func
    max_id = db.query(func.max(models.FuelLog.id)).scalar() or 0
    db_log = models.FuelLog(
        id=int(max_id) + 1,
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
