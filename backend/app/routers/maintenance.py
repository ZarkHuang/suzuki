from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import json

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance 保養日誌"])

@router.get("", response_model=List[schemas.MaintenanceLogResponse])
def get_maintenance_logs(
    limit: Optional[int] = None,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    try:
        query = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.user_id == user.id).order_by(models.MaintenanceLog.odometer.desc())
        if offset > 0:
            query = query.offset(offset)
        if limit is not None and limit > 0:
            query = query.limit(limit)
        return query.all()
    except Exception as e:
        db.rollback()
        print(f"⚠️ get_maintenance_logs fallback: {e}")
        return []


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
