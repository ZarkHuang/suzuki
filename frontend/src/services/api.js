import axios from 'axios'

// 1. 取得後端 Domain 前綴 (開發環境使用 '' 走 Vite Proxy；生產環境使用 https://suzuki-n9ey.onrender.com)
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 檢查使用者在設定頁是否自訂了網址
    try {
      const saved = localStorage.getItem('suzuki_sui_motolog_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.settings && parsed.settings.apiUrl) {
          // 清理末尾斜線與多餘的 /api (由端點統一帶 /api)
          return parsed.settings.apiUrl.replace(/\/$/, '').replace(/\/api$/, '')
        }
      }
    } catch (e) {}

    // 本地 Vite 開發環境 (localhost / 127.0.0.1) -> 回傳空字串走 Vite Proxy 反向代理
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return ''
    }
  }

  // 生產環境 (Vercel)
  const envUrl = import.meta.env.VITE_API_BASE_URL || 'https://suzuki-n9ey.onrender.com'
  return envUrl.replace(/\/$/, '').replace(/\/api$/, '')
}

// 2. 建立標準 Axios 實例
export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 3. Request 攔截器：自動附加 JWT Bearer Token 與動態 baseURL
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl()

  try {
    const saved = localStorage.getItem('suzuki_sui_motolog_auth')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`
      }
    }
  } catch (e) {}
  return config
}, (error) => {
  return Promise.reject(error)
})

// 4. Response 攔截器：統一處理錯誤
apiClient.interceptors.response.use((response) => {
  return response
}, (error) => {
  if (error.response && error.response.status === 401) {
    console.warn('⚠️ 憑證已過期，請重新登入')
  }
  return Promise.reject(error)
})

// 5. 欄位名稱轉換輔助函數 (snake_case -> camelCase)
export const formatFuelFromBackend = (item) => ({
  id: item.id,
  vehicleId: item.vehicle_id,
  date: item.date,
  odometer: Number(item.odometer),
  liters: Number(item.liters),
  pricePerLiter: Number(item.price_per_liter || 30.2),
  totalCost: Number(item.total_cost || 0),
  fuelType: item.fuel_type || '92',
  gasStation: item.gas_station || '台灣中油',
  tripDistance: Number(item.trip_distance || 0),
  efficiency: Number(item.efficiency || 0),
  fullTank: item.is_full !== 0 && item.full_tank !== false,
  note: item.note || ''
})

export const formatMaintFromBackend = (item) => {
  let parsedItems = []
  if (Array.isArray(item.items)) {
    parsedItems = item.items
  } else if (typeof item.items === 'string' && item.items.trim()) {
    try {
      parsedItems = JSON.parse(item.items)
    } catch (e) {
      parsedItems = [item.items]
    }
  }

  return {
    id: item.id,
    vehicleId: item.vehicle_id,
    date: item.date,
    odometer: Number(item.odometer),
    title: item.title || '定期保養',
    shopName: item.shop || item.shop_name || 'SUZUKI 經銷門市',
    cost: Number(item.cost || 0),
    items: parsedItems,
    note: item.note || '',
    receiptImage: item.invoice_image_url || item.receipt_image || ''
  }
}

export const formatModFromBackend = (item) => ({
  id: item.id,
  vehicleId: item.vehicle_id,
  date: item.date,
  odometer: Number(item.odometer || 0),
  title: item.title,
  category: item.category || 'exterior',
  cost: Number(item.cost || 0),
  boughtFrom: item.bought_from || '',
  status: item.status || 'installed',
  rating: Number(item.rating || 5),
  note: item.note || '',
  imageUrl: item.image_url || ''
})

// 6. 核心 API 導出 (所有路徑 100% 明確包含 /api 前綴)
export const api = {
  // 健康檢查
  async checkHealth() {
    try {
      const res = await apiClient.get('/')
      return res.status === 200
    } catch (e) {
      return false
    }
  },

  // 身份驗證 API
  async register(username, email, password) {
    try {
      const res = await apiClient.post('/api/auth/register', { username, email, password })
      return res.data
    } catch (err) {
      const msg = err.response?.data?.detail || '註冊失敗'
      throw new Error(msg)
    }
  },

  async login(email, password) {
    try {
      const res = await apiClient.post('/api/auth/login', { email, password })
      return res.data
    } catch (err) {
      const msg = err.response?.data?.detail || '登入失敗，請檢查帳號密碼'
      throw new Error(msg)
    }
  },



  async getMe() {
    const res = await apiClient.get('/api/auth/me')
    return res.data
  },

  // 1. 車輛與儀表板 API
  async getVehicle() {
    const res = await apiClient.get('/api/vehicle')
    const data = res.data
    return {
      id: data.id,
      name: data.name,
      brand: data.brand || 'SUZUKI',
      model: data.model || 'SUI 125',
      tankCapacity: data.tank_capacity,
      fuelType: data.fuel_type,
      currentOdo: data.current_odo,
      licensePlate: data.plate_number || data.license_plate || 'MY-SUI125',
      note: data.note || ''
    }
  },

  async updateVehicle(data) {
    const payload = {
      name: data.name || 'SUZUKI SUI 125',
      tank_capacity: Number(data.tankCapacity || 5.5),
      fuel_type: data.fuelType || '92',
      current_odo: Number(data.currentOdo || 0),
      plate_number: data.licensePlate || data.plateNumber || 'MY-SUI125',
      note: data.note || ''
    }
    const res = await apiClient.post('/api/vehicle', payload)
    return res.data
  },

  async updateOdometer(newOdo) {
    const res = await apiClient.patch(`/api/vehicle/odometer?new_odo=${newOdo}`)
    return res.data
  },

  // 2. 加油紀錄 API
  async getFuelLogs(params = {}) {
    const res = await apiClient.get('/api/fuel', { params })
    return res.data.map(formatFuelFromBackend)
  },

  async createFuelLog(log) {
    const payload = {
      date: log.date,
      odometer: Number(log.odometer),
      liters: Number(log.liters),
      price_per_liter: Number(log.pricePerLiter || 30.2),
      total_cost: Number(log.totalCost || 0),
      fuel_type: log.fuelType || '92',
      gas_station: log.gasStation || '台灣中油',
      trip_distance: Number(log.tripDistance || 0),
      efficiency: Number(log.efficiency || 0),
      full_tank: log.fullTank !== false,
      note: log.note || ''
    }
    const res = await apiClient.post('/api/fuel', payload)
    return res.data
  },

  async deleteFuelLog(id) {
    const res = await apiClient.delete(`/api/fuel/${id}`)
    return res.data
  },

  // 3. 保養紀錄 API
  async getMaintenanceLogs(params = {}) {
    const res = await apiClient.get('/api/maintenance', { params })
    return res.data.map(formatMaintFromBackend)
  },

  async createMaintenanceLog(log) {
    const payload = {
      date: log.date,
      odometer: Number(log.odometer),
      title: log.title || '定期保養',
      shop: log.shopName || log.shop || 'SUZUKI 經銷門市',
      cost: Number(log.cost || 0),
      items: log.items || [],
      note: log.note || '',
      invoice_image_url: log.receiptImage || log.invoice_image_url || ''
    }
    const res = await apiClient.post('/api/maintenance', payload)
    return res.data
  },

  async deleteMaintenanceLog(id) {
    const res = await apiClient.delete(`/api/maintenance/${id}`)
    return res.data
  },

  // 4. 改裝紀錄 API
  async getModifications(params = {}) {
    const res = await apiClient.get('/api/modifications', { params })
    return res.data.map(formatModFromBackend)
  },

  async createModification(mod) {
    const payload = {
      date: mod.date,
      odometer: Number(mod.odometer || 0),
      title: mod.title,
      category: mod.category || 'exterior',
      cost: Number(mod.cost || 0),
      bought_from: mod.boughtFrom || mod.bought_from || '',
      status: mod.status || 'installed',
      rating: Number(mod.rating || 5),
      note: mod.note || '',
      image_url: mod.imageUrl || mod.image_url || ''
    }
    const res = await apiClient.post('/api/modifications', payload)
    return res.data
  },

  async deleteModification(id) {
    const res = await apiClient.delete(`/api/modifications/${id}`)
    return res.data
  },

  async uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post('/api/modifications/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  // 5. AI 健檢 API
  async diagnoseVehicle(query, currentOdo = 0) {
    const res = await apiClient.post('/api/ai/diagnose', {
      query,
      current_odo: currentOdo,
      vehicle_model: 'Suzuki SUI 125'
    })
    return res.data
  }
}
