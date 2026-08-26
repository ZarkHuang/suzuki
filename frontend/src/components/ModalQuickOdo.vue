<script setup>
import { ref } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Gauge, Check } from 'lucide-vue-next'

const emit = defineEmits(['close'])
const store = useMotoStore()

const currentVal = ref(store.currentOdometer)
const newOdometer = ref(store.currentOdometer)

const quickAdd = (km) => {
  newOdometer.value = Number(newOdometer.value) + km
}

const save = () => {
  if (newOdometer.value && Number(newOdometer.value) >= 0) {
    store.updateOdometer(Number(newOdometer.value))
    emit('close')
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div class="title-with-icon">
          <Gauge :size="20" class="icon-blue" />
          <h3>更新當前總里程</h3>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-desc">
          紀錄機車目前儀表板上的總累積里程 (Odometer)，以利系統為您精準預測保養時間與耗材壽命。
        </p>

        <div class="form-group">
          <label class="form-label">目前總里程數 (公里 KM)</label>
          <div class="input-with-unit">
            <input 
              v-model="newOdometer" 
              type="number" 
              class="form-input text-highlight" 
              placeholder="例如 1250" 
              autofocus
            />
            <span class="unit-tag">KM</span>
          </div>
        </div>

        <!-- 快捷增減按鈕 -->
        <div class="quick-add-group">
          <span class="quick-label">快捷增加里程：</span>
          <div class="quick-buttons">
            <button class="btn-chip" @click="quickAdd(5)">+5km</button>
            <button class="btn-chip" @click="quickAdd(15)">+15km (日常通勤)</button>
            <button class="btn-chip" @click="quickAdd(50)">+50km (跑山出遊)</button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">
          <Check :size="18" /> 確認更新
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
  border-radius: 6px;
}

.btn-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.4;
}

.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-unit .form-input {
  padding-right: 50px;
  font-size: 1.25rem;
  font-family: var(--font-mono);
  font-weight: 700;
}

.text-highlight {
  color: var(--suzuki-blue-light);
}

.unit-tag {
  position: absolute;
  right: 14px;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
}

.quick-add-group {
  margin-top: 14px;
  margin-bottom: 20px;
}

.quick-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  display: block;
  margin-bottom: 6px;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-chip {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  padding: 5px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-chip:hover {
  background: rgba(0, 91, 172, 0.2);
  border-color: rgba(0, 91, 172, 0.5);
  color: #38bdf8;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
