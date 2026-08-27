from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
import os
import httpx

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/ai", tags=["AI 健檢與診斷"])

@router.post("/diagnose", response_model=schemas.AiDiagnosisResponse)
async def diagnose(req: schemas.AiDiagnosisRequest):
    # 支援後端 Gemini API Key 備援診斷
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        prompt_text = f"你是機車專業資深維修技師。車輛型號：{req.vehicle_model}，里程：{req.current_odo}km。車主描述問題：{req.query}。請給出條理分明、專業的排查處置建議。"
        payload = {
            "contents": [{"parts": [{"text": prompt_text}]}]
        }
        for m in ["gemini-3.1-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        text_resp = data["candidates"][0]["content"]["parts"][0]["text"]
                        return schemas.AiDiagnosisResponse(
                            diagnosis=text_resp,
                            urgency="正常保養排查",
                            suggested_actions=["對照原廠保養規範", "檢查機油量與耗材損耗", "必要時至授權經銷檢測"]
                        )
            except Exception:
                pass

    # 專業 SUI 125 本地專家規則庫
    q = req.query.lower()
    if any(k in q for k in ["難發", "發動", "發不動", "熄火", "怠速", "電瓶"]):
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 車況診斷：冷車難發 / 怠速不穩排查\n\n"
                f"針對您描述的問題，SUI 125（SEP 節能引擎）在此類狀況下的常見原因與排查如下：\n\n"
                f"1. **電瓶健康度與電壓衰退（機率 50%）：** 靜態未發動電壓需在 12.4V~12.8V 之間。\n"
                f"2. **火星塞積碳 / 電極間隙過大（機率 30%）：** 原廠規格為 CPR6EA-9。\n"
                f"3. **節流閥與怠速旁通閥 (ISC) 積碳（機率 15%）：** 市區走停容易累積油泥。\n"
                f"4. **汽油幫浦濾網微堵塞：** 開電門時聽聽看是否有油幫加壓聲。"
            ),
            urgency="建議儘速檢查電瓶與火星塞",
            suggested_actions=["測量電瓶冷啟動電壓 (CCA)", "檢查火星塞燃燒狀況", "若里程超過 8,000km 清潔節流閥"]
        )
    elif any(k in q for k in ["抖動", "起步", "離合器", "碗公"]):
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"### 🛵 Suzuki SUI 125 車況診斷：起步低速劇烈抖動\n\n"
                f"1. **離合器蹄片粉塵打滑：** 市區走停粉塵附著在碗公內壁產生咬合不順。\n"
                f"2. **小彈簧軟化：** 造成三片蹄片彈開時機不均勻。\n"
                f"3. **普利珠磨損吃單邊：** 變速盤面卡頓。"
            ),
            urgency="建議定期傳動清潔保養",
            suggested_actions=["拆開傳動蓋清潔粉塵與碗公砂紙微拋光", "檢查離合器蹄片厚度", "檢查普利珠與皮帶有無龜裂"]
        )
    else:
        return schemas.AiDiagnosisResponse(
            diagnosis=(
                f"針對您描述的「{req.query}」，建議先對照 SUI 125 原廠保養手冊規範排查。\n\n"
                f"**🛠️ 建議處置行動：**\n"
                f"- 檢查機油視窗油量 (SUI 容量 650cc)\n"
                f"- 檢查前後輪胎壓 (前 25 psi / 後 29 psi)\n"
                f"- 如持續異常請至授權經銷檢測"
            ),
            urgency="觀察車況並注意保養里程",
            suggested_actions=["檢查機油量 (SUI 容量 650cc)", "檢查前後輪胎壓", "如持續異常請至授權經銷檢測"]
        )
