export const VEHICLE_DEFAULTS = {
  id: 'sui-125-default',
  name: 'Suzuki SUI 125',
  brand: 'SUZUKI',
  model: 'SUI 125',
  tankCapacity: 5.5, // 油箱容量 5.5L
  fuelType: '92', // 原廠建議 92 無鉛汽油以上
  oilCapacity: 650, // 機油更換量 650cc (分解 700cc)
  gearOilCapacity: 50, // 齒輪油量 50cc
  currentOdo: 0, // 預設新車初始里程 (km)
  isInitialized: false, // 是否已完成首次自訂車況引導
  purchaseDate: new Date().toISOString().split('T')[0],
  licensePlate: 'MY-SUI125',
  note: '日常通勤好夥伴'
}

// 官方標準保養里程排程與項目
export const OFFICIAL_MAINTENANCE_SCHEDULE = [
  {
    mileage: 300,
    title: '300 km 新車首保',
    category: 'first_service',
    description: '新車磨合期完成首次保養，非常重要！',
    items: [
      { name: '更換原廠機油 (10W-40 / ECSTAR 650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '清潔/檢查機油濾網', required: true },
      { name: '各部位螺絲扭力檢查', required: false },
      { name: '怠速與胎壓檢查 (前 25 psi / 後 29 psi)', required: false }
    ],
    estimatedCost: 350
  },
  {
    mileage: 1000,
    title: '1,000 km 定期保養',
    category: 'periodic',
    description: '磨合期後首次千公里定檢',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '檢查前後煞車間隙與手感', required: true },
      { name: '檢查胎壓與外觀', required: false }
    ],
    estimatedCost: 350
  },
  {
    mileage: 2000,
    title: '2,000 km 機油保養 (建議)',
    category: 'oil_only',
    description: '日常機油更換週期（每 1000~2000 km 依騎乘習慣更換）',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '一般行車安全點檢', required: false }
    ],
    estimatedCost: 250
  },
  {
    mileage: 4000,
    title: '4,000 km 定期保養',
    category: 'periodic',
    description: '進氣與傳動進氣檢查',
    items: [
      { name: '更換原廠機油', required: true },
      { name: '更換原廠齒輪油', required: true },
      { name: '清潔/檢查空氣濾清器 (空濾)', required: true },
      { name: '檢查傳動室冷卻濾棉', required: true },
      { name: '檢查煞車來令片磨耗', required: true }
    ],
    estimatedCost: 450
  },
  {
    mileage: 8000,
    title: '8,000 km 定期大保養 (耗材更換)',
    category: 'periodic',
    description: '進氣空濾與火星塞重點更換里程',
    items: [
      { name: '更換原廠機油與齒輪油', required: true },
      { name: '更換原廠空氣濾清器 (空濾)', required: true },
      { name: '更換/檢查火星塞 (CPR6EA-9 或專用規格)', required: true },
      { name: '清潔傳動室與檢查傳動皮帶磨耗', required: true },
      { name: '檢查煞車油油量與油質', required: true }
    ],
    estimatedCost: 850
  },
  {
    mileage: 12000,
    title: '12,000 km 深度保養 (傳動/供油)',
    category: 'major',
    description: '傳動系統與噴射供油系統檢測與清潔',
    items: [
      { name: '更換原廠機油與齒輪油', required: true },
      { name: '更換空濾 & 傳動濾棉', required: true },
      { name: '更換火星塞', required: true },
      { name: '更換/檢查傳動皮帶、普利珠、滑動片', required: true },
      { name: '節流閥與噴油嘴超音波清潔', required: true },
      { name: '更換煞車油 (DOT 4)', required: true }
    ],
    estimatedCost: 1800
  },
  {
    mileage: 16000,
    title: '16,000 km 定期保養',
    category: 'periodic',
    description: '中里程耗材點檢',
    items: [
      { name: '更換機油與齒輪油', required: true },
      { name: '更換空氣濾清器', required: true },
      { name: '前後輪胎磨耗與胎紋檢查', required: true },
      { name: '電瓶電壓與充電效能檢查', required: true }
    ],
    estimatedCost: 650
  },
  {
    mileage: 20000,
    title: '20,000 km 兩萬公里旗艦大保養',
    category: 'major',
    description: '全車底盤、懸吊、煞車、引擎全方位點檢',
    items: [
      { name: '更換原廠機油、齒輪油、空濾、火星塞', required: true },
      { name: '全面翻新/更換傳動皮帶、普利珠與離合器蹄片', required: true },
      { name: '更換前後煞車油 & 煞車皮', required: true },
      { name: '節流閥/進氣岐管積碳清潔', required: true },
      { name: '更換前後避震器油/檢查阻尼', required: false }
    ],
    estimatedCost: 2800
  }
]

// 常見零件耗材建議更換週期 (km)
export const PARTS_LIFECYCLE_GUIDE = [
  { name: '機油 (Engine Oil)', intervalKm: 1000, icon: 'Droplet', desc: '建議 1000~1500km 更換' },
  { name: '齒輪油 (Gear Oil)', intervalKm: 2000, icon: 'Shield', desc: '建議每 2000km 或隨機油更換' },
  { name: '空氣濾清器 (Air Filter)', intervalKm: 5000, icon: 'Wind', desc: '建議 5000km 更換，常騎粉塵路段可提早' },
  { name: '火星塞 (Spark Plug)', intervalKm: 8000, icon: 'Zap', desc: '建議 8000~10000km 更換以維持良好點火' },
  { name: '傳動皮帶 (V-Belt)', intervalKm: 15000, icon: 'RotateCw', desc: '建議 12000~15000km 檢查或更換' },
  { name: '前煞車來令片 (Front Brake)', intervalKm: 10000, icon: 'Disc', desc: '視磨耗指示線與手感定期更換' },
  { name: '煞車油 (Brake Fluid)', intervalKm: 12000, icon: 'AlertCircle', desc: '建議 1~2 年或 12000km 更換' },
  { name: '輪胎 (前後輪)', intervalKm: 8000, icon: 'Circle', desc: '磨至指示線或超過 2~3 年應立即更換' }
]

// SUI 125 常見改裝品熱門分類
export const MOD_CATEGORIES = [
  { id: 'exterior', label: '外觀件 (後貨架/風鏡/貼紙/坐墊)' },
  { id: 'storage', label: '收納 (前置物架/後箱/掛勾/手機架)' },
  { id: 'lighting', label: '燈系 (LED大燈/日行燈/方向燈)' },
  { id: 'performance', label: '傳動與動力 (普利盤/大彈簧/排氣管)' },
  { id: 'suspension', label: '底盤與避震 (前後避震器/防甩頭)' },
  { id: 'brake', label: '煞車制動 (卡鉗/金屬油管/浮動碟盤)' },
  { id: 'electronics', label: '電系 (行車記錄器/USB充電/胎壓偵測)' },
  { id: 'other', label: '其他週邊配件' }
]
