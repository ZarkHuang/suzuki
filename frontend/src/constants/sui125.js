export const VEHICLE_DEFAULTS = {
  id: 'sui-125-default',
  name: 'Suzuki SUI 125',
  brand: 'SUZUKI',
  model: 'SUI 125',
  tankCapacity: 5.5, // 燃油箱容量 5.5L (手冊 P.63, P.64)
  fuelType: '92', // 原廠建議使用 92 無鉛汽油以上 (手冊 P.60 嚴禁高級汽油)
  oilCapacity: 650, // 機油更換量 650cc (分解全容量 800cc，手冊 P.52, P.64)
  gearOilCapacity: 50, // 齒輪油更換量 50cc (分解容量 60cc，手冊 P.53)
  sparkPlug: 'NGK CPR7EA-9 (間隙 0.8~0.9mm)', // 手冊 P.64
  battery: 'YTX7A-BS 12V 6Ah', // 免保養電瓶 (手冊 P.64)
  tireSpec: '100/90-10 56M', // 原廠前後胎尺寸 (手冊 P.57, P.63)
  currentOdo: 0, // 預設新車初始里程 (km)
  isInitialized: false, // 是否已完成首次自訂車況引導
  purchaseDate: new Date().toISOString().split('T')[0],
  licensePlate: 'MY-SUI125',
  note: 'Suzuki SUI 125 原廠好夥伴'
}

// SUZUKI SUI 125 車主強化保養里程排程與項目 (兼顧官方手冊規範與台灣氣候/市區走走停停用車習慣，每 1,500km 強化定保)
// 新車首保為 500km，其後機油更換為每 1,500km，齒輪油每 3,000km，重大定檢耗材於 8,000km / 17,000km / 20,000km 實施
export const OFFICIAL_MAINTENANCE_SCHEDULE = [
  {
    mileage: 500,
    title: '500 km 新車磨合首次定保 (新車首保)',
    category: 'first_service',
    description: 'Suzuki 原廠規定新車磨合期完成後的首度保養（磨合馴車期 2000km 內請保持時速 60km/h 以下）',
    items: [
      { name: '更換原廠機油 (SAE 10W-40 API SL級以上 / 650cc)', required: true },
      { name: '更換原廠齒輪油 (SAE 10W-40 或 90# / 50cc)', required: true },
      { name: '拆卸機油濾油網清潔，檢查外蓋 O 型油環', required: true },
      { name: '拆卸清潔冷卻導風蓋過濾棉 (傳動濾棉海綿)', required: true },
      { name: '排氣管螺栓與車身螺栓扭力鎖緊', required: true },
      { name: '檢查後煞車拉桿自由間隙 (標準 15~25mm)', required: true },
      { name: '檢查油門線間隙與引擎怠速 (1500±100 rpm)', required: false },
      { name: '檢查空氣濾清器濾芯與火星塞狀態', required: false },
      { name: '胎壓檢查 (單人 前 25 psi / 後 29 psi；雙人 後 36 psi)', required: false },
      { name: '全車各活動關節潤滑點檢', required: false }
    ],
    estimatedCost: 350
  },
  {
    mileage: 2000,
    title: '2,000 km 強化定期機油保養 (行駛 1,500km)',
    category: 'oil_only',
    description: '車主強化換油週期（新車首保後行駛 1,500km 定期更換，磨合馴車期圓滿結束）',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '檢查機油液位尺油量與引擎密封性', required: true },
      { name: '檢查前後煞車作動手感與自由間隙', required: true },
      { name: '輪胎外觀磨耗與胎壓確認', required: false },
      { name: '全車燈系與電瓶端子檢查', required: false }
    ],
    estimatedCost: 250
  },
  {
    mileage: 3500,
    title: '3,500 km 強化定期保養 (行駛 1,500km)',
    category: 'periodic',
    description: '每 1,500km 強化換油＋雙次定保更換齒輪油，兼顧市區停等高溫保護',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc，每 3,000km 定期更換)', required: true },
      { name: '檢查後煞車拉桿自由間隙 (後煞車 15~25mm)', required: true },
      { name: '前後輪胎胎壓與外觀磨耗確認', required: false },
      { name: '全車煞車作動巡檢', required: false }
    ],
    estimatedCost: 350
  },
  {
    mileage: 5000,
    title: '5,000 km 強化定期保養 (行駛 1,500km)',
    category: 'oil_only',
    description: '日常機油更換與傳動進氣濾棉清潔巡檢，維持引擎順暢呼吸',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '拆下冷卻導風蓋，以氣槍清潔內部過濾海綿', required: true },
      { name: '煞車拉桿自由間隙確認與調整', required: true },
      { name: '全車燈光電系與胎紋點檢', required: false }
    ],
    estimatedCost: 250
  },
  {
    mileage: 6500,
    title: '6,500 km 強化定期保養 (行駛 1,500km)',
    category: 'periodic',
    description: '每 1,500km 機油更換＋齒輪油雙保養，煞車來令片深度點檢',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '檢查前後煞車系統與來令片磨耗厚度', required: true },
      { name: '檢查空氣濾清器濾芯表面灰塵 (清潔外盒)', required: false },
      { name: '檢查油門線間隙與車身螺栓扭力', required: false }
    ],
    estimatedCost: 350
  },
  {
    mileage: 8000,
    title: '8,000 km 年度重要大保養 (行駛 1,500km，原廠大保養基準)',
    category: 'major',
    description: 'Suzuki 原廠滿 1 年重點大保養：空濾、火星塞、冷風扇濾棉全面換新，傳動與汽門重點點檢',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '更換原廠空氣濾清器濾芯 (原廠保養表明訂 8,000km 更換)', required: true },
      { name: '更換原廠火星塞 (NGK CPR7EA-9，原廠保養表指定更換)', required: true },
      { name: '更換冷卻導風蓋過濾棉 (傳動濾棉新品)', required: true },
      { name: '檢查/更換傳動驅動皮帶磨耗 (原廠保養週期表標記更換)', required: true },
      { name: '檢查汽門間隙 (原廠定期表 8000km 檢查項目)', required: true },
      { name: '檢查排氣管螺栓與消音器螺栓鎖緊', required: true },
      { name: '檢查蒸發排放控制系統與煞車管路', required: true },
      { name: '前後輪胎磨耗與轉向機構檢查', required: false }
    ],
    estimatedCost: 950
  },
  {
    mileage: 9500,
    title: '9,500 km 強化定期保養 (行駛 1,500km)',
    category: 'oil_only',
    description: '大保養後之常規定保，確保氣冷引擎在最佳潤滑狀態',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '檢查前後煞車作動手感與自由間隙', required: true },
      { name: '胎壓確認與胎面異物排除', required: false }
    ],
    estimatedCost: 250
  },
  {
    mileage: 11000,
    title: '11,000 km 萬里強化保養 (行駛 1,500km)',
    category: 'periodic',
    description: '突破萬里大關！油品定保與機油濾網清潔、噴油嘴保養',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '拆卸清潔機油濾油網並檢查 O 型環', required: true },
      { name: '檢查前後煞車來令片/後鼓煞蹄片厚度', required: true },
      { name: '檢查電瓶電壓與接頭端子 (YTX7A-BS)', required: true },
      { name: '添加台鈴環保噴油嘴清淨劑 (建議每 1000~2000km 添加 30cc)', required: false }
    ],
    estimatedCost: 450
  },
  {
    mileage: 12500,
    title: '12,500 km 強化定期保養 (行駛 1,500km)',
    category: 'periodic',
    description: '日常強化機油定保與傳動室清潔檢驗',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '拆卸清潔冷卻導風蓋過濾海綿', required: true },
      { name: '傳動室拆檢清潔 (普利珠、普利盤滑件、離合器)', required: false },
      { name: '煞車拉桿自由間隙確認', required: true }
    ],
    estimatedCost: 450
  },
  {
    mileage: 14000,
    title: '14,000 km 強化定期保養 (行駛 1,500km)',
    category: 'periodic',
    description: '機油＋齒輪油強化定保與安全底盤巡檢',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '檢查空氣濾清器濾芯髒污程度', required: true },
      { name: '煞車來令片磨耗確認與手感調整', required: true },
      { name: '輪胎胎紋深度與胎壓點檢', required: false }
    ],
    estimatedCost: 350
  },
  {
    mileage: 15500,
    title: '15,500 km 強化定期機油保養 (行駛 1,500km)',
    category: 'oil_only',
    description: '常規機油定保，為即將到來的雙年度大保養預備',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '煞車拉桿自由間隙檢查 (後煞車 15~25mm)', required: true },
      { name: '全車燈系與電瓶電壓點檢', required: false }
    ],
    estimatedCost: 250
  },
  {
    mileage: 17000,
    title: '17,000 km 雙年度旗艦大保養 (行駛 1,500km，更換煞車油)',
    category: 'major',
    description: '原廠滿 2 年大保養節點：明訂每 2 年更換煞車油 (DOT 4)、空氣濾清器、火星塞、冷風扇濾棉與傳動皮帶',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '更換煞車油 (DOT 4，原廠手冊明訂每 2 年更換)', required: true },
      { name: '更換原廠空氣濾清器濾芯', required: true },
      { name: '更換原廠火星塞 (NGK CPR7EA-9)', required: true },
      { name: '更換冷卻導風蓋過濾棉', required: true },
      { name: '更換傳動驅動皮帶 (原廠定期保養表指定)', required: true },
      { name: '檢查燃油軟管與煞車軟管 (手冊規定每 4 年更換一次)', required: true },
      { name: '檢查汽門間隙與排氣管螺栓扭力', required: true },
      { name: '全車車身螺栓螺帽全數鎖緊', required: true }
    ],
    estimatedCost: 1850
  },
  {
    mileage: 18500,
    title: '18,500 km 強化定期機油保養 (行駛 1,500km)',
    category: 'oil_only',
    description: '機油更換與日常安全巡檢',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '煞車來令片磨耗檢查與手感確認', required: true },
      { name: '輪胎磨耗與胎壓確認', required: false }
    ],
    estimatedCost: 250
  },
  {
    mileage: 20000,
    title: '20,000 km 兩萬公里里程碑旗艦大檢修 (行駛 1,500km)',
    category: 'major',
    description: '兩萬公里大關：全車動力、傳動與進排氣系統深度翻新與排氣定檢',
    items: [
      { name: '更換原廠機油 (650cc)', required: true },
      { name: '更換原廠齒輪油 (50cc)', required: true },
      { name: '更換空氣濾清器濾芯、火星塞、冷風扇濾棉', required: true },
      { name: '傳動系統全套翻新 (皮帶、普利珠、離合器蹄片、碗公)', required: true },
      { name: '節氣門本體與噴油嘴超音波清洗積碳', required: true },
      { name: '清潔/更換燃油泵浦濾網 (原廠手冊定檢記號 F)', required: true },
      { name: '更換前後煞車皮/來令片', required: true },
      { name: '環保署排氣 CO/HC 檢測與調整', required: true },
      { name: '前後懸吊、避震器作動與轉向軸承深度檢測', required: false }
    ],
    estimatedCost: 2600
  }
]

// 常見零件耗材建議更換週期 (km) - 車主強化保護模式 (適應台灣氣候環境)
export const PARTS_LIFECYCLE_GUIDE = [
  { 
    name: '機油 (Engine Oil)', 
    intervalKm: 1500, 
    icon: 'Droplet', 
    desc: '車主強化保護週期：每 1,500 km 定期更換 (適應台灣高溫潮濕氣候、紅綠燈怠速與市區頻繁走走停停，全效保護 650cc 氣冷引擎)' 
  },
  { 
    name: '齒輪油 (Gear Oil)', 
    intervalKm: 3000, 
    icon: 'Shield', 
    desc: '建議每 3,000 km 更換 (約每兩次機油定保更換一次，容量 50cc，SAE 10W-40 或 90# 專用油)' 
  },
  { 
    name: '空氣濾清器 (Air Filter)', 
    intervalKm: 8000, 
    icon: 'Wind', 
    desc: '原廠保養表每 4000km 檢查，8000km 更換濾芯 (切勿以高壓氣槍直接吹濾芯，以免破損損壞引擎)' 
  },
  { 
    name: '火星塞 (Spark Plug)', 
    intervalKm: 8000, 
    icon: 'Zap', 
    desc: '原廠指定型號 NGK CPR7EA-9 (間隙 0.8~0.9mm)，保養表規定 8000km 更換' 
  },
  { 
    name: '冷卻風扇濾棉 (Fan Filter)', 
    intervalKm: 8000, 
    icon: 'Filter', 
    desc: '傳動冷導風蓋過濾海綿，每 4000km 氣槍清潔，8000km 更換新品以維護傳動散熱' 
  },
  { 
    name: '傳動皮帶 (V-Belt)', 
    intervalKm: 16000, 
    icon: 'RotateCw', 
    desc: '原廠保養週期表於 8000km、16000km~17000km 標記更換，建議每 4000km 檢查磨耗狀況' 
  },
  { 
    name: '煞車油 (Brake Fluid)', 
    intervalKm: 16000, 
    icon: 'AlertCircle', 
    desc: '原廠手冊明訂每 2 年或 16000~17000km 更換一次 (規格 DOT 4)' 
  },
  { 
    name: '前煞車來令片 (Front Brake)', 
    intervalKm: 10000, 
    icon: 'Disc', 
    desc: '油壓碟式煞車，視磨耗指示槽與手感定期更換' 
  },
  { 
    name: '後煞車鼓皮 (Rear Brake)', 
    intervalKm: 12000, 
    icon: 'Disc', 
    desc: '機械鼓式煞車，後煞車拉桿自由間隙維持 15~25mm，磨耗至極限標記更換' 
  },
  { 
    name: '輪胎 (前後輪)', 
    intervalKm: 10000, 
    icon: 'Circle', 
    desc: '規格 100/90-10 56M，胎壓前 25 psi / 後 29 psi，磨至磨耗指示線 (T.W.I) 立即更換' 
  }
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
