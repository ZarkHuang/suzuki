// 前端與 Python FastAPI 後端的 HTTP API 溝通模組

// 當在 Docker 容器環境 (port 80) 時走相對路徑 /api，在 Vite 本地開發 (port 5173) 時走 http://localhost:8000/api
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return 'http://localhost:8000'
    }
  }
  return ''
}

const API_BASE = getBaseUrl()

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
    const res = await fetch(`${API_BASE}/api/vehicle`, { cache: 'no-cache' })
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to update vehicle')
    return res.json()
  },

  // 加油紀錄
  async getFuelLogs() {
    const res = await fetch(`${API_BASE}/api/fuel`, { cache: 'no-cache' })
    if (!res.ok) throw new Error('Failed to fetch fuel logs')
    const list = await res.json()
    return list.map(formatFuelFromBackend)
  },

  async createFuelLog(data) {
    const payload = {
      id: data.id,
      vehicle_id: data.vehicleId || 'sui-125-default',
      date: data.date,
      odometer: Number(data.odometer),
      liters: Number(data.liters),
      price_per_liter: Number(data.pricePerLiter || 30.2),
      total_cost: Number(data.totalCost),
      fuel_type: data.fuelType,
      gas_station: data.gasStation,
      trip_distance: Number(data.tripDistance || 0),
      efficiency: Number(data.efficiency || 0),
      full_tank: data.fullTank,
      note: data.note
    }
    const res = await fetch(`${API_BASE}/api/fuel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create fuel log')
    return res.json()
  },

  async deleteFuelLog(id) {
    const res = await fetch(`${API_BASE}/api/fuel/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete fuel log')
    return res.json()
  },

  // 保養紀錄
  async getMaintenanceLogs() {
    const res = await fetch(`${API_BASE}/api/maintenance`, { cache: 'no-cache' })
    if (!res.ok) throw new Error('Failed to fetch maintenance logs')
    const list = await res.json()
    return list.map(formatMaintFromBackend)
  },

  async createMaintenanceLog(data) {
    const payload = {
      id: data.id,
      vehicle_id: data.vehicleId || 'sui-125-default',
      date: data.date,
      odometer: Number(data.odometer),
      title: data.title,
      shop_name: data.shopName,
      cost: Number(data.cost || 0),
      items: data.items || [],
      note: data.note,
      receipt_image: data.receiptImage
    }
    const res = await fetch(`${API_BASE}/api/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create maintenance log')
    return res.json()
  },

  async deleteMaintenanceLog(id) {
    const res = await fetch(`${API_BASE}/api/maintenance/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete maintenance log')
    return res.json()
  },

  // 改裝日誌
  async getModifications() {
    const res = await fetch(`${API_BASE}/api/modifications`, { cache: 'no-cache' })
    if (!res.ok) throw new Error('Failed to fetch modifications')
    const list = await res.json()
    return list.map(formatModFromBackend)
  },

  async createModification(data) {
    const payload = {
      id: data.id,
      vehicle_id: data.vehicleId || 'sui-125-default',
      date: data.date,
      odometer: Number(data.odometer || 0),
      title: data.title,
      category: data.category,
      cost: Number(data.cost || 0),
      bought_from: data.boughtFrom,
      status: data.status,
      rating: Number(data.rating || 5),
      note: data.note,
      image_url: data.imageUrl
    }
    const res = await fetch(`${API_BASE}/api/modifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Failed to create modification')
    return res.json()
  },

  async deleteModification(id) {
    const res = await fetch(`${API_BASE}/api/modifications/${id}`, { method: 'DELETE' })
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

