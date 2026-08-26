<script setup>
import { ref } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { api } from '../services/api'
import { 
  Settings, 
  Bike, 
  Bell, 
  Download, 
  Upload, 
  Server, 
  Save, 
  Info,
  Check,
  Smartphone,
  User,
  LogIn,
  LogOut
} from 'lucide-vue-next'


const store = useMotoStore()

const vehicle = ref({ ...store.vehicle })
const settings = ref({ ...store.settings })
const saveSuccess = ref(false)

// 請求瀏覽器通知權限
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    alert('您的瀏覽器不支援通知功能')
    return
  }
  const perm = await Notification.requestPermission()
  if (perm === 'granted') {
    new Notification('SUZUKI SUI 125 機車管家', {
      body: '保養提醒推播通知已成功開啟！',
      icon: '/icon.svg'
    })
    settings.value.enableNotifications = true
  } else {
    alert('未取得通知權限')
  }
}

// 儲存設定 (同時寫入 LocalStorage 與發送 API 至 MySQL)
const saveSettings = async () => {
  store.vehicle = { ...store.vehicle, ...vehicle.value }
  store.settings = { ...store.settings, ...settings.value }
  store.persist()

  // 直接調用 API 寫入 MySQL
  try {
    await api.updateVehicle(store.vehicle)
    console.log('✅ [API] 車輛設定已成功更新至 MySQL！')
  } catch (err) {
    console.warn('⚠️ 更新車輛至後端失敗 (離線模式):', err)
  }

  saveSuccess.value = true
  setTimeout(() => {
    saveSuccess.value = false
  }, 2000)
}



// 匯出 JSON 備份
const exportBackup = () => {
  store.exportData()
}

// 匯入 JSON 備份
const importBackup = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result)
      const success = store.importData(data)
      if (success) {
        alert('資料匯入成功！')
        vehicle.value = { ...store.vehicle }
        settings.value = { ...store.settings }
      } else {
        alert('檔案格式不相容')
      }
    } catch (err) {
      alert('解析 JSON 檔案失敗')
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="app-container settings-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">車輛與系統設定</h2>
        <p class="page-subtitle">自訂車輛參數、保養通知與備份還原</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="saveSettings">
        <Save :size="16" /> {{ saveSuccess ? '已儲存！' : '儲存設定' }}
      </button>
    </div>

    <!-- 車主帳號與 SaaS 雲端同步 -->
    <div class="card settings-section auth-card">
      <div class="section-heading">
        <User :size="18" class="icon-blue" />
        <h3>車主帳號 (SaaS 雲端多租戶)</h3>
      </div>

      <div v-if="store.isAuthenticated" class="user-profile-box">
        <div class="user-avatar-circle">
          {{ store.currentUser?.username?.charAt(0) || 'U' }}
        </div>
        <div class="user-info-text">
          <div class="user-name-row">
            <span class="user-name">{{ store.currentUser?.username }}</span>
            <span class="badge-cloud">雲端資料庫已綁定</span>
          </div>
          <span class="user-email">{{ store.currentUser?.email }}</span>
        </div>
        <button class="btn btn-outline-danger btn-sm" @click="store.logout">
          <LogOut :size="15" /> 登出帳號
        </button>
      </div>

      <div v-else class="guest-box">
        <div class="guest-text">
          <p class="guest-title">目前為訪客離線模式</p>
          <p class="guest-desc">登入或免費註冊後，您的 SUI 125 數據將 24 小時安全獨立存儲於雲端，換手機或跨電腦使用皆可無縫同步！</p>
        </div>
        <button class="btn btn-primary btn-sm" @click="store.openAuthModal">
          <LogIn :size="16" /> 立即登入 / 註冊
        </button>
      </div>
    </div>

    <!-- 車輛基本資料 -->
    <div class="card settings-section">
      <div class="section-heading">
        <Bike :size="18" class="icon-blue" />
        <h3>車輛基本資訊</h3>
      </div>


      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">車款名稱</label>
          <input v-model="vehicle.name" type="text" class="form-input" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">車牌號碼</label>
          <input v-model="vehicle.licensePlate" type="text" class="form-input" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">油箱容量 (L)</label>
          <input v-model="vehicle.tankCapacity" type="number" step="0.1" class="form-input" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">原廠推薦油品</label>
          <select v-model="vehicle.fuelType" class="form-select">
            <option value="92">92 無鉛汽油</option>
            <option value="95">95 無鉛汽油</option>
            <option value="98">98 無鉛汽油</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 保養提醒與通知設定 -->
    <div class="card settings-section">
      <div class="section-heading">
        <Bell :size="18" class="icon-red" />
        <h3>保養提醒設定</h3>
      </div>

      <div class="form-group">
        <label class="form-label">保養提前預警里程 (KM)</label>
        <input 
          v-model="settings.notifyAdvanceKm" 
          type="number" 
          class="form-input" 
          placeholder="例如 150" 
        />
        <span class="field-hint">當總里程接近保養里程剩下此距離時，首頁儀表將顯示紅色警戒與提醒。</span>
      </div>

      <div class="notification-perm-row">
        <div>
          <div class="perm-title">手機 / 桌面推播通知</div>
          <div class="perm-desc">允許在到達保養週期時彈出提醒訊息</div>
        </div>
        <button class="btn btn-secondary btn-sm" @click="requestNotificationPermission">
          開啟通知授權
        </button>
      </div>
    </div>

    <!-- 資料備份與還原 -->
    <div class="card settings-section">
      <div class="section-heading">
        <Smartphone :size="18" class="icon-amber" />
        <h3>資料備份與還原 (0元離線存儲)</h3>
      </div>
      <p class="section-desc">
        所有加油、保養、改裝日誌均自動儲存於您的手機本機瀏覽器 (LocalStorage)。您可隨時匯出 JSON 備份檔保存。
      </p>

      <div class="backup-actions">
        <button class="btn btn-secondary flex-1" @click="exportBackup">
          <Download :size="16" /> 匯出完整 JSON 備份
        </button>

        <label class="btn btn-secondary flex-1 upload-json-btn">
          <Upload :size="16" /> 匯入備份檔案
          <input type="file" accept=".json" class="file-hidden" @change="importBackup" />
        </label>
      </div>
    </div>

    <!-- 雲端 API / 後端連線設定 -->
    <div class="card settings-section">
      <div class="section-heading">
        <Server :size="18" class="icon-cyan" />
        <h3>雲端 / 後端 API 同步 (FastAPI + Docker)</h3>
      </div>

      <div class="form-group">
        <label class="form-label">後端伺服器 API 網址</label>
        <input 
          v-model="settings.apiUrl" 
          type="text" 
          class="form-input" 
          placeholder="http://localhost:8000 或 您的免費雲端網址" 
        />
        <span class="field-hint">若本機有啟動 Python FastAPI 或 Docker Compose，可填入後端端點進行資料庫雙向同步。</span>
      </div>

      <div class="sync-db-action">
        <button 
          class="btn btn-primary btn-sm" 
          :disabled="store.isSyncing"
          @click="store.forceSyncToBackend()"
        >
          <Server :size="16" /> {{ store.isSyncing ? '同步中...' : '🔄 立即將資料同步寫入 MySQL 資料庫' }}
        </button>
      </div>
    </div>


    <!-- 關於與 PWA 說明 -->
    <div class="card info-card">
      <div class="info-title">
        <Info :size="16" class="icon-blue" />
        <span>如何將此 PWA 安裝至手機主畫面？</span>
      </div>
      <ol class="pwa-steps">
        <li><strong>iPhone / iOS (Safari)：</strong> 點擊底部的「分享」按鈕 ➔ 選擇「加入主畫面」。</li>
        <li><strong>Android (Chrome)：</strong> 點擊右上角「⋮」選單 ➔ 選擇「安裝應用程式」或「加到主畫面」。</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}

.page-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.section-heading h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.icon-blue { color: var(--suzuki-blue-light); }
.icon-red { color: var(--suzuki-red); }
.icon-amber { color: var(--accent-amber); }
.icon-cyan { color: var(--accent-cyan); }

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.field-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  display: block;
  margin-top: 4px;
}

.notification-perm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
}

.perm-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2e8f0;
}

.perm-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.backup-actions {
  display: flex;
  gap: 10px;
}

.upload-json-btn {
  cursor: pointer;
}

.file-hidden {
  display: none;
}

.info-card {
  background: rgba(0, 91, 172, 0.08);
  border: 1px solid rgba(0, 91, 172, 0.3);
}

.info-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.88rem;
  color: #38bdf8;
  margin-bottom: 8px;
}

.pwa-steps {
  font-size: 0.8rem;
  color: #cbd5e1;
  padding-left: 18px;
  line-height: 1.6;
}

/* SaaS 車主卡片樣式 */
.auth-card {
  border: 1px solid rgba(0, 210, 255, 0.25);
  background: linear-gradient(145deg, rgba(0, 210, 255, 0.04), rgba(20, 23, 31, 0.6));
}

.user-profile-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
}

.user-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d2ff, #0077ff);
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.3);
}

.user-info-text {
  flex: 1;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.user-name {
  font-weight: 700;
  color: #fff;
  font-size: 0.98rem;
}

.badge-cloud {
  font-size: 0.68rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-weight: 600;
}

.user-email {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.btn-outline-danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-outline-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

.guest-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.guest-title {
  font-weight: 700;
  color: #fff;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.guest-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}
</style>

