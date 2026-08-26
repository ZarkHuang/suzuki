<script setup>
import { ref, computed } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Wrench, Check, Plus, Trash2, Camera } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const props = defineProps({
  presetSchedule: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])
const store = useMotoStore()

const date = ref(new Date().toISOString().split('T')[0])
const odometer = ref(props.presetSchedule ? props.presetSchedule.mileage : store.currentOdometer)
const title = ref(props.presetSchedule ? props.presetSchedule.title : `${store.currentOdometer} km 定期保養`)
const shopName = ref('SUZUKI 旗艦重車/車行')
const cost = ref(props.presetSchedule ? props.presetSchedule.estimatedCost : 350)
const note = ref('')
const receiptImage = ref('')

// 預設項目清單
const items = ref(
  props.presetSchedule 
    ? props.presetSchedule.items.map(i => (typeof i === 'string' ? i : i.name))
    : ['更換原廠機油 (650cc)', '更換原廠齒輪油 (50cc)', '清潔機油濾網與胎壓點檢']
)

const newItemText = ref('')

const addItem = () => {
  if (newItemText.value.trim()) {
    items.value.push(newItemText.value.trim())
    newItemText.value = ''
  }
}

const removeItem = (idx) => {
  items.value.splice(idx, 1)
}

// 快速套用官方項目範本
const applyOfficialTemplate = (schedule) => {
  odometer.value = schedule.mileage
  title.value = schedule.title
  cost.value = schedule.estimatedCost || 350
  items.value = schedule.items.map(i => (typeof i === 'string' ? i : i.name))
}

// 照片上傳處理 (轉 Base64 離線儲存)
const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('照片請小於 5MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    receiptImage.value = event.target.result
  }
  reader.readAsDataURL(file)
}

const save = () => {
  if (!odometer.value || !title.value) {
    alert('請填寫保養里程與標題')
    return
  }

  const log = store.addMaintenanceLog({
    date: date.value,
    odometer: Number(odometer.value),
    title: title.value,
    shopName: shopName.value,
    cost: Number(cost.value) || 0,
    items: items.value,
    note: note.value,
    receiptImage: receiptImage.value
  })

  confetti({
    particleCount: 50,
    spread: 70,
    origin: { y: 0.7 }
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
          <Wrench :size="20" class="icon-red" />
          <h3>記錄車輛保養</h3>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 官方範本快速選取 -->
        <div class="template-selector">
          <span class="template-label">SUI 125 官方原廠里程快捷套用：</span>
          <div class="template-chips">
            <button 
              v-for="s in store.schedules.slice(0, 5)" 
              :key="s.mileage" 
              class="btn-chip"
              @click="applyOfficialTemplate(s)"
            >
              {{ s.mileage }}km
            </button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">保養日期</label>
            <input v-model="date" type="date" class="form-input" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">保養總里程 (KM) *</label>
            <input v-model="odometer" type="number" class="form-input text-highlight" placeholder="如 1000" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">保養主題名稱 *</label>
            <input v-model="title" type="text" class="form-input" placeholder="例如：1000 km 定期保養" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">保養總花費 (NT$)</label>
            <input v-model="cost" type="number" class="form-input" placeholder="如 350" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">保養車行 / 技師</label>
          <input v-model="shopName" type="text" class="form-input" placeholder="例如：SUZUKI 台鈴經銷店" />
        </div>

        <!-- 施工項目清單 -->
        <div class="form-group">
          <label class="form-label">本次保養施工/更換項目 ({{ items.length }}項)</label>
          <div class="items-list">
            <div v-for="(item, idx) in items" :key="idx" class="item-row">
              <span class="item-dot"></span>
              <span class="item-text">{{ item }}</span>
              <button class="btn-delete-item" @click="removeItem(idx)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <div class="add-item-bar">
            <input 
              v-model="newItemText" 
              type="text" 
              class="form-input form-input-sm" 
              placeholder="新增自訂項目 (如更換高流量空濾、更換火星塞...)"
              @keyup.enter="addItem" 
            />
            <button class="btn btn-secondary btn-sm" @click="addItem">
              <Plus :size="16" /> 新增
            </button>
          </div>
        </div>

        <!-- 單據/施工照片上傳 -->
        <div class="form-group">
          <label class="form-label">保養工單/發票照片 (選填)</label>
          <div class="image-upload-box">
            <label class="upload-trigger">
              <input type="file" accept="image/*" class="file-hidden" @change="handleImageUpload" />
              <Camera :size="20" />
              <span>{{ receiptImage ? '點擊更換照片' : '拍攝或上傳工單照片' }}</span>
            </label>
            <div v-if="receiptImage" class="image-preview">
              <img :src="receiptImage" alt="工單照片預覽" />
              <button class="btn-remove-img" @click="receiptImage = ''">移除</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">技師備註 / 心得</label>
          <textarea v-model="note" class="form-textarea" rows="2" placeholder="例如：機油鐵屑少、胎壓已充填、建議 4000km 清潔空濾"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">
          <Check :size="18" /> 完成並儲存保養紀錄
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
  margin-bottom: 14px;
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

.icon-red {
  color: var(--suzuki-red);
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.template-selector {
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin-bottom: 16px;
}

.template-label {
  font-size: 0.75rem;
  color: var(--suzuki-blue-light);
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

.template-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.btn-chip {
  background: rgba(0, 91, 172, 0.15);
  border: 1px solid rgba(0, 91, 172, 0.35);
  color: #38bdf8;
  border-radius: var(--radius-full);
  padding: 4px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-chip:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.text-highlight {
  color: var(--suzuki-blue-light);
  font-weight: 700;
}

.items-list {
  background: #0d0f14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  max-height: 140px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.item-row:last-child {
  border-bottom: none;
}

.item-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--suzuki-blue-light);
}

.item-text {
  font-size: 0.85rem;
  color: #e2e8f0;
  flex: 1;
}

.btn-delete-item {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px;
}
.btn-delete-item:hover {
  color: #ff6b6b;
}

.add-item-bar {
  display: flex;
  gap: 8px;
}

.form-input-sm {
  padding: 8px 12px;
  font-size: 0.85rem;
}

.image-upload-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}

.upload-trigger:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.file-hidden {
  display: none;
}

.image-preview {
  position: relative;
  max-width: 140px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.image-preview img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
}

.btn-remove-img {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #ff6b6b;
  border: none;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
</style>
