import os
import json
import uuid
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models, schemas, database, auth
from .database import engine, get_db

# 自動建立資料表 (含 users, user_id 關聯)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SUZUKI SUI 125 雲端多租戶 API",
    version="2.0.0"
)

# CORS 設定 (允許 Vercel 前端與本地連線)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態檔案目錄 (用於圖片上傳)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ================= 身份驗證 API (SaaS 多用戶支援) =================
@app.post("/api/auth/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # 檢查 Email 是否已存在
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="該 Email 已被註冊，請直接登入")

    # 建立新用戶
    hashed_pwd = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 建立該用戶的初始車輛
    init_vehicle = models.Vehicle(
        id=f"vehicle-{new_user.id}",
        user_id=new_user.id,
        name="SUZUKI SUI 125",
        brand="SUZUKI",
        model="SUI 125",
        license_plate="MY-SUI125",
        current_odo=300,
        tank_capacity=5.5,
        fuel_type="92"
    )
    db.add(init_vehicle)
    db.commit()

    # 簽發 JWT Token
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@app.post("/api/auth/login", response_model=schemas.Token)
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

@app.post("/api/auth/google", response_model=schemas.Token)
def google_auth(auth_in: schemas.GoogleAuthInput, db: Session = Depends(get_db)):
    # 尋找是否已有該 Google Email 用戶
    user = db.query(models.User).filter(models.User.email == auth_in.email).first()
    if not user:
        # 自動建立新用戶 (產生隨機安全密碼雜湊)
        random_pwd = uuid.uuid4().hex
        hashed_pwd = auth.get_password_hash(random_pwd)
        user = models.User(
            email=auth_in.email,
            username=auth_in.name or "Google車主",
            hashed_password=hashed_pwd
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 建立該用戶專屬車輛
        init_vehicle = models.Vehicle(
            id=f"veh-{user.id}",
            user_id=user.id,
            name="SUZUKI SUI 125",
            brand="SUZUKI",
            model="SUI 125",
            license_plate="MY-SUI125",
            current_odo=300,
            tank_capacity=5.5,
            fuel_type="92"
        )
        db.add(init_vehicle)
        db.commit()

    # 簽發專屬 JWT Token
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user



@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Suzuki SUI 125 MotoLog Backend",
        "docs_url": "/docs"
    }

# ================= 車輛管理 (多用戶隔離) =================
@app.get("/api/vehicle", response_model=schemas.VehicleOut)
def get_vehicle(
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.Vehicle)
    if user:
        vehicle = query.filter(models.Vehicle.user_id == user.id).first()
    else:
        vehicle = query.filter(models.Vehicle.user_id == None).first() or query.first()

    if not vehicle:
        # 建立預設 SUI 125 車輛
        user_id = user.id if user else None
        veh_id = f"veh-{user_id}" if user_id else "sui-125-default"
        default_vehicle = models.Vehicle(
            id=veh_id,
            user_id=user_id,
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
def update_vehicle(
    v: schemas.VehicleBase, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    user_id = user.id if user else None
    query = db.query(models.Vehicle)
    if user_id:
        vehicle = query.filter(models.Vehicle.user_id == user_id).first()
    else:
        vehicle = query.filter(models.Vehicle.id == v.id).first()

    if not vehicle:
        v_data = v.model_dump()
        v_data["user_id"] = user_id
        vehicle = models.Vehicle(**v_data)
        db.add(vehicle)
    else:
        for key, val in v.model_dump().items():
            if key != "id":
                setattr(vehicle, key, val)
        if user_id:
            vehicle.user_id = user_id
    db.commit()
    db.refresh(vehicle)
    return vehicle

# ================= 加油紀錄 (多用戶隔離) =================
@app.get("/api/fuel", response_model=List[schemas.FuelLogOut])
def get_fuel_logs(
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.FuelLog)
    if user:
        query = query.filter(models.FuelLog.user_id == user.id)
    return query.order_by(models.FuelLog.odometer.desc()).all()

@app.post("/api/fuel", response_model=schemas.FuelLogOut)
def create_fuel_log(
    log: schemas.FuelLogBase, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    user_id = user.id if user else None
    log_id = log.id or f"fuel-{uuid.uuid4().hex[:8]}"
    db_log = models.FuelLog(
        id=log_id,
        user_id=user_id,
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
    veh_query = db.query(models.Vehicle)
    if user_id:
        veh_query = veh_query.filter(models.Vehicle.user_id == user_id)
    vehicle = veh_query.first()
    if vehicle and log.odometer > vehicle.current_odo:
        vehicle.current_odo = log.odometer

    db.commit()
    db.refresh(db_log)
    return db_log

@app.delete("/api/fuel/{log_id}")
def delete_fuel_log(
    log_id: str, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.FuelLog).filter(models.FuelLog.id == log_id)
    if user:
        query = query.filter(models.FuelLog.user_id == user.id)
    db_log = query.first()
    if not db_log:
        raise HTTPException(status_code=404, detail="紀錄不存在")
    db.delete(db_log)
    db.commit()
    return {"message": "已成功刪除"}

# ================= 保養紀錄 (多用戶隔離) =================
@app.get("/api/maintenance", response_model=List[schemas.MaintenanceLogOut])
def get_maintenance_logs(
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.MaintenanceLog)
    if user:
        query = query.filter(models.MaintenanceLog.user_id == user.id)
    logs = query.order_by(models.MaintenanceLog.odometer.desc()).all()
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
def create_maintenance_log(
    log: schemas.MaintenanceLogBase, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    user_id = user.id if user else None
    log_id = log.id or f"maint-{uuid.uuid4().hex[:8]}"
    items_json = json.dumps(log.items or [], ensure_ascii=False)
    db_log = models.MaintenanceLog(
        id=log_id,
        user_id=user_id,
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

    veh_query = db.query(models.Vehicle)
    if user_id:
        veh_query = veh_query.filter(models.Vehicle.user_id == user_id)
    vehicle = veh_query.first()
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
def delete_maintenance_log(
    log_id: str, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id)
    if user:
        query = query.filter(models.MaintenanceLog.user_id == user.id)
    db_log = query.first()
    if not db_log:
        raise HTTPException(status_code=404, detail="紀錄不存在")
    db.delete(db_log)
    db.commit()
    return {"message": "已成功刪除"}


# ================= 改裝日誌 (多用戶隔離) =================
@app.get("/api/modifications", response_model=List[schemas.ModificationLogOut])
def get_modifications(
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.ModificationLog)
    if user:
        query = query.filter(models.ModificationLog.user_id == user.id)
    return query.order_by(models.ModificationLog.odometer.desc()).all()

@app.post("/api/modifications", response_model=schemas.ModificationLogOut)
def create_modification(
    mod: schemas.ModificationLogBase, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    user_id = user.id if user else None
    mod_id = mod.id or f"mod-{uuid.uuid4().hex[:8]}"
    db_mod = models.ModificationLog(
        id=mod_id,
        user_id=user_id,
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
def delete_modification(
    mod_id: str, 
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    query = db.query(models.ModificationLog).filter(models.ModificationLog.id == mod_id)
    if user:
        query = query.filter(models.ModificationLog.user_id == user.id)
    db_mod = query.first()
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

# ================= AI 健檢問診 API (雙引擎：Gemini Flash + SUI 125 專家推理) =================
@app.post("/api/ai/diagnosis", response_model=schemas.AiDiagnosisResponse)
async def ai_diagnosis(req: schemas.AiDiagnosisRequest):
    api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAnpi95Gzacpe-DXWSURBnhoO7WetM-0S4").strip()
    
    # 引擎 A: 嘗試呼叫 Google 官方 Gemini 模型 (海外 Render 伺服器高速直連)
    if api_key:
        system_prompt = (
            "你是一位專精於台灣機車 (特別是 SUZUKI 台鈴機車 SUI 125 / Saluto / Swish / NEX 等車款) 的資深機車技師與保養顧問。\n"
            "請根據車主提問的車況異常、異音、保養里程或疑難雜症，給予親切、專業、精確且條理分明的排查診斷與建議處置步驟。"
        )
        full_prompt = f"{system_prompt}\n\n車輛型號: {req.vehicle_model} (目前總里程: {req.current_odo}km)\n車主問題: {req.query}"

        model_list = [
            "models/gemini-flash-latest",
            "models/gemini-pro-latest",
            "models/gemini-2.0-flash-exp",
            "models/gemini-1.5-flash-latest"
        ]

        for m in model_list:
            url = f"https://generativelanguage.googleapis.com/v1beta/{m}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}]
            }
            try:
                import httpx
                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            text_resp = candidates[0]["content"]["parts"][0]["text"]
                            return schemas.AiDiagnosisResponse(
                                diagnosis=text_resp,
                                urgency="✨ 由 Google Gemini AI 智慧深度分析",
                                suggested_actions=[
                                    "對照 SUI 125 原廠手冊里程規範",
                                    "依上述建議步驟逐步排查耗材狀態",
                                    "如持續有行車安全疑慮請洽授權經銷店"
                                ]
                            )
            except Exception as ex:
                print(f"[{m}] 連線異常: {ex}")

    # 引擎 B: 專業 SUI 125 機車專家深度推理規則庫 (零延遲、保證精確)
    q = req.query.lower()

    if any(k in q for k in ["難發", "發動", "發不動", "熄火", "怠速", "電瓶"]):
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 車況診斷：冷車難發 / 怠速不穩排查\n\n"
                f"針對您描述的問題，SUI 125（SEP 節能引擎）在此類狀況下的常見原因與排查如下：\n\n"
                f"1. **電瓶健康度與電壓衰退（機率 50%）：**\n"
                f"   - 靜態未發動電壓需在 **12.4V~12.8V** 之間，若低於 12.2V 啟動馬達轉速不足會導致噴油點火困難。\n"
                f"2. **火星塞積碳 / 電極間隙過大（機率 30%）：**\n"
                f"   - 原廠規格為 **CPR6EA-9**，若已騎乘超過 5,000~8,000 km，火星塞積碳會造成冷車點火微弱。\n"
                f"3. **節流閥與怠速旁通閥 (ISC) 積碳（機率 15%）：**\n"
                f"   - 市區走停容易累積油泥，導致怠速進氣量不足而停等熄火。\n"
                f"4. **汽油幫浦濾網微堵塞：**\n"
                f"   - 開電門時聽聽看斜板內是否有「嗡～」約 2 秒的油幫加壓聲。"
            ),
            urgency="建議儘速檢查電瓶與火星塞",
            suggested_actions=[
                "至車行使用三用電表測量電瓶冷啟動電壓 (CCA)",
                "拆卸檢查火星塞電極燃燒狀況，必要時更換 (約 $150~$200)",
                "若里程超過 8,000km，建議做節流閥超音波清潔"
            ]
        )
    elif any(k in q for k in ["抖動", "起步", "離合器", "碗公"]):
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 車況診斷：起步低速劇烈抖動\n\n"
                f"**診斷分析：**\n"
                f"SUI 125 在時速 15~25 km/h 起步接合時的抖動，為速克達 CVT 傳動系統的經典特徵：\n\n"
                f"1. **離合器蹄片粉塵打滑：** 市區走走停停，摩擦耗損的粉塵附著在碗公內壁產生咬合不順。\n"
                f"2. **小彈簧軟化：** 造成三片蹄片彈開時機不均勻。\n"
                f"3. **普利珠磨損吃單邊：** 變速盤面卡頓。\n\n"
                f"**🛠️ 建議處置方式：**\n"
                f"- **輕度：** 拆下傳動外蓋，使用煞車清潔劑清洗傳動室並用細砂紙輕微打磨蹄片。\n"
                f"- **長期解決：** 可更換真圓度較高的劃線碗公或副廠耐磨離合器。"
            ),
            urgency="一般維護點檢 (不影響立即行車安全)",
            suggested_actions=[
                "清潔傳動室與碗公粉塵 (工資約 $200~$300)",
                "檢查傳動室冷卻濾棉是否堵塞",
                "若里程破萬公里，建議一併檢查普利珠與皮帶寬度"
            ]
        )
    elif any(k in q for k in ["煞車", "來令", "碟盤", "軟", "煞不住"]):
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 車況診斷：煞車制動軟弱 / 異音分析\n\n"
                f"**安全重點排查：**\n"
                f"1. **前輪來令片磨耗臨界：** 厚度若小於 1.5mm 會開始磨到背板金屬，產生刺耳金屬摩擦聲且刮傷碟盤。\n"
                f"2. **煞車油含水量過高 / 管路進氣：** DOT 4 煞車油使用 1~2 年後受潮，導致拉桿手感虛軟行程變長。\n"
                f"3. **後鼓煞調整螺絲鬆脫：** SUI 125 後輪為鼓煞，若後煞行程過大，可手動順時針旋轉排氣管旁的調整螺帽 1~2 圈。"
            ),
            urgency="⚠️ 高度急迫 (影響制動安全)",
            suggested_actions=[
                "立即目視檢查前輪卡鉗來令片厚度",
                "若拉桿行程過軟，建議更換全新 DOT 4 煞車油並排除氣泡",
                "調整後輪鼓煞搖臂拉桿間隙"
            ]
        )
    elif any(k in q for k in ["油耗", "耗油", "吃油", "省油"]):
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 車況診斷：油耗異常惡化排查\n\n"
                f"SUI 125 官方測試平均油耗約 **46.8 km/L**，若掉至 38 km/L 以下，請排查：\n\n"
                f"1. **輪胎胎壓不足（最常見兇手）：** 前輪需 25 psi、後輪需 29 psi，胎壓不足滾動阻力大增。\n"
                f"2. **空氣濾清器 (空濾) 堵塞：** 造成進氣量不足、燃油燃燒不完全。\n"
                f"3. **傳動皮帶打滑或離合器打滑：** 轉速升高但動力未有效傳輸至後輪。\n"
                f"4. **機油添加過量：** SUI 125 更換量嚴格為 **650 cc**，若加滿整罐 800cc/1L 會造成曲軸運轉阻力過大而極耗油！"
            ),
            urgency="建議 500km 內調整",
            suggested_actions=[
                "至中油加油站免費充氣機檢查前後輪胎壓",
                "確認上次換機油時是否確實添加 650cc（不可過量）",
                "拆檢空濾濾紙是否發黑"
            ]
        )
    else:
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 隨車技師車況分析\n\n"
                f"針對您詢問的 **「{req.query}」**：\n\n"
                f"1. **SUI 125 原廠規範對照：** 目前您的愛車累積里程約為 **{req.current_odo} km**。\n"
                f"2. **日常點檢四要素：**\n"
                f"   - 機油量視窗（標準更換量 650cc，不可過多亦不可過少）。\n"
                f"   - 胎壓（冷胎前輪 25 psi / 後輪 29 psi）。\n"
                f"   - 燈系與方向燈作動。\n"
                f"   - 煞車拉桿手感行程。\n"
                f"3. **保養週期提醒：** 若已接近 300km (首保)、1000km、4000km、8000km，建議至「保養與零件」分頁查看原廠建議項目。"
            ),
            urgency="一般行車注意",
            suggested_actions=[
                "查看愛車當前里程對應之原廠保養項目",
                "檢查機油與胎壓狀態",
                "若有持續金屬異響請回授權經銷店檢測"
            ]
        )



