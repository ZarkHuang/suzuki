import os
import json
import uuid
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from . import models, schemas

# 自動初始化資料表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Suzuki SUI 125 MotoLog API",
    description="專為機車騎士打造的油耗、保養、改裝日誌與 AI 診斷後端服務",
    version="1.0.0"
)

# 啟用 CORS 跨來源資源共享
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態上傳目錄
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Suzuki SUI 125 MotoLog Backend",
        "docs_url": "/docs"
    }

# ================= 車輛管理 =================
@app.get("/api/vehicle", response_model=schemas.VehicleOut)
def get_vehicle(db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).first()
    if not vehicle:
        # 建立預設 SUI 125 車輛
        default_vehicle = models.Vehicle(
            id="sui-125-default",
            name="Suzuki SUI 125",
            brand="SUZUKI",
            model="SUI 125 (UG125)",
            tank_capacity=5.5,
            fuel_type="92",
            current_odo=300,
            license_plate="ABC-1234",
            note="日常通勤小鴨"
        )
        db.add(default_vehicle)
        db.commit()
        db.refresh(default_vehicle)
        return default_vehicle
    return vehicle

@app.post("/api/vehicle", response_model=schemas.VehicleOut)
def update_vehicle(v: schemas.VehicleBase, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == v.id).first()
    if not vehicle:
        vehicle = models.Vehicle(**v.model_dump())
        db.add(vehicle)
    else:
        for key, val in v.model_dump().items():
            setattr(vehicle, key, val)
    db.commit()
    db.refresh(vehicle)
    return vehicle

# ================= 加油紀錄 =================
@app.get("/api/fuel", response_model=List[schemas.FuelLogOut])
def get_fuel_logs(db: Session = Depends(get_db)):
    return db.query(models.FuelLog).order_by(models.FuelLog.odometer.desc()).all()

@app.post("/api/fuel", response_model=schemas.FuelLogOut)
def create_fuel_log(log: schemas.FuelLogBase, db: Session = Depends(get_db)):
    log_id = log.id or f"fuel-{uuid.uuid4().hex[:8]}"
    db_log = models.FuelLog(
        id=log_id,
        vehicle_id=log.vehicle_id or "sui-125-default",
        date=log.date,
        odometer=log.odometer,
        liters=log.liters,
        price_per_liter=log.price_per_liter or 30.2,
        total_cost=log.total_cost,
        fuel_type=log.fuel_type or "92",
        gas_station=log.gas_station or "台灣中油",
        trip_distance=log.trip_distance or 0,
        efficiency=log.efficiency or 0.0,
        full_tank=log.full_tank if log.full_tank is not None else True,
        note=log.note
    )
    db.add(db_log)

    # 同步更新車輛里程
    vehicle = db.query(models.Vehicle).first()
    if vehicle and log.odometer > vehicle.current_odo:
        vehicle.current_odo = log.odometer

    db.commit()
    db.refresh(db_log)
    return db_log

@app.delete("/api/fuel/{log_id}")
def delete_fuel_log(log_id: str, db: Session = Depends(get_db)):
    db_log = db.query(models.FuelLog).filter(models.FuelLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="紀錄不存在")
    db.delete(db_log)
    db.commit()
    return {"message": "已成功刪除"}

# ================= 保養紀錄 =================
@app.get("/api/maintenance", response_model=List[schemas.MaintenanceLogOut])
def get_maintenance_logs(db: Session = Depends(get_db)):
    logs = db.query(models.MaintenanceLog).order_by(models.MaintenanceLog.odometer.desc()).all()
    result = []
    for l in logs:
        items_list = json.loads(l.items_json) if l.items_json else []
        result.append(schemas.MaintenanceLogOut(
            id=l.id,
            vehicle_id=l.vehicle_id,
            date=l.date,
            odometer=l.odometer,
            title=l.title,
            shop_name=l.shop_name,
            cost=l.cost,
            items=items_list,
            note=l.note,
            receipt_image=l.receipt_image
        ))
    return result

@app.post("/api/maintenance", response_model=schemas.MaintenanceLogOut)
def create_maintenance_log(log: schemas.MaintenanceLogBase, db: Session = Depends(get_db)):
    log_id = log.id or f"maint-{uuid.uuid4().hex[:8]}"
    items_json = json.dumps(log.items or [], ensure_ascii=False)
    db_log = models.MaintenanceLog(
        id=log_id,
        vehicle_id=log.vehicle_id or "sui-125-default",
        date=log.date,
        odometer=log.odometer,
        title=log.title,
        shop_name=log.shop_name or "SUZUKI 形象店",
        cost=log.cost or 0.0,
        items_json=items_json,
        note=log.note,
        receipt_image=log.receipt_image
    )
    db.add(db_log)

    vehicle = db.query(models.Vehicle).first()
    if vehicle and log.odometer > vehicle.current_odo:
        vehicle.current_odo = log.odometer

    db.commit()
    db.refresh(db_log)
    return schemas.MaintenanceLogOut(
        id=db_log.id,
        vehicle_id=db_log.vehicle_id,
        date=db_log.date,
        odometer=db_log.odometer,
        title=db_log.title,
        shop_name=db_log.shop_name,
        cost=db_log.cost,
        items=log.items or [],
        note=db_log.note,
        receipt_image=db_log.receipt_image
    )

@app.delete("/api/maintenance/{log_id}")
def delete_maintenance_log(log_id: str, db: Session = Depends(get_db)):
    db_log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="紀錄不存在")
    db.delete(db_log)
    db.commit()
    return {"message": "已成功刪除"}

# ================= 改裝日誌 =================
@app.get("/api/modifications", response_model=List[schemas.ModificationLogOut])
def get_modifications(db: Session = Depends(get_db)):
    return db.query(models.ModificationLog).order_by(models.ModificationLog.odometer.desc()).all()

@app.post("/api/modifications", response_model=schemas.ModificationLogOut)
def create_modification(mod: schemas.ModificationLogBase, db: Session = Depends(get_db)):
    mod_id = mod.id or f"mod-{uuid.uuid4().hex[:8]}"
    db_mod = models.ModificationLog(
        id=mod_id,
        vehicle_id=mod.vehicle_id or "sui-125-default",
        date=mod.date,
        odometer=mod.odometer or 0,
        title=mod.title,
        category=mod.category or "exterior",
        cost=mod.cost or 0.0,
        bought_from=mod.bought_from,
        status=mod.status or "installed",
        rating=mod.rating or 5,
        note=mod.note,
        image_url=mod.image_url
    )
    db.add(db_mod)
    db.commit()
    db.refresh(db_mod)
    return db_mod

@app.delete("/api/modifications/{mod_id}")
def delete_modification(mod_id: str, db: Session = Depends(get_db)):
    db_mod = db.query(models.ModificationLog).filter(models.ModificationLog.id == mod_id).first()
    if not db_mod:
        raise HTTPException(status_code=404, detail="紀錄不存在")
    db.delete(db_mod)
    db.commit()
    return {"message": "已成功刪除"}

# ================= 圖片上傳 API =================
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"url": f"/static/uploads/{filename}"}

# ================= AI 健檢問診 API (支援 Gemini 2.0 Flash 免費 API) =================
@app.post("/api/ai/diagnosis", response_model=schemas.AiDiagnosisResponse)
async def ai_diagnosis(req: schemas.AiDiagnosisRequest):
    api_key = os.getenv("GEMINI_API_KEY", "")
    
    # 若有設定 Gemini API Key，直接呼叫 Google 官方免費 Gemini Flash 模型
    if api_key:
        try:
            import httpx
            system_prompt = (
                "你是一位專精於台鈴機車 SUZUKI (特別是 SUI 125/Saluto/Swish) 的資深機車技師與保養顧問。"
                "請根據車主提問的車況異常、保養里程或疑難雜症，給予專業、精確且易於理解的診斷與排查步驟。"
            )
            user_content = f"車輛型號: {req.vehicle_model} (目前總里程: {req.current_odo}km)\n車主問題: {req.query}"

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_content}"}]}
                ]
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
                    return schemas.AiDiagnosisResponse(
                        diagnosis=text_resp,
                        urgency="AI 智能診斷分析完畢",
                        suggested_actions=["依照診斷建議排查", "確認 SUI 125 保養手冊里程", "必要時回授權車行檢測"]
                    )
        except Exception as e:
            print(f"Gemini API 呼叫失敗，切換至本機知識庫: {e}")

    # Fallback 預設規則引擎
    q = req.query.lower()
    if "抖動" in q or "起步" in q:
        return schemas.AiDiagnosisResponse(
            diagnosis="SUI 125 起步低速抖動多為傳動離合器蹄片與碗公咬合打滑引起，常見於走走停停市區路況。",
            urgency="建議 1,000km 內回店檢查",
            suggested_actions=[
                "拆開傳動蓋清潔碗公粉塵",
                "使用砂紙打磨離合器蹄片表面",
                "若里程已破萬，可考慮更換改裝真圓劃線碗公"
            ]
        )
    elif "煞車" in q or "來令" in q or "軟" in q:
        return schemas.AiDiagnosisResponse(
            diagnosis="煞車手感過軟可能為煞車油內含水分或管路微量進氣；若有刺耳聲響則為來令片厚度耗盡。",
            urgency="急迫 (影響行車安全)",
            suggested_actions=[
                "目視檢查前輪卡鉗來令片剩餘厚度是否低於 1.5mm",
                "更換 DOT 4 煞車油並徹底洩氣排除管路氣泡"
            ]
        )
    else:
        return schemas.AiDiagnosisResponse(
            diagnosis=f"針對您描述的「{req.query}」，建議先對照 SUI 125 保養手冊里程規範。",
            urgency="一般注意",
            suggested_actions=[
                "檢查機油視窗油量 (SUI 容量 650cc)",
                "檢查前後輪胎壓 (前 25 psi / 後 29 psi)",
                "如持續異常請至授權經銷檢測"
            ]
        )

