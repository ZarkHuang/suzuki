const CLOUD_API_URL = 'https://suzuki-n9ey.onrender.com'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 優先讀取使用者在設定頁自訂的網址 (若有)
    try {
      const saved = localStorage.getItem('suzuki_sui_motolog_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.settings && parsed.settings.apiUrl && parsed.settings.apiUrl !== 'http://localhost:8000') {
          return parsed.settings.apiUrl.replace(/\/$/, '')
        }
      }
    } catch (e) {}

    // 本地 Vite 開發且本機沒特別指定時
    if (window.location.hostname === 'localhost' && window.location.port === '5173') {
      return CLOUD_API_URL
    }
  }
  return CLOUD_API_URL
}

const API_BASE = getBaseUrl()

// 取得 JWT 認證 Header
const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const saved = localStorage.getItem('suzuki_sui_motolog_auth')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.token) {
        headers['Authorization'] = `Bearer ${parsed.token}`
      }
    }
  } catch (e) {}
  return headers
}




// 欄位名稱轉換輔助函數 (snake_case -> camelCase)
const formatFuelFromBackend = (item) => ({
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
  fullTank: item.full_tank !== false,
  note: item.note || ''
})

const formatMaintFromBackend = (item) => ({
  id: item.id,
  vehicleId: item.vehicle_id,
  date: item.date,
  odometer: Number(item.odometer),
  title: item.title,
  shopName: item.shop_name || 'SUZUKI 經銷門市',
  cost: Number(item.cost || 0),
  items: Array.isArray(item.items) ? item.items : [],
  note: item.note || '',
  receiptImage: item.receipt_image || ''
})

const formatModFromBackend = (item) => ({
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

export const api = {
  // 身份驗證 API (SaaS 多用戶支援)
  async register(username, email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || '註冊失敗')
    }
    return res.json()
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || '登入失敗')
    }
    return res.json()
  },

  async loginWithGoogle(email, name, sub, picture) {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, sub, picture })
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.detail || 'Google 登入失敗')
    }
    return res.json()
  },


  async getMe() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
      cache: 'no-cache'
    })
    if (!res.ok) throw new Error('未登入或憑證已過期')
    return res.json()
  },

  // 健康檢查
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/`, { method: 'GET', cache: 'no-cache' })
      return res.ok
    } catch (e) {
      return false
    }
  },

  // 車輛
  async getVehicle() {
    const res = await fetch(`${API_BASE}/api/vehicle`, {
      headers: getAuthHeaders(),
      cache: 'no-cache'
    })
    if (!res.ok) throw new Error('Failed to fetch vehicle')
    const data = await res.json()
    return {
      id: data.id,
      name: data.name,
      brand: data.brand,
      model: data.model,
      tankCapacity: data.tank_capacity,
      fuelType: data.fuel_type,
      currentOdo: data.current_odo,
      licensePlate: data.license_plate,
      note: data.note
    }
  },

  async updateVehicle(data) {
    const payload = {
      id: data.id || 'sui-125-default',
      name: data.name,
      brand: data.brand,
      model: data.model,
      tank_capacity: Number(data.tankCapacity || 5.5),
      fuel_type: data.fuelType || '92',
      current_odo: Number(data.currentOdo || 300),
      license_plate: data.licensePlate || 'ABC-1234',
      note: data.note || ''
    }
    const res = await fetch(`${API_BASE}/api/vehicle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to update vehicle')
    return res.json()
  },

  // 加油紀錄
  async getFuelLogs() {
    const res = await fetch(`${API_BASE}/api/fuel`, {
      headers: getAuthHeaders(),
      cache: 'no-cache'
    })
    if (!res.ok) throw new Error('Failed to fetch fuel logs')
    const list = await res.json()
    return list.map(formatFuelFromBackend)
  },

  async createFuelLog(log) {
    const payload = {
      id: log.id,
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
    const res = await fetch(`${API_BASE}/api/fuel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create fuel log')
    return res.json()
  },

  async deleteFuelLog(id) {
    const res = await fetch(`${API_BASE}/api/fuel/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete fuel log')
    return res.json()
  },

  // 保養紀錄
  async getMaintenanceLogs() {
    const res = await fetch(`${API_BASE}/api/maintenance`, {
      headers: getAuthHeaders(),
      cache: 'no-cache'
    })
    if (!res.ok) throw new Error('Failed to fetch maintenance logs')
    const list = await res.json()
    return list.map(formatMaintFromBackend)
  },

  async createMaintenanceLog(log) {
    const payload = {
      id: log.id,
      date: log.date,
      odometer: Number(log.odometer),
      title: log.title,
      shop_name: log.shopName || 'SUZUKI 形象店',
      cost: Number(log.cost || 0),
      items: log.items || [],
      note: log.note || '',
      receipt_image: log.receiptImage || ''
    }
    const res = await fetch(`${API_BASE}/api/maintenance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create maintenance log')
    return res.json()
  },

  async deleteMaintenanceLog(id) {
    const res = await fetch(`${API_BASE}/api/maintenance/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete maintenance log')
    return res.json()
  },

  // 改裝日誌
  async getModifications() {
    const res = await fetch(`${API_BASE}/api/modifications`, {
      headers: getAuthHeaders(),
      cache: 'no-cache'
    })
    if (!res.ok) throw new Error('Failed to fetch modifications')
    const list = await res.json()
    return list.map(formatModFromBackend)
  },

  async createModification(mod) {
    const payload = {
      id: mod.id,
      date: mod.date,
      odometer: Number(mod.odometer || 0),
      title: mod.title,
      category: mod.category || 'exterior',
      cost: Number(mod.cost || 0),
      bought_from: mod.boughtFrom || '',
      status: mod.status || 'installed',
      rating: Number(mod.rating || 5),
      note: mod.note || '',
      image_url: mod.imageUrl || ''
    }
    const res = await fetch(`${API_BASE}/api/modifications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create modification')
    return res.json()
  },

  async deleteModification(id) {
    const res = await fetch(`${API_BASE}/api/modifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to delete modification')
    return res.json()
  },

  // AI 診斷
  async askAi(query, currentOdo = 0, vehicleModel = 'Suzuki SUI 125') {
    const res = await fetch(`${API_BASE}/api/ai/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        current_odo: currentOdo,
        vehicle_model: vehicleModel
      })
    })
    if (!res.ok) throw new Error('Failed to query AI')
    return res.json()
  }
}

