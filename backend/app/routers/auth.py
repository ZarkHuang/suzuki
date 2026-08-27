from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/auth", tags=["Auth 身份認證"])

@router.post("/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="該 Email 已被註冊，請直接登入")

    hashed_pwd = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 建立該車主專屬的預設車輛設定 (加入容錯保護，保證註冊 100% 成功回傳)
    try:
        from sqlalchemy import func
        max_vid = db.query(func.max(models.Vehicle.id)).scalar() or 0
        init_vehicle = models.Vehicle(
            id=int(max_vid) + 1,
            user_id=new_user.id,
            name="SUZUKI SUI 125",
            brand="SUZUKI",
            model="SUI 125",
            plate_number="MY-SUI125",
            license_plate="MY-SUI125",
            current_odo=0,
            tank_capacity=5.5,
            fuel_type="92"
        )
        db.add(init_vehicle)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ init_vehicle warning (safe fallback): {e}")

    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not auth.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Email 或密碼錯誤")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
