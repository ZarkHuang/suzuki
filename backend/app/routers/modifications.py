from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/modifications", tags=["Modifications 改裝日誌"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[schemas.ModificationResponse])
def get_modifications(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    mods = db.query(models.Modification).filter(models.Modification.user_id == user.id).order_by(models.Modification.odometer.desc()).all()
    return mods


@router.post("", response_model=schemas.ModificationResponse, status_code=status.HTTP_201_CREATED)
def create_modification(
    mod_in: schemas.ModificationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    db_mod = models.Modification(
        user_id=user.id,
        date=mod_in.date,
        odometer=mod_in.odometer,
        title=mod_in.title,
        category=mod_in.category or "exterior",
        cost=mod_in.cost or 0,
        bought_from=mod_in.bought_from or "",
        status=mod_in.status or "installed",
        rating=mod_in.rating or 5,
        note=mod_in.note or "",
        image_url=mod_in.image_url or ""
    )
    db.add(db_mod)

    # 同步更新車輛里程
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).first()
    if vehicle and mod_in.odometer > (vehicle.current_odo or 0):
        vehicle.current_odo = mod_in.odometer

    db.commit()
    db.refresh(db_mod)
    return db_mod

@router.delete("/{mod_id}")
def delete_modification(
    mod_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user)
):
    # 若 mod_id 是字串/數字相容查找
    try:
        m_id = int(mod_id)
        query = db.query(models.Modification).filter(models.Modification.id == m_id, models.Modification.user_id == user.id)
    except ValueError:
        query = db.query(models.Modification).filter(models.Modification.title == mod_id, models.Modification.user_id == user.id)

    mod = query.first()
    if not mod:
        raise HTTPException(status_code=404, detail="改裝紀錄未找到")
    db.delete(mod)
    db.commit()
    return {"message": "Deleted successfully", "id": mod_id}

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="不支援的檔案格式，請上傳 JPG/PNG/WEBP 圖片")

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    return {"url": f"/static/uploads/{filename}", "filename": filename}
