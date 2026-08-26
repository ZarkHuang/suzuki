# 🛵 SUZUKI SUI 125 機車管家 (MotoLog PWA)

專為 **Suzuki SUI 125 騎士**（以及通用機車騎士）打造的開源機車管理 PWA 應用。  
具備**油耗計算**、**原廠保養週期提醒**、**改裝日誌**與 **AI 車況診斷**功能。支援離線存儲、無須上架 App Store 即可在手機一鍵安裝使用，並且支援 **100% 永久 0 元免費部署**！

---

## ✨ 核心特色

1. **📱 PWA 原生體驗（免上架）**
   - 支援 iPhone (Safari) 與 Android (Chrome) 一鍵「新增至主畫面」。
   - 支援離線快取（離線優先架構），沒網路或在地下室也能秒開記帳。

2. **⛽ 油耗與加油分析**
   - 自動計算單次行駛區間里程與實際油耗（$km/L$）。
   - 支援 **週 / 月 / 年 / 總覽** 統計圖表（Chart.js 油耗曲線與花費長條圖）。
   - 統計每公里花費（$NT\$/km$）。

3. **🛠️ Suzuki SUI 125 官方保養規範**
   - 內建原廠手冊保養里程排程：**300km 首保**、**1,000km**、**4,000km**、**8,000km**、**12,000km 大保養**...
   - 一鍵快速套用官方保養項目，支援工單照片上傳與自訂耗材。
   - 零件耗材壽命儀表（機油、齒輪油、空濾、火星塞、皮帶、煞車皮）。

4. **✨ SUI 125 改裝日誌與相簿**
   - 記錄改裝品項、購買通路、購入價格、滿意度評分與心得。
   - 支援改裝完工實裝照上傳與全螢幕燈箱檢視。

5. **🤖 AI 隨車健檢診斷**
   - 針對「起步抖動」、「冷車難發」、「煞車變軟」、「油耗惡化」等常見機車故障提供結構化排查建議。

6. **🎨 極致黑白極簡 + Suzuki 經典藍紅白配色**
   - 專為騎士手感設計的直覺 UI，包含儀表板進度條與快速打卡按鈕。

---

## 🛠️ 技術架構

```text
suzuki/
├── frontend/             # Vue 3 + Vite + Pinia + Vue Router + PWA + Chart.js
│   ├── src/
│   │   ├── components/   # Header, NavBar, Modals (里程/加油/保養/改裝)
│   │   ├── views/        # Dashboard, Fuel, Maintenance, Mods, AI, Settings
│   │   ├── stores/       # Pinia motoStore (含 LocalStorage 離線持久化)
│   │   └── constants/    # SUI 125 官方原廠規格與保養數據
│   └── Dockerfile
├── backend/              # Python FastAPI + SQLAlchemy + Pydantic
│   ├── app/              # RESTful API, 資料庫模型, AI 診斷
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml    # 一鍵啟動 前端 + 後端 + MySQL
```

---

## 🚀 本地開發與運行

### 方式一：前端獨立啟動（最快速，直接在手機/電腦預覽）
```bash
cd frontend
npm install
npm run dev
```
瀏覽器打開 `http://localhost:5173` 即可開始體驗！

### 方式二：Docker Compose 一鍵啟動全套環境（前端 + Python 後端 + MySQL）
```bash
# 於專案根目錄執行
docker compose up --build -d
```
- 前端 PWA：`http://localhost`
- 後端 Swagger API 文件：`http://localhost:8000/docs`
- MySQL 資料庫：`localhost:3306`

---

## ☁️ 0 元 24 小時雲端免費部署指南（電腦關機手機照常使用）

如果您希望電腦關機後，手機出門在外依然能 24 小時隨時使用，可依照以下三步驟進行完全免費的雲端託管：

### 1. 前端託管 (Vercel / Cloudflare Pages - 永久免費)
1. 將專案推上您的 GitHub Repository。
2. 登入 [Vercel](https://vercel.com) 或 [Cloudflare Pages](https://pages.cloudflare.com)。
3. 選擇 `frontend` 目錄，Framework 選擇 `Vite`，點擊 Deploy。
4. 部署完成後會獲得一個免費的 `https://your-app.vercel.app` 專屬網址。

### 2. 資料庫託管 (Aiven / TiDB Cloud - 永久免費)
1. 註冊 [Aiven.io](https://aiven.io) 或 [TiDB Cloud](https://tidbcloud.com)。
2. 建立一個免費的 MySQL 資料庫，複製連線字串（Connection String）。

### 3. 後端託管 (Render.com - 免費 Web Service)
1. 登入 [Render.com](https://render.com)。
2. 建立 Web Service，選擇 `backend` 目錄（或使用 Dockerfile）。
3. 設定環境變數 `DATABASE_URL` 為步驟 2 的 MySQL 連線字串。

---

## 📱 如何將 PWA 安裝至手機主畫面？

1. **iPhone (iOS Safari)**：
   - 使用 Safari 開啟網站網址。
   - 點擊底部工具列中間的 **「分享」** 按鈕（向上箭頭）。
   - 向下滑動點選 **「加入主畫面」 (Add to Home Screen)** ➔ 點擊右上角「新增」。

2. **Android (Chrome)**：
   - 使用 Chrome 開啟網站網址。
   - 點擊右上角選單「**⋮**」。
   - 點選 **「安裝應用程式」** 或 **「加到主畫面」**。

---

## 📄 License
MIT License. 歡迎車友交流與 Fork 改進！
