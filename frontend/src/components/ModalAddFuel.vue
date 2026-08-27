<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Fuel, Check, Sparkles, Calendar, RotateCcw } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const emit = defineEmits(['close', 'saved'])
const store = useMotoStore()

// 取得今天與昨天 YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0]
const getYesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

const date = ref(getTodayStr())
const odometer = ref(store.currentOdometer || store.vehicle.currentOdo || 0)
const liters = ref('')
const totalCost = ref('')
const pricePerLiter = ref(30.2) // 每公升油價 (車主可自由填寫修改)
const fuelType = ref(store.vehicle.fuelType || '92')
const gasStation = ref('台灣中油')
const fullTank = ref(true)
const note = ref('')

onMounted(() => {
  // 自動帶入車輛最新當前總里程
  if (store.currentOdometer > 0) {
    odometer.value = store.currentOdometer
  }
})

// 快速設定日期
const setDateToday = () => { date.value = getTodayStr() }
const setDateYesterday = () => { date.value = getYesterdayStr() }

// 當輸入公升時，自動依照單價計算總金額
const onLitersInput = () => {
  const l = parseFloat(liters.value)
  const p = parseFloat(pricePerLiter.value)
  if (!isNaN(l) && !isNaN(p) && p > 0) {
    totalCost.value = Math.round(l * p)
  }
}

// 當輸入總金額時，自動依照單價計算公升數
const onCostInput = () => {
  const c = parseFloat(totalCost.value)
  const p = parseFloat(pricePerLiter.value)
  if (!isNaN(c) && !isNaN(p) && p > 0) {
    liters.value = parseFloat((c / p).toFixed(2))
  }
}

// 當修改每公升油價時，動態更新總金額
const onPriceInput = () => {
  const l = parseFloat(liters.value)
  const p = parseFloat(pricePerLiter.value)
  if (!isNaN(l) && !isNaN(p) && l > 0) {
    totalCost.value = Math.round(l * p)
  }
}

// 切換油品時，僅更新參考建議單價 (不鎖死，車主仍可自由改)
const onFuelTypeChange = () => {
  if (fuelType.value === '92') pricePerLiter.value = 30.2
  else if (fuelType.value === '95') pricePerLiter.value = 31.7
  else if (fuelType.value === '98') pricePerLiter.value = 33.7
  onPriceInput()
}

// 預估本次油耗
const estimatedEfficiency = computed(() => {
  const odo = Number(odometer.value)
  const l = Number(liters.value)
  if (!odo || !l || l <= 0) return null

  const prevLogs = store.fuelLogs
    .filter(item => Number(item.odometer) < odo)
    .sort((a, b) => Number(b.odometer) - Number(a.odometer))

  if (prevLogs.length === 0) return null
  const trip = odo - Number(prevLogs[0].odometer)
  if (trip <= 0) return null
  return (trip / l).toFixed(2)
})

const save = () => {
  if (!odometer.value || !liters.value) {
    alert('請填寫加油時的累積總里程與公升數')
    return
  }

  const log = store.addFuelLog({
    date: date.value,
    odometer: Number(odometer.value),
    liters: Number(liters.value),
    pricePerLiter: Number(pricePerLiter.value || 30.2),
    totalCost: Number(totalCost.value) || Math.round(Number(liters.value) * Number(pricePerLiter.value || 30.2)),
    fuelType: fuelType.value,
    gasStation: gasStation.value,
    fullTank: fullTank.value,
    note: note.value
  })

  // 放彩帶特效慶祝記帳成功
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.8 }
  })

  emit('saved', log)
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div class="title-with-icon">
          <Fuel :size="20" class="icon-blue" />
          <h3>記錄加油資訊</h3>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 1. 加油日期 (提供日曆選擇器 + 快捷按鈕) -->
        <div class="form-group">
          <div class="label-with-actions">
            <label class="form-label"><Calendar :size="14" /> 加油日期</label>
            <div class="date-quick-btns">
              <button type="button" class="btn-quick-date" :class="{ active: date === getTodayStr() }" @click="setDateToday">今天</button>
              <button type="button" class="btn-quick-date" :class="{ active: date === getYesterdayStr() }" @click="setDateYesterday">昨天</button>
            </div>
          </div>
          <input v-model="date" type="date" class="form-input date-input" />
        </div>

        <!-- 2. 目前總里程 (自動帶入當前儀表里程) -->
        <div class="form-group">
          <div class="label-with-actions">
            <label class="form-label">目前總里程 (KM) *</label>
            <span class="badge-auto-fill">已自動帶入當前儀表</span>
          </div>
          <input 
            v-model="odometer" 
            type="number" 
            class="form-input text-blue text-lg" 
            placeholder="如 450" 
            required
          />
        </div>

        <!-- 3. 每公升油價 / 公升數 / 總金額 (三欄彈性自訂) -->
        <div class="form-row-three">
          <div class="form-group flex-1">
            <label class="form-label">油價 (NT$/L)</label>
            <input 
              v-model="pricePerLiter" 
              type="number" 
              step="0.1" 
              class="form-input" 
              placeholder="如 30.2"
              @input="onPriceInput"
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">加油量 (L) *</label>
            <input 
              v-model="liters" 
              type="number" 
              step="0.01" 
              class="form-input" 
              placeholder="如 3.8"
              required
              @input="onLitersInput"
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">總金額 (NT$)</label>
            <input 
              v-model="totalCost" 
              type="number" 
              class="form-input text-amber font-bold" 
              placeholder="如 120"
              @input="onCostInput" 
            />
          </div>
        </div>

        <!-- 4. 油品與加油站 -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">油品選擇</label>
            <select v-model="fuelType" class="form-select" @change="onFuelTypeChange">
              <option value="92">92 無鉛汽油 (SUI 原廠推薦)</option>
              <option value="95">95 無鉛汽油</option>
              <option value="98">98 無鉛汽油</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">加油站</label>
            <select v-model="gasStation" class="form-select">
              <option value="台灣中油">台灣中油</option>
              <option value="台塑石油">台塑石油</option>
              <option value="全國加油站">全國加油站</option>
              <option value="其他">其他品牌</option>
            </select>
          </div>
        </div>

        <!-- 預估油耗預覽小卡 -->
        <div v-if="estimatedEfficiency" class="efficiency-preview-card">
          <div class="preview-title">
            <Sparkles :size="15" class="icon-sparkle" /> 預估本次平均油耗
          </div>
          <div class="preview-val">
            <span class="val-num stat-number">{{ estimatedEfficiency }}</span>
            <span class="val-unit">km / L</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">備忘與備註 (選填)</label>
          <input v-model="note" type="text" class="form-input" placeholder="例如：雙載跑陽明山 / 通勤順暢" />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">
          <Check :size="18" /> 儲存加油紀錄
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-with-icon h3 {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.icon-blue {
  color: var(--suzuki-blue-light, #38bdf8);
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
}

.label-with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.date-quick-btns {
  display: flex;
  gap: 4px;
}

.btn-quick-date {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-quick-date.active,
.btn-quick-date:hover {
  background: #005BAC;
  color: #fff;
  border-color: #38bdf8;
}

.badge-auto-fill {
  font-size: 0.72rem;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.flex-1 {
  flex: 1;
}

.text-blue {
  color: #38bdf8;
}

.text-amber {
  color: #f59e0b;
}

.text-lg {
  font-size: 1.1rem;
  font-weight: 700;
}

.font-bold {
  font-weight: 700;
}

.date-input {
  color-scheme: dark;
}

.efficiency-preview-card {
  background: rgba(0, 91, 172, 0.12);
  border: 1px solid rgba(0, 91, 172, 0.35);
  border-radius: var(--radius-md, 10px);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #94a3b8;
}

.icon-sparkle {
  color: #f59e0b;
}

.preview-val {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.val-num {
  font-size: 1.35rem;
  color: #38bdf8;
  font-weight: 800;
}

.val-unit {
  font-size: 0.75rem;
  color: #94a3b8;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
</style>
