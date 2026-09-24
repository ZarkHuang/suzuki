import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from .. import models, schemas, auth
from ..database import get_db, safe_commit_with_auto_id

router = APIRouter(prefix="/api/fuel", tags=["Fuel 加油與油耗紀錄"])

@router.get("", response_model=schemas.PaginatedFuelLogResponse)
def get_fuel_logs(
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    all_data: bool = False,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        base_query = db.query(models.FuelLog).filter(models.FuelLog.user_id == user.id)
        data_total = base_query.count()

        # 方案 A：若未主動指定分頁參數，或傳入 all_data=True，預設全量撈取該用戶歷史紀錄（永不截斷）
        is_paginated_request = (page is not None or page_size is not None or limit is not None or offset is not None) and not all_data

        if not is_paginated_request:
            logs = base_query.order_by(models.FuelLog.odometer.desc()).limit(3000).all()
            return {
                "list": logs,
                "pagination": {
                    "page": 1,
                    "page_size": len(logs) if len(logs) > 0 else 1,
                    "page_total": 1,
                    "data_total": data_total
                }
            }

        actual_page = page if (page is not None and page > 0) else 1
        actual_page_size = limit if (limit is not None and limit > 0) else (page_size if (page_size is not None and page_size > 0) else 50)
        actual_offset = offset if (offset is not None and offset >= 0) else ((actual_page - 1) * actual_page_size)

        logs = base_query.order_by(models.FuelLog.odometer.desc()).offset(actual_offset).limit(actual_page_size).all()
        page_total = math.ceil(data_total / actual_page_size) if (actual_page_size > 0 and data_total > 0) else 1

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
                "page_size": 1,
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
    # 同步更新車輛里程
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
    if vehicle and log_in.odometer > (vehicle.current_odo or 0):
        vehicle.current_odo = log_in.odometer

    safe_commit_with_auto_id(db, db_log, models.FuelLog)
    return db_log

@router.delete("/{log_id}")
def delete_fuel_log(
    log_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        f_id = int(log_id)
        query = db.query(models.FuelLog).filter(models.FuelLog.id == f_id, models.FuelLog.user_id == user.id)
    except ValueError:
        query = db.query(models.FuelLog).filter(models.FuelLog.id == log_id, models.FuelLog.user_id == user.id)

    log = query.first()
    if not log:
        raise HTTPException(status_code=404, detail="紀錄未找到")
    db.delete(log)
    db.commit()
    return {"message": "Deleted successfully", "id": log_id}
