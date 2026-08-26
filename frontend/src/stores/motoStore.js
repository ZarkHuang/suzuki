import { defineStore } from 'pinia'
import { VEHICLE_DEFAULTS, OFFICIAL_MAINTENANCE_SCHEDULE, PARTS_LIFECYCLE_GUIDE } from '../constants/sui125'
import { api } from '../services/api'

const STORAGE_KEY = 'suzuki_sui_motolog_v1'

export const useMotoStore = defineStore('moto', {
  state: () => {
    // 嘗試從 LocalStorage 讀取初始資料
    let localData = null
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        localData = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse local state', e)
      }
    }

    return {
      isBackendOnline: false,
      isSyncing: false,

      // 車輛基本資訊
      vehicle: localData?.vehicle || { ...VEHICLE_DEFAULTS },
      
      // 加油紀錄
      fuelLogs: localData?.fuelLogs || [
        {
          id: 'fuel-sample-1',
          date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
          odometer: 120,
          liters: 4.8,
          pricePerLiter: 30.5,
          totalCost: 146,
          fuelType: '92',
          gasStation: '中油直營',
          tripDistance: 120,
          efficiency: 25.0,
          fullTank: true,
          note: '新車牽車第一次加滿'
        },
        {
          id: 'fuel-sample-2',
          date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
          odometer: 295,
          liters: 3.8,
          pricePerLiter: 30.2,
          totalCost: 115,
          fuelType: '92',
          gasStation: '台塑石油',
          tripDistance: 175,
          efficiency: 46.05,
          fullTank: true,
          note: '通勤順暢，油耗表現驚艷'
        }
      ],

      // 保養紀錄
      maintenanceLogs: localData?.maintenanceLogs || [
        {
          id: 'maint-sample-1',
          date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
          odometer: 300,
          title: '300 km 新車首次原廠保養 (首保)',
          shopName: 'SUZUKI 形象旗艦店 (台鈴機車)',
          cost: 350,
          items: ['更換 ECSTAR 10W-40 原廠機油', '更換原廠齒輪油', '清洗機油濾網', '煞車胎壓檢查'],
          note: '鐵屑正常，車況順暢，換油後拉轉更順',
          receiptImage: ''
        }
      ],

      // 自訂與官方排程
      schedules: localData?.schedules || [...OFFICIAL_MAINTENANCE_SCHEDULE],

      // 改裝日誌
      modifications: localData?.modifications || [
        {
          id: 'mod-sample-1',
          date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
          odometer: 80,
          title: 'SUI 專用日系復古後貨架 + 延伸後箱',
          category: 'storage',
          cost: 2200,
          boughtFrom: '蝦皮購物 / 專門店',
          status: 'installed',
          rating: 5,
          note: '直上不需修改車殼，載物量大增且造型極具昭和文青感',
          imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 'mod-sample-2',
          date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
          odometer: 180,
          title: '八爪減震鋁合金手機支架 + QC3.0快充頭',
          category: 'electronics',
          cost: 890,
          boughtFrom: 'MOMO購物網',
          status: 'installed',
          rating: 5,
          note: '導航看地圖非常穩固，鎖後照鏡底座',
          imageUrl: ''
        }
      ],

      // AI 問診對話歷史
      aiChatHistory: localData?.aiChatHistory || [
        {
          role: 'assistant',
          content: '哈囉！我是您的 **Suzuki SUI 125 隨車智慧診斷小幫手** 🛵。\n\n不論是車輛異音、起步抖動、煞車軟、冷車難發，或是機油耗材更換週期問題，都可以隨時問我！',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],

      // 設定
      settings: localData?.settings || {
        apiUrl: 'http://localhost:8000',
        enableNotifications: true,
        notifyAdvanceKm: 150,
        currencySymbol: 'NT$'
      }
    }
  },

  getters: {
    currentOdometer: (state) => {
      let maxOdo = state.vehicle.currentOdo || 0
      state.fuelLogs.forEach(l => { if (l.odometer > maxOdo) maxOdo = l.odometer })
      state.maintenanceLogs.forEach(m => { if (m.odometer > maxOdo) maxOdo = m.odometer })
      state.modifications.forEach(mod => { if (mod.odometer > maxOdo) maxOdo = mod.odometer })
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
      const current = state.vehicle.currentOdo || 0
      const sorted = [...state.schedules].sort((a, b) => a.mileage - b.mileage)
      
      for (const schedule of sorted) {
        const isDone = state.maintenanceLogs.some(log => Math.abs(log.odometer - schedule.mileage) <= 150)
        if (!isDone && schedule.mileage >= current) {
          const remainingKm = schedule.mileage - current
          const isUrgent = remainingKm <= state.settings.notifyAdvanceKm
          return {
            ...schedule,
            remainingKm,
            isUrgent,
            progressPercent: Math.min(100, Math.max(0, ((current - (schedule.mileage - 1000)) / 1000) * 100))
          }
        }
      }

      const nextKm = Math.ceil((current + 1) / 1000) * 1000
      return {
        mileage: nextKm,
        title: `${nextKm.toLocaleString()} km 定期保養`,
        items: [{ name: '機油更換與安全檢查', required: true }],
        remainingKm: nextKm - current,
        isUrgent: (nextKm - current) <= state.settings.notifyAdvanceKm,
        progressPercent: 50
      }
    },

    partsStatusList: (state) => {
      const current = state.vehicle.currentOdo || 0
      return PARTS_LIFECYCLE_GUIDE.map(part => {
        const lastMaint = state.maintenanceLogs
          .filter(l => l.items && l.items.some(i => (typeof i === 'string' ? i : i.name).includes(part.name.split(' ')[0])))
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
    }
  },

  actions: {
    // 初始化並從後端 MySQL 拉取最新資料 (MySQL 為準)
    async initSyncWithBackend() {
      this.isSyncing = true
      try {
        const online = await api.checkHealth()
        this.isBackendOnline = online

        if (online) {
          console.log('✅ 後端連線成功，正在從 MySQL 同步最新資料...')
          
          // 抓取 MySQL 最新資料
          const [v, fuels, maints, mods] = await Promise.all([
            api.getVehicle().catch(() => null),
            api.getFuelLogs().catch(() => []),
            api.getMaintenanceLogs().catch(() => []),
            api.getModifications().catch(() => [])
          ])

          // 如果 MySQL 資料庫是完全空的，將前端現有預設資料灌入 MySQL
          if (fuels.length === 0 && maints.length === 0 && this.fuelLogs.length > 0) {
            console.log('🚀 MySQL 為空，正在自動注入初始範例資料至 MySQL...')
            if (v) await api.updateVehicle(this.vehicle).catch(() => {})
            for (const f of this.fuelLogs) {
              await api.createFuelLog(f).catch(() => {})
            }
            for (const m of this.maintenanceLogs) {
              await api.createMaintenanceLog(m).catch(() => {})
            }
            for (const mod of this.modifications) {
              await api.createModification(mod).catch(() => {})
            }
          } else {
            // MySQL 內已有資料（包含使用者從 phpMyAdmin 修改的資料），直接覆蓋前端！
            if (v) this.vehicle = v
            this.fuelLogs = fuels
            this.maintenanceLogs = maints
            this.modifications = mods
          }
        }
      } catch (err) {
        console.warn('後端連線異常，將運行於離線 LocalStorage 模式:', err)
        this.isBackendOnline = false
      } finally {
        this.isSyncing = false
        this.persist()
      }
    },


    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state))
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

    // 更新里程
    updateOdometer(newOdo) {
      if (newOdo !== undefined && newOdo !== null) {
        this.vehicle.currentOdo = Math.max(this.vehicle.currentOdo || 0, Number(newOdo))
        this.persist()
        if (this.isBackendOnline) {
          api.updateVehicle(this.vehicle).catch(() => {})
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

      // 同步發送至後端寫入 MySQL
      if (this.isBackendOnline) {
        api.createFuelLog(newLog).catch(e => console.error('Sync fuel to MySQL error:', e))
      }

      return newLog
    },

    async deleteFuelLog(id) {
      this.fuelLogs = this.fuelLogs.filter(l => l.id !== id)
      this.persist()
      if (this.isBackendOnline) {
        api.deleteFuelLog(id).catch(e => console.error('Delete fuel from MySQL error:', e))
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
        shopName: log.shopName || 'SUZUKI 經銷門市',
        cost: Number(log.cost) || 0,
        items: Array.isArray(log.items) ? log.items : [log.items].filter(Boolean),
        note: log.note || '',
        receiptImage: log.receiptImage || ''
      }

      this.maintenanceLogs.unshift(newLog)
      this.maintenanceLogs.sort((a, b) => b.odometer - a.odometer)
      this.updateOdometer(odo)
      this.persist()

      // 同步發送至後端寫入 MySQL
      if (this.isBackendOnline) {
        api.createMaintenanceLog(newLog).catch(e => console.error('Sync maint to MySQL error:', e))
      }

      return newLog
    },

    async deleteMaintenanceLog(id) {
      this.maintenanceLogs = this.maintenanceLogs.filter(l => l.id !== id)
      this.persist()
      if (this.isBackendOnline) {
        api.deleteMaintenanceLog(id).catch(e => console.error('Delete maint from MySQL error:', e))
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

      // 同步發送至後端寫入 MySQL
      if (this.isBackendOnline) {
        api.createModification(newMod).catch(e => console.error('Sync mod to MySQL error:', e))
      }

      return newMod
    },

    async deleteModification(id) {
      this.modifications = this.modifications.filter(m => m.id !== id)
      this.persist()
      if (this.isBackendOnline) {
        api.deleteModification(id).catch(e => console.error('Delete mod from MySQL error:', e))
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
