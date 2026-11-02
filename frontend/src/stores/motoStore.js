import { defineStore } from 'pinia'
import { VEHICLE_DEFAULTS, OFFICIAL_MAINTENANCE_SCHEDULE, PARTS_LIFECYCLE_GUIDE } from '../constants/sui125'
import { api } from '../services/api'

const STORAGE_KEY_PREFIX = 'suzuki_sui_motolog_user_'
const AUTH_STORAGE_KEY = 'suzuki_sui_motolog_auth'

const getStorageKey = (userId) => userId ? `${STORAGE_KEY_PREFIX}${userId}` : 'suzuki_sui_motolog_guest'

const OFFICIAL_MILEAGES = OFFICIAL_MAINTENANCE_SCHEDULE.map(s => Number(s.mileage))

export const getExplicitScheduleMileageFromTitle = (title) => {
  if (!title) return null
  const cleanTitle = String(title).replace(/,/g, '')
  for (const km of OFFICIAL_MILEAGES) {
    const regex = new RegExp(`(^|\\D)${km}\\s*km`, 'i')
    if (regex.test(cleanTitle)) return km
  }
  return null
}

// 智慧比對特定官方排程是否已有對應的保養紀錄
export const matchLogToSchedule = (schedule, maintenanceLogs = []) => {
  if (!schedule || !Array.isArray(maintenanceLogs) || maintenanceLogs.length === 0) return null
  const targetKm = Number(schedule.mileage)

  // 1. 優先比對紀錄是否有明確指定 scheduleMileage 或標題包含該官方排程里程
  const explicitMatch = maintenanceLogs.find(log => {
    if (log.scheduleMileage && Number(log.scheduleMileage) === targetKm) return true
    return getExplicitScheduleMileageFromTitle(log.title) === targetKm
  })
  if (explicitMatch) return explicitMatch

  // 2. 里程區間容差比對 (500km 首保容許 50~1250km；2000km 以上定保容許 ±600km)
  const minKm = targetKm === 500 ? 50 : targetKm - 600
  const maxKm = targetKm === 500 ? 1250 : targetKm + 600

  const odoMatches = maintenanceLogs
    .filter(log => {
      if (log.scheduleMileage && Number(log.scheduleMileage) !== targetKm) return false
      const explicitKm = getExplicitScheduleMileageFromTitle(log.title)
      if (explicitKm && explicitKm !== targetKm) return false
      const odo = Number(log.odometer)
      return odo >= minKm && odo <= maxKm
    })
    .sort((a, b) => Math.abs(Number(a.odometer) - targetKm) - Math.abs(Number(b.odometer) - targetKm))

  return odoMatches[0] || null
}

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
        operatingTotal: fuelTotal + maintTotal,
        total: fuelTotal + maintTotal + modTotal
      }
    },

    // 養車總成本分析 (TCO & 每公里成本 & 近 6 個月趨勢)
    tcoAnalysis(state) {
      const exp = this.totalExpenses
      const odo = this.currentOdometer

      const costPerKmOperating = odo > 0 ? Number((exp.operatingTotal / odo).toFixed(2)) : 0
      const costPerKmTotal = odo > 0 ? Number((exp.total / odo).toFixed(2)) : 0
      const fuelCostPerKm = odo > 0 ? Number((exp.fuel / odo).toFixed(2)) : 0
      const maintCostPerKm = odo > 0 ? Number((exp.maintenance / odo).toFixed(2)) : 0
      const modCostPerKm = odo > 0 ? Number((exp.modifications / odo).toFixed(2)) : 0

      const safePct = (val, base) => (base > 0 ? Math.round((val / base) * 100) : 0)

      // 彙整近 6 個月支出趨勢 (相容跨年份系統時鐘誤差與多種日期格式)
      const monthMap = new Map()
      const ensureMonth = (ym) => {
        if (!monthMap.has(ym)) {
          monthMap.set(ym, { ym, fuel: 0, maintenance: 0, modifications: 0, total: 0 })
        }
        return monthMap.get(ym)
      }

      const now = new Date()
      const sysYear = now.getFullYear()
      const sysMonth = now.getMonth() + 1

      const extractYm = (dateStr) => {
        if (!dateStr) return null
        const s = String(dateStr).trim()
        // 1. 標準 YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
        let m = s.match(/^(\d{4})[-/.年](\d{1,2})/)
        if (m) {
          const yr = Number(m[1])
          const mo = Number(m[2])
          if (mo >= 1 && mo <= 12) return `${yr}-${String(mo).padStart(2, '0')}`
        }
        // 2. 民國年 YYY/MM/DD (如 114/10/26)
        m = s.match(/^(\d{2,3})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
        if (m && Number(m[1]) >= 100 && Number(m[1]) <= 150) {
          const yr = Number(m[1]) + 1911
          const mo = Number(m[2])
          if (mo >= 1 && mo <= 12) return `${yr}-${String(mo).padStart(2, '0')}`
        }
        // 3. MM/DD/YYYY 或 MM-DD-YYYY
        m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
        if (m) {
          const yr = Number(m[3])
          const first = Number(m[1])
          const second = Number(m[2])
          const mo = first <= 12 ? first : second
          if (mo >= 1 && mo <= 12) return `${yr}-${String(mo).padStart(2, '0')}`
        }
        // 4. 簡短月日 MM/DD 或 MM-DD (如 10/26)
        m = s.match(/^(\d{1,2})[-/.月](\d{1,2})/)
        if (m) {
          const mo = Number(m[1])
          if (mo >= 1 && mo <= 12) return `${sysYear}-${String(mo).padStart(2, '0')}`
        }
        // 5. Fallback Date 解析
        const parsed = new Date(s)
        if (!isNaN(parsed.getTime())) {
          return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
        }
        return null
      }

      state.fuelLogs.forEach(l => {
        const ym = extractYm(l.date)
        if (ym) {
          const item = ensureMonth(ym)
          const c = Number(l.totalCost) || Number(l.cost) || Math.round((Number(l.liters) || 0) * (Number(l.pricePerLiter) || 30.2))
          item.fuel += c
          item.total += c
        }
      })

      state.maintenanceLogs.forEach(l => {
        const ym = extractYm(l.date)
        if (ym) {
          const item = ensureMonth(ym)
          const c = Number(l.cost) || 0
          item.maintenance += c
          item.total += c
        }
      })

      state.modifications.forEach(l => {
        const ym = extractYm(l.date)
        if (ym) {
          const item = ensureMonth(ym)
          const c = Number(l.cost) || 0
          item.modifications += c
          item.total += c
        }
      })

      // 決定基準月份：預設以當前系統年月為基準，若紀錄中有更新的合理月份則採用
      let anchorYear = sysYear
      let anchorMonth = sysMonth

      const allYms = Array.from(monthMap.keys()).sort()
      if (allYms.length > 0) {
        const latestYm = allYms[allYms.length - 1]
        const [y, m] = latestYm.split('-').map(Number)
        // 避免誤填太遠未來年份導致近期月份消失
        if (y <= sysYear + 1 && y * 12 + m > anchorYear * 12 + anchorMonth) {
          anchorYear = y
          anchorMonth = m
        }
      }

      const monthlySeries = []
      for (let i = 5; i >= 0; i--) {
        let m = anchorMonth - i
        let y = anchorYear
        while (m <= 0) {
          m += 12
          y -= 1
        }
        const mmStr = String(m).padStart(2, '0')
        const targetYm = `${y}-${mmStr}`

        // 合併該月份數據（同時相容因系統年份 2025/2026 切換差 1 年的同月份紀錄，確保 10 月、9 月紀錄不因跨年時鐘差而遺漏）
        let fuelSum = 0
        let maintSum = 0
        let modSum = 0

        for (const [keyYm, val] of monthMap.entries()) {
          const [ky, km] = keyYm.split('-').map(Number)
          if (km === m && Math.abs(ky - y) <= 1) {
            fuelSum += val.fuel
            maintSum += val.maintenance
            modSum += val.modifications
          }
        }

        monthlySeries.push({
          ym: targetYm,
          fuel: fuelSum,
          maintenance: maintSum,
          modifications: modSum,
          total: fuelSum + maintSum + modSum,
          label: `${m}月`
        })
      }

      const activeMonthsCount = Math.max(1, monthMap.size)
      const avgMonthlyTotal = Math.round(exp.total / activeMonthsCount)
      const avgMonthlyOperating = Math.round(exp.operatingTotal / activeMonthsCount)

      return {
        costPerKmOperating,
        costPerKmTotal,
        fuelCostPerKm,
        maintCostPerKm,
        modCostPerKm,
        sharesTotal: {
          fuel: safePct(exp.fuel, exp.total),
          maintenance: safePct(exp.maintenance, exp.total),
          modifications: safePct(exp.modifications, exp.total)
        },
        sharesOperating: {
          fuel: safePct(exp.fuel, exp.operatingTotal),
          maintenance: safePct(exp.maintenance, exp.operatingTotal)
        },
        monthlySeries,
        avgMonthlyTotal,
        avgMonthlyOperating
      }
    },

    nextMaintenance(state) {
      const current = this.currentOdometer
      const sorted = [...state.schedules].sort((a, b) => a.mileage - b.mileage)
      
      let prevKm = 0
      for (const schedule of sorted) {
        const matchedLog = matchLogToSchedule(schedule, state.maintenanceLogs)
        const isDone = !!matchedLog
        if (!isDone && schedule.mileage >= current - 300) {
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

      const nextKm = Math.ceil((current + 1) / 2000) * 2000
      const prevKmOverflow = Math.max(0, nextKm - 2000)
      const remainingKm = Math.max(0, nextKm - current)
      return {
        mileage: nextKm,
        title: `${nextKm.toLocaleString()} km 定期保養`,
        items: [{ name: '原廠機油更換與日常安全檢查', required: true }],
        remainingKm,
        isUrgent: remainingKm <= state.settings.notifyAdvanceKm,
        targetKm: nextKm,
        prevKm: prevKmOverflow,
        interval: 2000,
        progressPercent: Math.min(100, Math.max(0, Math.round(((current - prevKmOverflow) / 2000) * 100)))
      }
    },

    partsStatusList(state) {
      const current = this.currentOdometer
      const partKeywords = {
        '機油': ['機油', 'oil', '原廠機油'],
        '齒輪油': ['齒輪油', 'gear'],
        '空氣濾清器': ['空濾', '空氣濾清器', '濾清器', '濾芯', 'air filter'],
        '火星塞': ['火星塞', 'spark', 'cpr7ea'],
        '冷卻風扇濾棉': ['風扇濾棉', '導風蓋', '冷導風', '冷卻濾棉', '海綿', 'filter'],
        '傳動皮帶': ['皮帶', '傳動', 'belt'],
        '前煞車來令片': ['前煞車', '卡鉗', '來令', '煞車片', '制動', '碟煞'],
        '後煞車鼓皮': ['後煞車', '鼓煞', '煞車皮', '蹄片'],
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

    // 查詢某個官方排程里程對應的已完成保養紀錄
    getScheduleCompletedLog(mileage) {
      const schedule = this.schedules.find(s => Number(s.mileage) === Number(mileage)) || { mileage: Number(mileage) }
      return matchLogToSchedule(schedule, this.maintenanceLogs)
    },

    // 安全合併雲端加油紀錄與本地尚未同步完成的紀錄
    _mergeRemoteFuelLogs(remoteLogs) {
      if (!Array.isArray(remoteLogs)) return
      const pendingLocal = this.fuelLogs.filter(l => String(l.id).startsWith('fuel-'))
      const merged = [...remoteLogs]
      for (const local of pendingLocal) {
        const alreadyExists = merged.some(
          r => Number(r.odometer) === Number(local.odometer) && r.date === local.date && Number(r.liters) === Number(local.liters)
        )
        if (!alreadyExists) {
          merged.push(local)
        }
      }
      merged.sort((a, b) => Number(b.odometer) - Number(a.odometer))
      this.fuelLogs = merged
    },

    // 安全合併雲端保養紀錄與本地尚未同步完成的紀錄，避免切換頁籤時被覆蓋消失
    _mergeRemoteMaintenanceLogs(remoteLogs) {
      if (!Array.isArray(remoteLogs)) return
      const pendingLocal = this.maintenanceLogs.filter(l => String(l.id).startsWith('maint-'))
      const merged = [...remoteLogs]
      for (const local of pendingLocal) {
        const alreadyExists = merged.some(
          r => Number(r.odometer) === Number(local.odometer) && r.date === local.date && r.title === local.title
        )
        if (!alreadyExists) {
          merged.push(local)
        }
      }
      merged.sort((a, b) => Number(b.odometer) - Number(a.odometer))
      this.maintenanceLogs = merged
    },

    // 安全合併雲端改裝紀錄與本地尚未同步完成的紀錄
    _mergeRemoteModifications(remoteLogs) {
      if (!Array.isArray(remoteLogs)) return
      const pendingLocal = this.modifications.filter(m => String(m.id).startsWith('mod-'))
      const merged = [...remoteLogs]
      for (const local of pendingLocal) {
        const alreadyExists = merged.some(
          r => r.title === local.title && r.date === local.date && Number(r.cost) === Number(local.cost)
        )
        if (!alreadyExists) {
          merged.push(local)
        }
      }
      this.modifications = merged
    },

    // 精準獨立同步 1.5: 首頁儀表摘要
    async syncDashboardSummary(force = false) {
      if (!this.isAuthenticated) return
      const now = Date.now()
      if (!force && this._lastDashSync && now - this._lastDashSync < 3000) return
      this._lastDashSync = now

      await Promise.all([
        this._lastFuelWritePromise?.catch(() => {}),
        this._lastMaintWritePromise?.catch(() => {}),
        this._lastModWritePromise?.catch(() => {})
      ])

      try {
        const [v, recentFuels, recentMaints, recentMods] = await Promise.all([
          api.getVehicle().catch(() => null),
          api.getFuelLogs().catch(() => null),
          api.getMaintenanceLogs().catch(() => null),
          api.getModifications().catch(() => null)
        ])

        if (v) this.vehicle = { ...this.vehicle, ...v }
        if (Array.isArray(recentFuels)) this._mergeRemoteFuelLogs(recentFuels)
        if (Array.isArray(recentMaints)) this._mergeRemoteMaintenanceLogs(recentMaints)
        if (Array.isArray(recentMods)) this._mergeRemoteModifications(recentMods)
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

      if (this._lastFuelWritePromise) {
        await this._lastFuelWritePromise.catch(() => {})
      }

      try {
        const fuels = await api.getFuelLogs()
        if (Array.isArray(fuels)) {
          this._mergeRemoteFuelLogs(fuels)
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

      if (this._lastMaintWritePromise) {
        await this._lastMaintWritePromise.catch(() => {})
      }

      try {
        const maints = await api.getMaintenanceLogs()
        if (Array.isArray(maints)) {
          this._mergeRemoteMaintenanceLogs(maints)
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

      if (this._lastModWritePromise) {
        await this._lastModWritePromise.catch(() => {})
      }

      try {
        const mods = await api.getModifications()
        if (Array.isArray(mods)) {
          this._mergeRemoteModifications(mods)
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
          if (Array.isArray(fuels)) this._mergeRemoteFuelLogs(fuels)
          if (Array.isArray(maints)) this._mergeRemoteMaintenanceLogs(maints)
          if (Array.isArray(mods)) this._mergeRemoteModifications(mods)
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
      if (!this.isAuthenticated || !this.currentUser?.id) return
      const key = getStorageKey(this.currentUser.id)
      try {
        localStorage.setItem(key, JSON.stringify({
          vehicle: this.vehicle,
          fuelLogs: this.fuelLogs,
          maintenanceLogs: this.maintenanceLogs,
          modifications: this.modifications,
          settings: this.settings
        }))
      } catch (e) {
        // 當超過 10 筆以上含大圖資料觸發瀏覽器 5MB LocalStorage 上限時，自動為本地快取瘦身（雲端仍保留完整原圖），確保結構化紀錄 100% 寫入不中斷
        try {
          const slimMaints = this.maintenanceLogs.map((m, i) => i < 5 ? m : { ...m, receiptImage: '' })
          const slimMods = this.modifications.map((m, i) => i < 5 ? m : { ...m, imageUrl: '' })
          localStorage.setItem(key, JSON.stringify({
            vehicle: this.vehicle,
            fuelLogs: this.fuelLogs,
            maintenanceLogs: slimMaints,
            modifications: slimMods,
            settings: this.settings
          }))
        } catch (innerErr) {
          console.error('Save to localStorage failed:', innerErr)
        }
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

    // 重新計算所有加油紀錄的行駛區間與油耗
    _recalculateFuelLogs() {
      const asc = [...this.fuelLogs].sort((a, b) => Number(a.odometer) - Number(b.odometer))
      for (let i = 0; i < asc.length; i++) {
        if (i === 0) {
          asc[i].tripDistance = 0
          asc[i].efficiency = 0
        } else {
          const dist = Math.max(0, Number(asc[i].odometer) - Number(asc[i - 1].odometer))
          const liters = Number(asc[i].liters) || 0
          asc[i].tripDistance = dist
          asc[i].efficiency = dist > 0 && liters > 0 ? Number((dist / liters).toFixed(2)) : 0
        }
      }
      this.fuelLogs = asc.sort((a, b) => Number(b.odometer) - Number(a.odometer))
    },

    // 新增加油紀錄 (雙寫 LocalStorage + MySQL)
    async addFuelLog(log) {
      const odo = Number(log.odometer)
      const liters = Number(log.liters)
      const cost = Number(log.totalCost) || Math.round(liters * Number(log.pricePerLiter || 30.2))

      let tripDistance = 0
      let efficiency = 0

      const prevLogs = this.fuelLogs
        .filter(l => Number(l.odometer) < odo)
        .sort((a, b) => Number(b.odometer) - Number(a.odometer))
      
      if (prevLogs.length > 0) {
        tripDistance = odo - Number(prevLogs[0].odometer)
        if (liters > 0) {
          efficiency = Number((tripDistance / liters).toFixed(2))
        }
      }

      const newLog = {
        id: 'fuel-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        date: log.date || new Date().toISOString().split('T')[0],
        odometer: odo,
        liters: liters,
        pricePerLiter: Number(log.pricePerLiter) || (liters > 0 ? Number((cost / liters).toFixed(2)) : 30.2),
        totalCost: cost,
        fuelType: log.fuelType || '92',
        gasStation: log.gasStation || '台灣中油',
        tripDistance,
        efficiency,
        fullTank: log.fullTank !== false,
        note: log.note || ''
      }

      this.fuelLogs.unshift(newLog)
      this._recalculateFuelLogs()
      if (odo > Number(this.vehicle.currentOdo || 0)) {
        this.updateOdometer(odo)
      } else {
        this.persist()
      }

      // 同步發送至後端寫入 MySQL 並綁定 MySQL 自動產生的 id
      if (this.isAuthenticated) {
        const writeTask = (async () => {
          try {
            const target = this.fuelLogs.find(l => l.id === newLog.id) || newLog
            const res = await api.createFuelLog(target)
            if (res && res.id) {
              const idx = this.fuelLogs.findIndex(l => l.id === newLog.id)
              if (idx !== -1) this.fuelLogs[idx].id = res.id
              newLog.id = res.id
              this.isBackendOnline = true
              this.persist()
            }
          } catch (e) {
            console.error('Sync fuel to MySQL error:', e)
          }
        })()
        this._lastFuelWritePromise = writeTask
        await writeTask
      }

      return newLog
    },

    // 編輯更新加油紀錄 (支援修改加油日期、里程、油量、金額、加油站等)
    async updateFuelLog(id, updatedFields) {
      const idx = this.fuelLogs.findIndex(l => String(l.id) === String(id))
      if (idx === -1) return null

      const existing = this.fuelLogs[idx]
      const odo = Number(updatedFields.odometer ?? existing.odometer)
      const liters = Number(updatedFields.liters ?? existing.liters)
      const pricePerLiter = Number(updatedFields.pricePerLiter ?? existing.pricePerLiter) || 30.2
      const totalCost = updatedFields.totalCost !== undefined
        ? Number(updatedFields.totalCost)
        : Math.round(liters * pricePerLiter)

      const updatedLog = {
        ...existing,
        date: updatedFields.date || existing.date,
        odometer: odo,
        liters,
        pricePerLiter,
        totalCost,
        fuelType: updatedFields.fuelType || existing.fuelType || '92',
        gasStation: updatedFields.gasStation || existing.gasStation || '台灣中油',
        fullTank: updatedFields.fullTank !== undefined ? updatedFields.fullTank : existing.fullTank,
        note: updatedFields.note !== undefined ? updatedFields.note : existing.note
      }

      this.fuelLogs.splice(idx, 1, updatedLog)
      this._recalculateFuelLogs()
      if (odo > Number(this.vehicle.currentOdo || 0)) {
        this.updateOdometer(odo)
      } else {
        this.persist()
      }

      const recalculatedTarget = this.fuelLogs.find(l => String(l.id) === String(id)) || updatedLog

      if (this.isAuthenticated && !String(id).startsWith('fuel-')) {
        const writeTask = (async () => {
          try {
            const res = await api.updateFuelLog(id, recalculatedTarget)
            if (res && res.id) {
              const currentIdx = this.fuelLogs.findIndex(l => String(l.id) === String(id))
              if (currentIdx !== -1) {
                this.fuelLogs[currentIdx] = {
                  ...this.fuelLogs[currentIdx],
                  id: res.id
                }
              }
              this.isBackendOnline = true
              this.persist()
            }
          } catch (e) {
            console.error('Update fuel to MySQL error:', e)
          }
        })()
        this._lastFuelWritePromise = writeTask
        await writeTask
      }

      return recalculatedTarget
    },

    async deleteFuelLog(id) {
      this.fuelLogs = this.fuelLogs.filter(l => String(l.id) !== String(id))
      this._recalculateFuelLogs()
      this.persist()
      if (this.isAuthenticated && !String(id).startsWith('fuel-')) {
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
        scheduleMileage: log.scheduleMileage ? Number(log.scheduleMileage) : getExplicitScheduleMileageFromTitle(log.title),
        shopName: log.shopName || log.shop || 'SUZUKI 經銷門市',
        cost: Number(log.cost) || 0,
        items: Array.isArray(log.items) ? log.items : [log.items].filter(Boolean),
        note: log.note || '',
        receiptImage: log.receiptImage || ''
      }

      this.maintenanceLogs.unshift(newLog)
      this.maintenanceLogs.sort((a, b) => b.odometer - a.odometer)
      if (odo > Number(this.vehicle.currentOdo || 0)) {
        this.updateOdometer(odo)
      } else {
        this.persist()
      }

      // 同步發送至後端寫入 MySQL 並綁定真實 id
      if (this.isAuthenticated) {
        const writeTask = (async () => {
          try {
            const res = await api.createMaintenanceLog(newLog)
            if (res && res.id) {
              const target = this.maintenanceLogs.find(l => l.id === newLog.id)
              if (target) target.id = res.id
              newLog.id = res.id
              this.isBackendOnline = true
              this.persist()
            }
          } catch (e) {
            console.error('Sync maint to MySQL error:', e)
          }
        })()
        this._lastMaintWritePromise = writeTask
        await writeTask
      }

      return newLog
    },

    // 編輯更新保養紀錄 (支援修改保養日期、里程、標題、花費、項目等)
    async updateMaintenanceLog(id, updatedFields) {
      const idx = this.maintenanceLogs.findIndex(l => String(l.id) === String(id))
      if (idx === -1) return null

      const existing = this.maintenanceLogs[idx]
      const odo = Number(updatedFields.odometer ?? existing.odometer)
      const nextTitle = updatedFields.title || existing.title
      const updatedLog = {
        ...existing,
        date: updatedFields.date || existing.date,
        odometer: odo,
        title: nextTitle,
        scheduleMileage: updatedFields.scheduleMileage !== undefined
          ? (updatedFields.scheduleMileage ? Number(updatedFields.scheduleMileage) : null)
          : (getExplicitScheduleMileageFromTitle(nextTitle) || existing.scheduleMileage || null),
        shopName: updatedFields.shopName ?? updatedFields.shop ?? existing.shopName,
        cost: updatedFields.cost !== undefined ? (Number(updatedFields.cost) || 0) : existing.cost,
        items: Array.isArray(updatedFields.items)
          ? [...updatedFields.items]
          : (updatedFields.items ? [updatedFields.items] : existing.items),
        note: updatedFields.note !== undefined ? updatedFields.note : existing.note,
        receiptImage: updatedFields.receiptImage !== undefined ? updatedFields.receiptImage : existing.receiptImage
      }

      this.maintenanceLogs.splice(idx, 1, updatedLog)
      this.maintenanceLogs.sort((a, b) => Number(b.odometer) - Number(a.odometer))
      if (odo > Number(this.vehicle.currentOdo || 0)) {
        this.updateOdometer(odo)
      } else {
        this.persist()
      }

      if (this.isAuthenticated && !String(id).startsWith('maint-')) {
        const writeTask = (async () => {
          try {
            const res = await api.updateMaintenanceLog(id, updatedLog)
            if (res && res.id) {
              const currentIdx = this.maintenanceLogs.findIndex(l => String(l.id) === String(id))
              if (currentIdx !== -1) {
                this.maintenanceLogs[currentIdx] = {
                  ...updatedLog,
                  id: res.id
                }
              }
              this.isBackendOnline = true
              this.persist()
            }
          } catch (e) {
            console.error('Update maint to MySQL error:', e)
          }
        })()
        this._lastMaintWritePromise = writeTask
        await writeTask
      }

      return updatedLog
    },

    async deleteMaintenanceLog(id) {
      this.maintenanceLogs = this.maintenanceLogs.filter(l => String(l.id) !== String(id))
      this.persist()
      if (this.isAuthenticated && !String(id).startsWith('maint-')) {
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
      const odo = Number(mod.odometer) || this.currentOdometer
      const newMod = {
        id: 'mod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        date: mod.date || new Date().toISOString().split('T')[0],
        odometer: odo,
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
      if (odo > Number(this.vehicle.currentOdo || 0)) {
        this.updateOdometer(odo)
      } else {
        this.persist()
      }

      // 同步發送至後端寫入 MySQL 並綁定真實 id
      if (this.isAuthenticated) {
        const writeTask = (async () => {
          try {
            const res = await api.createModification(newMod)
            if (res && res.id) {
              const target = this.modifications.find(m => m.id === newMod.id)
              if (target) target.id = res.id
              newMod.id = res.id
              this.isBackendOnline = true
              this.persist()
            }
          } catch (e) {
            console.error('Sync mod to MySQL error:', e)
          }
        })()
        this._lastModWritePromise = writeTask
        await writeTask
      }

      return newMod
    },

    // 編輯更新改裝紀錄 (支援修改名稱、分類、金額、日期、里程、星等、心得與照片)
    async updateModification(id, updatedFields) {
      const idx = this.modifications.findIndex(m => String(m.id) === String(id))
      if (idx === -1) return null

      const existing = this.modifications[idx]
      const odo = Number(updatedFields.odometer ?? existing.odometer) || 0
      const updatedMod = {
        ...existing,
        date: updatedFields.date || existing.date,
        odometer: odo,
        title: updatedFields.title || existing.title,
        category: updatedFields.category || existing.category || 'exterior',
        cost: updatedFields.cost !== undefined ? (Number(updatedFields.cost) || 0) : existing.cost,
        boughtFrom: updatedFields.boughtFrom !== undefined ? updatedFields.boughtFrom : existing.boughtFrom,
        status: updatedFields.status || existing.status || 'installed',
        rating: Number(updatedFields.rating ?? existing.rating) || 5,
        note: updatedFields.note !== undefined ? updatedFields.note : existing.note,
        imageUrl: updatedFields.imageUrl !== undefined ? updatedFields.imageUrl : existing.imageUrl
      }

      this.modifications.splice(idx, 1, updatedMod)
      if (odo > Number(this.vehicle.currentOdo || 0)) {
        this.updateOdometer(odo)
      } else {
        this.persist()
      }

      if (this.isAuthenticated && !String(id).startsWith('mod-')) {
        const writeTask = (async () => {
          try {
            const res = await api.updateModification(id, updatedMod)
            if (res && res.id) {
              const currentIdx = this.modifications.findIndex(m => String(m.id) === String(id))
              if (currentIdx !== -1) {
                this.modifications[currentIdx] = {
                  ...updatedMod,
                  id: res.id
                }
              }
              this.isBackendOnline = true
              this.persist()
            }
          } catch (e) {
            console.error('Update mod to MySQL error:', e)
          }
        })()
        this._lastModWritePromise = writeTask
        await writeTask
      }

      return updatedMod
    },

    async deleteModification(id) {
      this.modifications = this.modifications.filter(m => String(m.id) !== String(id))
      this.persist()
      if (this.isAuthenticated && !String(id).startsWith('mod-')) {
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
