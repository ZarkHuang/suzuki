import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import json

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance 保養日誌"])

@router.get("", response_model=schemas.PaginatedMaintenanceLogResponse)
def get_maintenance_logs(
    page: int = 1,
    page_size: int = 10,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        base_query = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.user_id == user.id)
        data_total = base_query.count()

        actual_page_size = limit if (limit is not None and limit > 0) else (page_size if page_size > 0 else 10)
        actual_page = page if page > 0 else 1
        actual_offset = offset if (offset is not None and offset >= 0) else ((actual_page - 1) * actual_page_size)

        logs = base_query.order_by(models.MaintenanceLog.odometer.desc()).offset(actual_offset).limit(actual_page_size).all()
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
        print(f"⚠️ get_maintenance_logs fallback: {e}")
        return {
            "list": [],
            "pagination": {
                "page": 1,
                "page_size": 10,
                "page_total": 0,
                "data_total": 0
            }
        }


@router.post("", response_model=schemas.MaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(
    log_in: schemas.MaintenanceLogCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    from sqlalchemy import func
    max_id = db.query(func.max(models.MaintenanceLog.id)).scalar() or 0
    # 將 items list 轉為字串儲存
    items_str = json.dumps(log_in.items, ensure_ascii=False) if isinstance(log_in.items, list) else str(log_in.items or "")
    db_log = models.MaintenanceLog(
        id=int(max_id) + 1,
        user_id=user.id,
        date=log_in.date,
        odometer=log_in.odometer,
        title=log_in.title,
        items=items_str,
        cost=log_in.cost or 0.0,
        shop=log_in.shop or "SUZUKI 經銷門市",
        note=log_in.note or "",
        invoice_image_url=log_in.invoice_image_url or ""
    )
    db.add(db_log)

    vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
    if vehicle and log_in.odometer > (vehicle.current_odo or 0):
        vehicle.current_odo = log_in.odometer

    db.commit()
    db.refresh(db_log)
    return db_log

@router.delete("/{log_id}")
def delete_maintenance_log(
    log_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id, models.MaintenanceLog.user_id == user.id)
    log = query.first()
    if not log:
        raise HTTPException(status_code=404, detail="保養紀錄未找到")
    db.delete(log)
    db.commit()
    return {"message": "Deleted successfully", "id": log_id}
