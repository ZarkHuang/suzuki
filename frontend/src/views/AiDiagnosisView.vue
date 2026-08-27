<script setup>
import { ref, nextTick } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { api } from '../services/api'
import { GoogleGenAI } from '@google/genai'
import { 
  Bot, 
  Send, 
  Trash2, 
  CheckCircle,
  RotateCcw,
  Sparkles
} from 'lucide-vue-next'

const store = useMotoStore()
const userInput = ref('')
const isThinking = ref(false)
const chatContainer = ref(null)

// 初始化 Google 官方新版 @google/genai SDK
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBc2hgta4L0aGZQQCD4BaoFuzXpzJxBEvg"
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })



// 內建 SUI 125 與一般速克達專業機車離線知識庫
const QUICK_ISSUES = [
  {
    label: '起步劇烈抖動',
    query: '我的 SUI 125 起步低速（20~30km/h）會有明顯抖動感，這是什麼原因？如何處理？'
  },
  {
    label: '冷車難發 / 怠速不穩',
    query: '最近早上牽車冷車不好發動，或者停紅綠燈有時感覺快熄火，該檢查哪些零件？'
  },
  {
    label: '煞車手感變軟 / 有異音',
    query: '前煞車拉桿拉到底感覺很軟制動力不足，或者煞車時有尖銳金屬磨擦聲，該怎麼辦？'
  },
  {
    label: '油耗突然暴增',
    query: '平常油耗都在 45km/L 左右，最近突然掉到 35km/L，可能有哪些原因？'
  },
  {
    label: '傳動室有異音 / 異味',
    query: '騎乘加速時傳動箱附近有金屬敲擊聲或燒焦味，應該注意什麼？'
  }
]

// 本地規則引擎離線解答庫
const getOfflineDiagnosis = (query) => {
  const q = query.toLowerCase()

  if (q.includes('抖動') || q.includes('起步') || q.includes('離合器')) {
    return `### 🛵 診斷分析：速克達起步抖動
**常見原因：**
1. **離合器蹄片與碗公打滑/打油：** 市區頻繁走停，碗公內累積粉塵或微量油漬導致咬合不均。
2. **大彈簧疲乏或小彈簧斷裂：** 離合器接合轉速異常。
3. **普利珠/普利盤磨損：** 變速盤面卡溝槽。

**🛠️ 建議處置步驟：**
- **輕微：** 回車行拆開傳動蓋，清潔碗公粉塵並用砂紙輕微打磨蹄片表面（工資約 $200~$300）。
- **嚴重（里程 > 10,000km）：** 建議更換改裝/原廠強化離合器與真圓度良好之劃線碗公。`
  }

  if (q.includes('難發') || q.includes('發動') || q.includes('熄火') || q.includes('怠速')) {
    return `### 🛵 診斷分析：發動困難 / 怠速不穩
**常見原因：**
1. **電瓶電壓不足：** 靜態電壓低於 12.3V，啟動馬達轉動無力。
2. **火星塞積碳/電極耗損：** SUI 125 建議每 8,000km 更換火星塞。
3. **節流閥/怠速旁通閥(ISC)積碳：** 空氣流量受阻造成混合比失調。
4. **汽油幫浦壓力異常：** 燃油濾網堵塞。

**🛠️ 建議處置步驟：**
- 先使用三用電表測量電瓶電壓（發動後回充需在 13.5V~14.5V）。
- 如里程超過 8,000km，建議回經銷做**節流閥噴油嘴超音波清潔**並更換原廠規格火星塞。`
  }

  if (q.includes('煞車') || q.includes('來令') || q.includes('異音') || q.includes('軟')) {
    return `### 🛵 診斷分析：煞車制動力不足 / 尖銳異音
**常見原因：**
1. **煞車皮（來令片）磨耗見底：** 來令片背板已磨到碟盤產生刺耳金屬聲，會刮傷碟盤！
2. **煞車油受潮變質或管路進氣：** 導致液壓傳導效率下降，煞車拉桿手感虛軟。
3. **煞車卡鉗活塞卡死：** 長期泥沙粉塵未清潔。

**🛠️ 建議處置步驟：**
- **立即檢查前輪煞車來令片厚度**，若低於 1.5mm 請立即更換，避免損壞碟盤。
- 若更換來令後仍軟，需重新更換 DOT 4 煞車油並排除管路空氣（洩氣工序）。`
  }

  if (q.includes('油耗') || q.includes('耗油')) {
    return `### 🛵 診斷分析：油耗異常惡化
**常見原因：**
1. **胎壓不足（最常見！）：** SUI 125 前輪建議 25 psi、後輪 29 psi，胎壓過低滾動阻力增加 15%~20%。
2. **空氣濾清器 (空濾) 嚴重髒污：** 進氣不足造成燃燒不完全。
3. **傳動皮帶打滑或普利珠磨損吃重：** 引擎高轉速但車速無法有效延伸。
4. **火星塞點火不良。**

**🛠️ 建議處置步驟：**
- 先至加油站免費打氣機檢查胎壓。
- 打開空濾蓋檢查濾紙是否變黑發油，更換原廠空濾（料價約 $150~$200）。`
  }

  return `### 🛵 Suzuki SUI 125 綜合車況診斷
針對您的問題 **「${query}」**：

1. **基本排除：** 建議先檢查全車燈系、電瓶電壓、胎壓以及機油油量視窗（SUI 機油更換量為 650cc）。
2. **零件壽命對照：** 若車輛累積里程已達保養門檻（如 300km、1000km、4000km、8000km），請優先至「保養與零件」分頁確認耗材更換紀錄。
3. **安全提醒：** 若有涉及引擎異常巨響、車頭龍頭劇烈晃動或煞車失靈，切勿勉強騎乘，請就近至 SUZUKI 授權經銷門市檢測！`
}


const sendQuery = async (text) => {

  const q = text || userInput.value
  if (!q.trim()) return

  // 使用者發送訊息
  store.addAiMessage('user', q.trim())
  userInput.value = ''
  isThinking.value = true

  // 滾動到底部
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }

  try {
    // 整理車輛即時客觀數據 (供 AI 交叉比對)
    const recentMaints = store.maintenanceLogs.slice(0, 3).map(m => `${m.odometer}km [${m.title}] (${m.date})`).join('、') || '尚無紀錄'
    const currentMods = store.modifications.map(mod => `【${mod.category}】${mod.title}`).join('、') || '無改裝 (原廠狀態)'
    const avgEff = store.averageEfficiency > 0 ? `${store.averageEfficiency} km/L` : '尚無足夠數據'
    const urgentParts = store.partsStatusList.filter(p => p.status === 'critical' || p.status === 'warning').map(p => `${p.name}(已使用${p.distanceUsed}km)`).join('、') || '目前各耗材壽命良好'

    const vehicleBrand = store.vehicle.brand || 'SUZUKI'
    const vehicleModel = store.vehicle.model || store.vehicle.name || 'SUI 125'
    const systemPrompt = `你是一位精通台灣主流機車（包含 ${vehicleBrand}、SYM 三陽、KYMCO 光陽、YAMAHA 山葉、GOGORO 等各式速克達與檔車）的資深機車維修技師長與保養顧問。
請根據車主提問的車況異常、異音、保養里程或疑難雜症，給予親切、專業、條理分明的排查診斷與建議處置步驟。請特別針對車主的真實車款【${vehicleBrand} ${vehicleModel}】進行專屬結構、機械特性、常見通病與原廠保養規範來給出客製化建議。

【車主愛車真實數據與車況 (請優先以此作為診斷依據)】：
- 愛車廠牌與型號：${vehicleBrand} ${vehicleModel} (車牌: ${store.vehicle.licensePlate || '未設定'})
- 目前總累積里程：${store.currentOdometer} km
- 油箱容量 / 建議油品：${store.vehicle.tankCapacity || 5.5}L / ${store.vehicle.fuelType || '92'}無鉛汽油
- 平均油耗表現：${avgEff}
- 近期保養紀錄：${recentMaints}
- 目前改裝項目清單：${currentMods}
- 耗材健康度預警：${urgentParts}`

    // 優先使用新版官方 SDK @google/genai 調用 gemini-2.5-flash
    let responseText = ''
    try {
      // 組織滑動歷史對話視窗 (最多取最近 6 則)
      const rawHistory = store.aiChatHistory.slice(0, -1).slice(-6)
      const formattedContents = [
        ...rawHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: q }]
        }
      ]

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: formattedContents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      })

      responseText = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) || ''
    } catch (sdkErr) {
      console.warn('@google/genai 3.1-flash-lite 調用異常，嘗試 gemini-2.0-flash-lite / 本地知識庫:', sdkErr)
      try {
        const res = await ai.models.generateContent({
          model: 'gemini-2.0-flash-lite',
          contents: q,
          config: { systemInstruction: systemPrompt }
        })
        responseText = res.text || ''
      } catch (fErr) {
        console.warn('啟用本地專家知識庫:', fErr)
        responseText = getOfflineDiagnosis(q)
      }
    }

    // 檢查目前問答輪數 (若已超過 5 則，主動詢問是否解決並引導結案)
    const userMsgCount = store.aiChatHistory.filter(m => m.role === 'user').length
    if (userMsgCount >= 5) {
      responseText += '\n\n---\n💡 **隨車技師提醒：** 本次問診已進行多次深度討論。請問您的問題是否已獲得妥善解答？若需探討其他新問題，建議點擊下方按鈕結案或開啟新問診，以獲得最精準的診斷喔！'
    }

    store.addAiMessage('assistant', responseText)
  } catch (err) {
    console.error('AI 健檢處理異常:', err)
    const diagnosis = getOfflineDiagnosis(q)
    store.addAiMessage('assistant', diagnosis)
  } finally {
    isThinking.value = false

    await nextTick()
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  }
}



// 結案並開啟新對話
const finishAndResetSession = () => {
  store.clearAiChat()
}




const clearHistory = () => {
  if (confirm('確定要清空對話紀錄嗎？')) {
    store.clearAiChat()
  }
}

</script>

<template>
  <div class="app-container ai-page">
    <!-- 標頭 -->
    <div class="page-header">
      <div class="header-left">
        <div class="ai-avatar">
          <Bot :size="20" />
        </div>
        <div>
          <h2 class="page-title">AI 機車健檢小幫手</h2>
          <p class="page-subtitle">SUI 125 故障判斷與保養除錯建議</p>
        </div>
      </div>
      <button class="btn-icon" @click="clearHistory" title="清空對話">
        <Trash2 :size="16" />
      </button>
    </div>

    <!-- 常見故障快捷問題 Chips -->
    <div class="quick-questions-box">
      <span class="quick-title">常見疑難排解快捷問：</span>
      <div class="quick-chips-scroll">
        <button 
          v-for="(item, idx) in QUICK_ISSUES" 
          :key="idx" 
          class="quick-chip"
          @click="sendQuery(item.query)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 聊天對話訊息流 -->
    <div ref="chatContainer" class="chat-container">
      <div 
        v-for="(msg, index) in store.aiChatHistory" 
        :key="index" 
        class="message-row"
        :class="{ 'user-row': msg.role === 'user', 'ai-row': msg.role === 'assistant' }"
      >
        <div class="message-bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
          <div class="message-text" v-html="msg.content.replace(/\n/g, '<br/>')"></div>
          <div class="message-time">{{ msg.timestamp }}</div>
        </div>
      </div>

      <!-- 思考中動畫 -->
      <div v-if="isThinking" class="message-row ai-row">
        <div class="message-bubble bubble-ai thinking-bubble">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="thinking-text">小幫手正在分析車況...</span>
        </div>
      </div>

      <!-- 主動結案卡片 (提問 3 則以上顯示) -->
      <div v-if="store.aiChatHistory.filter(m => m.role === 'user').length >= 3 && !isThinking" class="session-actions-box">
        <p class="session-hint">💡 請問您的車況疑難排解是否已獲得解答？</p>
        <div class="session-btns">
          <button class="btn-resolve" @click="finishAndResetSession">
            <CheckCircle :size="15" />
            問題已解決（歸檔重啟）
          </button>
          <button class="btn-new-topic" @click="finishAndResetSession">
            <RotateCcw :size="15" />
            換個新主題發問
          </button>
        </div>
      </div>
    </div>


    <!-- 底部輸入框 -->
    <div class="input-bar-fixed">
      <div class="input-inner">
        <input 
          v-model="userInput" 
          type="text" 
          class="chat-input" 
          placeholder="描述車況問題，例如：冷車難發、騎乘嗡嗡聲..."
          @keyup.enter="sendQuery()" 
        />
        <button 
          class="btn-send" 
          :disabled="!userInput.trim() || isThinking" 
          @click="sendQuery()"
        >
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 150px);
  height: calc(100dvh - 150px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--suzuki-blue), #06b6d4);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px var(--suzuki-blue-glow);
}

.page-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
}

.page-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.quick-questions-box {
  margin-bottom: 10px;
}

.quick-title {
  font-size: 0.72rem;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4px;
}

.quick-chips-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.quick-chips-scroll::-webkit-scrollbar {
  display: none;
}

.quick-chip {
  white-space: nowrap;
  background: rgba(0, 91, 172, 0.12);
  border: 1px solid rgba(0, 91, 172, 0.3);
  color: #38bdf8;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

/* 訊息流 */
.chat-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
  margin-bottom: 90px;
}


.message-row {
  display: flex;
  width: 100%;
}

.user-row {
  justify-content: flex-end;
}

.ai-row {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 88%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
  font-size: 0.88rem;
  line-height: 1.5;
}

.bubble-user {
  background: linear-gradient(135deg, var(--suzuki-blue), #0284c7);
  color: #ffffff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 14px var(--suzuki-blue-glow);
}

.bubble-ai {
  background: #181c26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  margin-top: 4px;
}

.bubble-ai .message-time {
  color: var(--text-muted);
}

/* 思考中 */
.thinking-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--suzuki-blue-light);
  border-radius: 50%;
  animation: bounce 1.2s infinite ease-in-out;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

.session-actions-box {
  margin: 16px 0 8px 0;
  padding: 12px 16px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px dashed rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  text-align: center;
}

.session-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.session-btns {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-resolve {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--color-success);
  color: #fff;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-resolve:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.btn-new-topic {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-new-topic:hover {
  background: var(--bg-card-hover);
  border-color: var(--color-primary);
}


/* 輸入框 (穩穩浮在 BottomBar 上方，支援 iOS safe-area) */
.input-bar-fixed {
  position: fixed;
  bottom: calc(64px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  z-index: 95;
  background: rgba(10, 12, 16, 0.95);
  padding: 8px 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}


.input-inner {
  max-width: 540px;
  margin: 0 auto;
  display: flex;
  gap: 8px;
  background: #141720;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-full);
  padding: 4px 6px 4px 16px;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
}

.chat-input::placeholder {
  color: var(--text-muted);
}

.btn-send {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--suzuki-blue);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-send:not(:disabled):hover {
  background: var(--suzuki-blue-light);
  transform: scale(1.05);
}
</style>
