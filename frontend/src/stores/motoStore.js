import { defineStore } from 'pinia'
import { VEHICLE_DEFAULTS, OFFICIAL_MAINTENANCE_SCHEDULE, PARTS_LIFECYCLE_GUIDE } from '../constants/sui125'
import { api } from '../services/api'

const STORAGE_KEY_PREFIX = 'suzuki_sui_motolog_user_'
const AUTH_STORAGE_KEY = 'suzuki_sui_motolog_auth'

const getStorageKey = (userId) => userId ? `${STORAGE_KEY_PREFIX}${userId}` : 'suzuki_sui_motolog_guest'

export const useMotoStore = defineStore('moto', {
  state: () => {
    let authData = null
    let localData = null

    try {
      // 清理舊版全域暫存垃圾資料 (避免污染新帳號)
      if (localStorage.getItem('suzuki_sui_motolog_v1')) {
        localStorage.removeItem('suzuki_sui_motolog_v1')
      }

      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
      if (savedAuth) {
        authData = JSON.parse(savedAuth)
        if (authData?.user?.id) {
          const userSaved = localStorage.getItem(getStorageKey(authData.user.id))
          if (userSaved) localData = JSON.parse(userSaved)
        }
      }
    } catch (e) {
      console.error('Failed to parse local state', e)
    }

    return {
      isBackendOnline: false,
      isSyncing: false,
      isAuthModalOpen: false,

      // 使用者登入狀態 (SaaS)
      authToken: authData?.token || null,
      currentUser: authData?.user || null,

      // 車輛基本資訊 (預設初始乾淨值)
      vehicle: localData?.vehicle || { ...VEHICLE_DEFAULTS, currentOdo: 0 },

      // 加油紀錄 (純雲端 SaaS 資料，預設為空陣列)
      fuelLogs: localData?.fuelLogs || [],

      // 保養紀錄 (純雲端 SaaS 資料，預設為空陣列)
      maintenanceLogs: localData?.maintenanceLogs || [],

      // 自訂與官方排程規範
      schedules: [...OFFICIAL_MAINTENANCE_SCHEDULE],

      // 改裝日誌 (純雲端 SaaS 資料，預設為空陣列)
      modifications: localData?.modifications || [],

      // AI 問診對話歷史
      aiChatHistory: [
        {
          role: 'assistant',
          content: '哈囉！我是您的 **Suzuki SUI 125 隨車智慧診斷小幫手** 🛵。\n\n不論是車輛異音、起步抖動、煞車軟、冷車難發，或是機油耗材更換週期問題，都可以隨時問我！',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],

      // 設定
      settings: localData?.settings || {
        apiUrl: 'https://suzuki-n9ey.onrender.com',
        enableNotifications: true,
        notifyAdvanceKm: 150,
        currencySymbol: 'NT$'
      }
    }
  },

  getters: {
    currentOdometer: (state) => {
      // 若車主有主動設定 currentOdo，以車主最新設定或所有紀錄的最大值為準
      let maxOdo = Number(state.vehicle?.currentOdo || 0)
      state.fuelLogs.forEach(l => { if (Number(l.odometer) > maxOdo) maxOdo = Number(l.odometer) })
      state.maintenanceLogs.forEach(m => { if (Number(m.odometer) > maxOdo) maxOdo = Number(m.odometer) })
      state.modifications.forEach(mod => { if (Number(mod.odometer) > maxOdo) maxOdo = Number(mod.odometer) })
      return maxOdo
    },


    averageEfficiency: (state) => {
      const validLogs = state.fuelLogs.filter(l => l.efficiency && l.efficiency > 0)
      if (validLogs.length === 0) return 0
      const sum = validLogs.reduce((acc, cur) => acc + cur.efficiency, 0)
      return Number((sum / validLogs.length).toFixed(2))
    },

    totalExpenses: (state) => {
      const fuelTotal = state.fuelLogs.reduce((sum, l) => sum + (Number(l.totalCost) || 0), 0)
      const maintTotal = state.maintenanceLogs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0)
      const modTotal = state.modifications.reduce((sum, l) => sum + (Number(l.cost) || 0), 0)
      return {
        fuel: fuelTotal,
        maintenance: maintTotal,
        modifications: modTotal,
        total: fuelTotal + maintTotal + modTotal
      }
    },

    nextMaintenance: (state) => {
      const current = Number(state.vehicle?.currentOdo || 0)
      const sorted = [...state.schedules].sort((a, b) => a.mileage - b.mileage)
      
      let prevKm = 0
      for (const schedule of sorted) {
        const isDone = state.maintenanceLogs.some(log => Math.abs(log.odometer - schedule.mileage) <= 150)
        if (!isDone && schedule.mileage >= current) {
          const remainingKm = Math.max(0, schedule.mileage - current)
          const isUrgent = remainingKm <= state.settings.notifyAdvanceKm
          const interval = Math.max(100, schedule.mileage - prevKm)
          const progressPercent = Math.min(100, Math.max(0, Math.round(((current - prevKm) / interval) * 100)))
          return {
            ...schedule,
            remainingKm,
            isUrgent,
            targetKm: schedule.mileage,
            prevKm,
            interval,
            progressPercent
          }
        }
        prevKm = schedule.mileage
      }

      const nextKm = Math.ceil((current + 1) / 1000) * 1000
      const prevKmOverflow = Math.max(0, nextKm - 1000)
      const remainingKm = Math.max(0, nextKm - current)
      return {
        mileage: nextKm,
        title: `${nextKm.toLocaleString()} km 定期保養`,
        items: [{ name: '機油更換與安全檢查', required: true }],
        remainingKm,
        isUrgent: remainingKm <= state.settings.notifyAdvanceKm,
        targetKm: nextKm,
        prevKm: prevKmOverflow,
        interval: 1000,
        progressPercent: Math.min(100, Math.max(0, Math.round(((current - prevKmOverflow) / 1000) * 100)))
      }
    },

    partsStatusList: (state) => {
      const current = Number(state.vehicle?.currentOdo || 0)
      const partKeywords = {
        '機油': ['機油', 'oil', '原廠機油'],
        '齒輪油': ['齒輪油', 'gear'],
        '空氣濾清器': ['空濾', '空氣濾清器', '濾清器', '濾芯', 'air filter'],
        '火星塞': ['火星塞', 'spark'],
        '傳動皮帶': ['皮帶', '傳動', 'belt'],
        '前煞車來令片': ['煞車皮', '來令', '煞車片', '制動', 'brake'],
        '煞車油': ['煞車油', 'brake fluid', 'dot 4', 'dot4'],
        '輪胎': ['輪胎', '輪圈', '前後輪', 'tire']
      }

      return PARTS_LIFECYCLE_GUIDE.map(part => {
        const baseKey = Object.keys(partKeywords).find(k => part.name.includes(k)) || part.name.split(' ')[0]
        const keywords = partKeywords[baseKey] || [baseKey]

        const lastMaint = state.maintenanceLogs
          .filter(l => {
            if (!l.items) return false
            return l.items.some(i => {
              const text = (typeof i === 'string' ? i : (i.name || '')).toLowerCase()
              return keywords.some(kw => text.includes(kw.toLowerCase()))
            })
          })
          .sort((a, b) => b.odometer - a.odometer)[0]
        
        const lastReplacedKm = lastMaint ? lastMaint.odometer : 0
        const distanceUsed = Math.max(0, current - lastReplacedKm)
        const usageRatio = Math.min(1.0, distanceUsed / part.intervalKm)
        const remainingKm = Math.max(0, part.intervalKm - distanceUsed)

        return {
          ...part,
          lastReplacedKm,
          distanceUsed,
          usageRatio,
          remainingKm,
          status: usageRatio >= 0.9 ? 'critical' : usageRatio >= 0.7 ? 'warning' : 'good'
        }
      })
    },

    isAuthenticated: (state) => !!state.authToken && !!state.currentUser,
    needsVehicleSetup: (state) => {
      if (!state.authToken || !state.currentUser) return false
      return state.vehicle?.isInitialized === false || !state.vehicle?.isInitialized
    },
  },

  actions: {
    // 重置為乾淨空白狀態
    resetToCleanState() {
      this.vehicle = { ...VEHICLE_DEFAULTS, currentOdo: 0, isInitialized: false }
      this.fuelLogs = []
      this.maintenanceLogs = []
      this.modifications = []
    },

    // 開關登入彈窗
    openAuthModal() {
      this.isAuthModalOpen = true
    },
    closeAuthModal() {
      this.isAuthModalOpen = false
    },

    // 登入
    async login(email, password) {
      try {
        const res = await api.login(email, password)
        this.authToken = res.access_token
        this.currentUser = res.user
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: res.access_token, user: res.user }))
        this.closeAuthModal()
        this.resetToCleanState()
        // 重新從雲端抓取該帳號專屬資料
        await this.initSyncWithBackend(true)
        return { success: true }
      } catch (err) {
        return { success: false, error: err.message }
      }
    },



    // 註冊
    async register(username, email, password) {
      try {
        const res = await api.register(username, email, password)
        this.authToken = res.access_token
        this.currentUser = res.user
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: res.access_token, user: res.user }))
        this.closeAuthModal()
        this.resetToCleanState()
        // 重新從雲端抓取該帳號專屬資料
        await this.initSyncWithBackend(true)
        return { success: true }
      } catch (err) {
        return { success: false, error: err.message }
      }
    },

    // 登出
    logout() {
      const oldUserId = this.currentUser?.id
      this.authToken = null
      this.currentUser = null
      localStorage.removeItem(AUTH_STORAGE_KEY)
      if (oldUserId) {
        localStorage.removeItem(getStorageKey(oldUserId))
      }
      this.resetToCleanState()
      this.initSyncWithBackend(true)
    },

    // 精準獨立同步 1: 車輛與儀表設定 (/api/vehicle)
    async syncVehicle(force = false) {
      if (!this.isAuthenticated) return
      const now = Date.now()
      if (!force && this._lastVehicleSync && now - this._lastVehicleSync < 2000) return
      this._lastVehicleSync = now

      try {
        const v = await api.getVehicle()
        if (v) {
          this.vehicle = { ...this.vehicle, ...v }
          this.isBackendOnline = true
          this.persist()
        }
      } catch (err) {
        console.warn('Sync vehicle failed:', err)
      }
    },

    // 精準獨立同步 1.5: 首頁儀表輕量摘要 (僅拉取前 3 筆最新紀錄，極速載入)
    async syncDashboardSummary(force = false) {
      if (!this.isAuthenticated) return
      const now = Date.now()
      if (!force && this._lastDashSync && now - this._lastDashSync < 3000) return
      this._lastDashSync = now

      try {
        const [v, recentFuels, recentMaints] = await Promise.all([
          api.getVehicle().catch(() => null),
          api.getFuelLogs({ limit: 3 }).catch(() => null),
          api.getMaintenanceLogs({ limit: 3 }).catch(() => null)
        ])

        if (v) this.vehicle = { ...this.vehicle, ...v }
        if (Array.isArray(recentFuels)) this.fuelLogs = recentFuels
        if (Array.isArray(recentMaints)) this.maintenanceLogs = recentMaints
        this.isBackendOnline = true
        this.persist()
      } catch (err) {
        console.warn('Sync dashboard summary failed:', err)
      }
    },

    // 精準獨立同步 2: 加油紀錄 (/api/fuel)
    async syncFuelLogs(force = false) {
      if (!this.isAuthenticated) return
      const now = Date.now()
      if (!force && this._lastFuelSync && now - this._lastFuelSync < 2000) return
      this._lastFuelSync = now

      try {
        const fuels = await api.getFuelLogs()
        if (Array.isArray(fuels)) {
          this.fuelLogs = fuels
          this.isBackendOnline = true
          this.persist()
        }
      } catch (err) {
        console.warn('Sync fuel logs failed:', err)
      }
    },

    // 精準獨立同步 3: 保養紀錄 (/api/maintenance)
    async syncMaintenanceLogs(force = false) {
      if (!this.isAuthenticated) return
      const now = Date.now()
      if (!force && this._lastMaintSync && now - this._lastMaintSync < 2000) return
      this._lastMaintSync = now

      try {
        const maints = await api.getMaintenanceLogs()
        if (Array.isArray(maints)) {
          this.maintenanceLogs = maints
          this.isBackendOnline = true
          this.persist()
        }
      } catch (err) {
        console.warn('Sync maintenance logs failed:', err)
      }
    },

    // 精準獨立同步 4: 改裝紀錄 (/api/modifications)
    async syncModifications(force = false) {
      if (!this.isAuthenticated) return
      const now = Date.now()
      if (!force && this._lastModSync && now - this._lastModSync < 2000) return
      this._lastModSync = now

      try {
        const mods = await api.getModifications()
        if (Array.isArray(mods)) {
          this.modifications = mods
          this.isBackendOnline = true
          this.persist()
        }
      } catch (err) {
        console.warn('Sync modifications failed:', err)
      }
    },

    // 全局一次性初始化同步
    async initSyncWithBackend(force = false) {
      const now = Date.now()
      if (!force && this._lastGlobalSync && now - this._lastGlobalSync < 3000) return
      this._lastGlobalSync = now

      this.isSyncing = true
      try {
        const online = await api.checkHealth()
        this.isBackendOnline = online

        if (online && this.isAuthenticated) {
          const [v, fuels, maints, mods] = await Promise.all([
            api.getVehicle().catch(() => null),
            api.getFuelLogs().catch(() => null),
            api.getMaintenanceLogs().catch(() => null),
            api.getModifications().catch(() => null)
          ])

          if (v) this.vehicle = { ...this.vehicle, ...v }
          if (Array.isArray(fuels)) this.fuelLogs = fuels
          if (Array.isArray(maints)) this.maintenanceLogs = maints
          if (Array.isArray(mods)) this.modifications = mods
          console.log(`✅ 已完成雲端同步 (SaaS 用戶: ${this.currentUser?.username || this.currentUser?.email})`)
        } else if (!this.isAuthenticated) {
          // 未登入訪客模式保持純淨空狀態
          this.resetToCleanState()
        }
      } catch (err) {
        console.warn('後端連線異常:', err)
        this.isBackendOnline = false
      } finally {
        this.isSyncing = false
        this.persist()
      }
    },

    persist() {
      try {
        if (this.isAuthenticated && this.currentUser?.id) {
          const key = getStorageKey(this.currentUser.id)
          localStorage.setItem(key, JSON.stringify({
            vehicle: this.vehicle,
            fuelLogs: this.fuelLogs,
            maintenanceLogs: this.maintenanceLogs,
            modifications: this.modifications,
            settings: this.settings
          }))
        }
      } catch (e) {
        console.error('Save to localStorage failed:', e)
      }
    },

    // 手動同步到 MySQL
    async forceSyncToBackend() {
      if (!this.isBackendOnline) {
        this.isBackendOnline = await api.checkHealth()
      }
      if (!this.isBackendOnline) {
        alert('後端伺服器未連線 (請確認 Docker 或 FastAPI 是否啟動)')
        return false
      }

      this.isSyncing = true
      try {
        await api.updateVehicle(this.vehicle)
        for (const f of this.fuelLogs) {
          await api.createFuelLog(f).catch(() => {})
        }
        for (const m of this.maintenanceLogs) {
          await api.createMaintenanceLog(m).catch(() => {})
        }
        for (const mod of this.modifications) {
          await api.createModification(mod).catch(() => {})
        }
        alert('🎉 資料已成功同步寫入 MySQL 資料庫！')
        return true
      } catch (err) {
        alert('同步失敗: ' + err.message)
        return false
      } finally {
        this.isSyncing = false
      }
    },

    // 更新車輛與設定資訊 (雙寫 LocalStorage + MySQL)
    async updateVehicleSettings(newVehicle, newSettings) {
      if (newVehicle) {
        this.vehicle = { ...this.vehicle, ...newVehicle }
      }
      if (newSettings) {
        this.settings = { ...this.settings, ...newSettings }
      }
      this.persist()

      if (this.isAuthenticated) {
        try {
          await api.updateVehicle(this.vehicle)
          this.isBackendOnline = true
          console.log('✅ 車輛設定已成功更新至 MySQL！')
        } catch (e) {
          console.error('更新車輛至 MySQL 失敗:', e)
        }
      }
    },

    // 更新里程 (直接以使用者輸入為準)
    updateOdometer(newOdo) {
      if (newOdo !== undefined && newOdo !== null) {
        this.vehicle.currentOdo = Number(newOdo)
        this.persist()
        if (this.isAuthenticated) {
          api.updateVehicle(this.vehicle).then(() => {
            this.isBackendOnline = true
          }).catch(() => {})
        }
      }
    },

    // 新增加油紀錄 (雙寫 LocalStorage + MySQL)
    async addFuelLog(log) {
      const odo = Number(log.odometer)
      const liters = Number(log.liters)
      const cost = Number(log.totalCost) || (liters * Number(log.pricePerLiter || 30))

      let tripDistance = 0
      let efficiency = 0

      const prevLogs = this.fuelLogs
        .filter(l => l.odometer < odo)
        .sort((a, b) => b.odometer - a.odometer)
      
      if (prevLogs.length > 0) {
        tripDistance = odo - prevLogs[0].odometer
        if (liters > 0) {
          efficiency = Number((tripDistance / liters).toFixed(2))
        }
      }

      const newLog = {
        id: 'fuel-' + Date.now(),
        date: log.date || new Date().toISOString().split('T')[0],
        odometer: odo,
        liters: liters,
        pricePerLiter: Number(log.pricePerLiter) || (liters > 0 ? Number((cost / liters).toFixed(2)) : 30),
        totalCost: cost,
        fuelType: log.fuelType || '92',
        gasStation: log.gasStation || '中油',
        tripDistance,
        efficiency,
        fullTank: log.fullTank !== false,
        note: log.note || ''
      }

      this.fuelLogs.unshift(newLog)
      this.fuelLogs.sort((a, b) => b.odometer - a.odometer)
      this.updateOdometer(odo)
      this.persist()

      // 同步發送至後端寫入 MySQL 並綁定 MySQL 自動產生的 id
      if (this.isAuthenticated) {
        try {
          const res = await api.createFuelLog(newLog)
          if (res && res.id) {
            newLog.id = res.id
            this.isBackendOnline = true
            this.persist()
          }
        } catch (e) {
          console.error('Sync fuel to MySQL error:', e)
        }
      }

      return newLog
    },

    async deleteFuelLog(id) {
      this.fuelLogs = this.fuelLogs.filter(l => l.id !== id)
      this.persist()
      if (this.isAuthenticated) {
        try {
          await api.deleteFuelLog(id)
          this.isBackendOnline = true
        } catch (e) {
          console.error('Delete fuel from MySQL error:', e)
        }
      }
    },

    // 新增保養紀錄 (雙寫 LocalStorage + MySQL)
    async addMaintenanceLog(log) {
      const odo = Number(log.odometer)
      const newLog = {
        id: 'maint-' + Date.now(),
        date: log.date || new Date().toISOString().split('T')[0],
        odometer: odo,
        title: log.title || `${odo} km 保養`,
        shopName: log.shopName || log.shop || 'SUZUKI 經銷門市',
        cost: Number(log.cost) || 0,
        items: Array.isArray(log.items) ? log.items : [log.items].filter(Boolean),
        note: log.note || '',
        receiptImage: log.receiptImage || ''
      }

      this.maintenanceLogs.unshift(newLog)
      this.maintenanceLogs.sort((a, b) => b.odometer - a.odometer)
      this.updateOdometer(odo)
      this.persist()

      // 同步發送至後端寫入 MySQL 並綁定真實 id
      if (this.isAuthenticated) {
        try {
          const res = await api.createMaintenanceLog(newLog)
          if (res && res.id) {
            newLog.id = res.id
            this.isBackendOnline = true
            this.persist()
          }
        } catch (e) {
          console.error('Sync maint to MySQL error:', e)
        }
      }

      return newLog
    },

    async deleteMaintenanceLog(id) {
      this.maintenanceLogs = this.maintenanceLogs.filter(l => l.id !== id)
      this.persist()
      if (this.isAuthenticated) {
        try {
          await api.deleteMaintenanceLog(id)
          this.isBackendOnline = true
        } catch (e) {
          console.error('Delete maint from MySQL error:', e)
        }
      }
    },

    // 新增改裝紀錄 (雙寫 LocalStorage + MySQL)
    async addModification(mod) {
      const newMod = {
        id: 'mod-' + Date.now(),
        date: mod.date || new Date().toISOString().split('T')[0],
        odometer: Number(mod.odometer) || this.currentOdometer,
        title: mod.title,
        category: mod.category || 'exterior',
        cost: Number(mod.cost) || 0,
        boughtFrom: mod.boughtFrom || '',
        status: mod.status || 'installed',
        rating: Number(mod.rating) || 5,
        note: mod.note || '',
        imageUrl: mod.imageUrl || ''
      }

      this.modifications.unshift(newMod)
      this.persist()

      // 同步發送至後端寫入 MySQL 並綁定真實 id
      if (this.isAuthenticated) {
        try {
          const res = await api.createModification(newMod)
          if (res && res.id) {
            newMod.id = res.id
            this.isBackendOnline = true
            this.persist()
          }
        } catch (e) {
          console.error('Sync mod to MySQL error:', e)
        }
      }

      return newMod
    },

    async deleteModification(id) {
      this.modifications = this.modifications.filter(m => m.id !== id)
      this.persist()
      if (this.isAuthenticated) {
        try {
          await api.deleteModification(id)
          this.isBackendOnline = true
        } catch (e) {
          console.error('Delete mod from MySQL error:', e)
        }
      }
    },


    addAiMessage(role, content) {
      this.aiChatHistory.push({
        role,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
      this.persist()
    },

    clearAiChat() {
      this.aiChatHistory = [
        {
          role: 'assistant',
          content: '對話已重置。有任何 Suzuki SUI 125 的問題請隨時發問！',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
      this.persist()
    },

    exportData() {
      const jsonStr = JSON.stringify(this.$state, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `suzuki_sui125_backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    importData(jsonData) {
      try {
        if (jsonData.vehicle && jsonData.fuelLogs) {
          this.$patch(jsonData)
          this.persist()
          return true
        }
        return false
      } catch (e) {
        console.error('Import failed:', e)
        return false
      }
    }
  }
})
