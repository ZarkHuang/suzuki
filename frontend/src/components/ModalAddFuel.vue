<script setup>
import { ref, computed, watch } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Fuel, Check, Sparkles } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const emit = defineEmits(['close', 'saved'])
const store = useMotoStore()

const date = ref(new Date().toISOString().split('T')[0])
const odometer = ref(store.currentOdometer)
const liters = ref('')
const totalCost = ref('')
const pricePerLiter = ref(30.2) // 台灣近期 92 油價預設
const fuelType = ref(store.vehicle.fuelType || '92')
const gasStation = ref('台灣中油')
const fullTank = ref(true)
const note = ref('')

// 當輸入公升與單價時，自動計算總金額；反之亦然
const onLitersInput = () => {
  if (liters.value && pricePerLiter.value) {
    totalCost.value = Math.round(Number(liters.value) * Number(pricePerLiter.value))
  }
}

const onCostInput = () => {
  if (totalCost.value && pricePerLiter.value) {
    liters.value = Number((Number(totalCost.value) / Number(pricePerLiter.value)).toFixed(2))
  }
}

const onFuelTypeChange = () => {
  if (fuelType.value === '92') pricePerLiter.value = 30.2
  else if (fuelType.value === '95') pricePerLiter.value = 31.7
  else if (fuelType.value === '98') pricePerLiter.value = 33.7
  onLitersInput()
}

// 預估本次油耗
const estimatedEfficiency = computed(() => {
  const odo = Number(odometer.value)
  const l = Number(liters.value)
  if (!odo || !l || l <= 0) return null

  const prevLogs = store.fuelLogs
    .filter(item => item.odometer < odo)
    .sort((a, b) => b.odometer - a.odometer)

  if (prevLogs.length === 0) return null
  const trip = odo - prevLogs[0].odometer
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
    pricePerLiter: Number(pricePerLiter.value),
    totalCost: Number(totalCost.value) || Math.round(Number(liters.value) * Number(pricePerLiter.value)),
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
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">加油日期</label>
            <input v-model="date" type="date" class="form-input" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">目前總里程 (KM) *</label>
            <input v-model="odometer" type="number" class="form-input text-blue" placeholder="如 450" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">加油公升數 (L) *</label>
            <input 
              v-model="liters" 
              type="number" 
              step="0.01" 
              class="form-input" 
              placeholder="如 3.8"
              @input="onLitersInput"
            />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">總金額 (NT$)</label>
            <input 
              v-model="totalCost" 
              type="number" 
              class="form-input" 
              placeholder="如 120"
              @input="onCostInput" 
            />
          </div>
        </div>

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
}

.icon-blue {
  color: var(--suzuki-blue-light);
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.text-blue {
  color: var(--suzuki-blue-light);
  font-weight: 700;
}

.efficiency-preview-card {
  background: rgba(0, 91, 172, 0.12);
  border: 1px solid rgba(0, 91, 172, 0.35);
  border-radius: var(--radius-md);
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
