<script setup>
import { ref, computed } from 'vue'
import { useMotoStore, getExplicitScheduleMileageFromTitle } from '../stores/motoStore'
import { compressImageFile } from '../services/api'
import { X, Wrench, Check, Plus, Trash2, Camera, Calendar } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const props = defineProps({
  presetSchedule: {
    type: Object,
    default: null
  },
  editLog: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])
const store = useMotoStore()

const isEditMode = computed(() => !!props.editLog)
const isSaving = ref(false)

// 取得今天與昨天 YYYY-MM-DD (以本地時區為準，避免 UTC 時差偏移)
const toLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const getTodayStr = () => toLocalDateStr(new Date())
const getYesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalDateStr(d)
}

// 決定初始預設排程：若無外部傳入 presetSchedule，且非編輯模式，自動對應當前待保養排程以確保首頁與保養頁籤同步
const defaultSchedule = props.editLog
  ? null
  : (props.presetSchedule || store.nextMaintenance || null)

const date = ref(props.editLog?.date || getTodayStr())
const odometer = ref(
  props.editLog
    ? props.editLog.odometer
    : (props.presetSchedule
        ? props.presetSchedule.mileage
        : (store.currentOdometer > 0 ? store.currentOdometer : (defaultSchedule?.mileage || 500)))
)
const title = ref(
  props.editLog
    ? props.editLog.title
    : (defaultSchedule ? defaultSchedule.title : `${store.currentOdometer || 500} km 定期保養`)
)
const selectedScheduleMileage = ref(
  props.editLog
    ? (props.editLog.scheduleMileage || getExplicitScheduleMileageFromTitle(props.editLog.title) || null)
    : (defaultSchedule?.mileage || null)
)
const shopName = ref(props.editLog ? (props.editLog.shopName || props.editLog.shop || 'SUZUKI 旗艦重車/車行') : 'SUZUKI 旗艦重車/車行')
const cost = ref(
  props.editLog
    ? props.editLog.cost
    : (defaultSchedule?.estimatedCost ?? 350)
)
const note = ref(props.editLog?.note || '')
const receiptImage = ref(props.editLog?.receiptImage || '')

// 預設項目清單
const items = ref(
  props.editLog && Array.isArray(props.editLog.items)
    ? props.editLog.items.map(i => (typeof i === 'string' ? i : i.name))
    : (defaultSchedule && Array.isArray(defaultSchedule.items)
        ? defaultSchedule.items.map(i => (typeof i === 'string' ? i : i.name))
        : ['更換原廠機油 (650cc)', '更換原廠齒輪油 (50cc)', '清潔機油濾網與胎壓點檢'])
)

const newItemText = ref('')

const setDateToday = () => { date.value = getTodayStr() }
const setDateYesterday = () => { date.value = getYesterdayStr() }

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
  selectedScheduleMileage.value = schedule.mileage
  if (!isEditMode.value) {
    odometer.value = schedule.mileage
  }
  title.value = schedule.title
  cost.value = schedule.estimatedCost || 350
  items.value = schedule.items.map(i => (typeof i === 'string' ? i : i.name))
}

// 照片上傳處理 (自動壓縮轉 Base64 離線與雲端儲存)
const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    alert('照片請小於 10MB')
    return
  }
  try {
    receiptImage.value = await compressImageFile(file)
  } catch (err) {
    console.error('圖片壓縮失敗:', err)
  }
}

const save = async () => {
  if (isSaving.value) return
  if (odometer.value === '' || odometer.value === null || Number(odometer.value) < 0 || !title.value.trim()) {
    alert('請填寫保養里程與標題')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      date: date.value || getTodayStr(),
      odometer: Number(odometer.value),
      title: title.value.trim(),
      scheduleMileage: selectedScheduleMileage.value || getExplicitScheduleMileageFromTitle(title.value),
      shopName: shopName.value.trim() || 'SUZUKI 旗艦重車/車行',
      cost: Number(cost.value) || 0,
      items: [...items.value],
      note: note.value,
      receiptImage: receiptImage.value
    }

    let savedLog = null
    if (isEditMode.value && props.editLog?.id) {
      savedLog = await store.updateMaintenanceLog(props.editLog.id, payload)
    } else {
      savedLog = await store.addMaintenanceLog(payload)
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 }
      })
    }

    emit('saved', savedLog)
    emit('close')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div class="title-with-icon">
          <Wrench :size="20" class="icon-red" />
          <h3>{{ isEditMode ? '編輯車輛保養紀錄' : '記錄車輛保養' }}</h3>
        </div>
        <button type="button" class="btn-close" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 官方範本快速選取 -->
        <div class="template-selector">
          <span class="template-label">SUI 125 官方原廠里程快捷套用：</span>
          <div class="template-chips">
            <button
              v-for="s in store.schedules"
              :key="s.mileage"
              type="button"
              class="btn-chip"
              :class="{ active: selectedScheduleMileage === s.mileage }"
              @click="applyOfficialTemplate(s)"
            >
              {{ s.mileage.toLocaleString() }}km
            </button>
          </div>
        </div>

        <!-- 1. 保養日期 (獨立全寬列，防止行動裝置日期選擇器與里程欄位重疊) -->
        <div class="form-group">
          <div class="label-with-actions">
            <label class="form-label"><Calendar :size="14" /> 保養日期</label>
            <div class="date-quick-btns">
              <button
                type="button"
                class="btn-quick-date"
                :class="{ active: date === getTodayStr() }"
                @click="setDateToday"
              >
                今天
              </button>
              <button
                type="button"
                class="btn-quick-date"
                :class="{ active: date === getYesterdayStr() }"
                @click="setDateYesterday"
              >
                昨天
              </button>
            </div>
          </div>
          <div class="date-input-shell">
            <input v-model="date" type="date" class="date-input-native" />
          </div>
        </div>

        <!-- 2. 保養總里程 & 保養總花費 (雙欄自適應 Grid) -->
        <div class="form-row-two">
          <div class="form-group">
            <label class="form-label">保養總里程 (KM) *</label>
            <input
              v-model="odometer"
              type="number"
              inputmode="numeric"
              class="form-input text-highlight"
              placeholder="如 500、2000 或 3500"
            />
          </div>
          <div class="form-group">
            <label class="form-label">保養總花費 (NT$)</label>
            <input
              v-model="cost"
              type="number"
              inputmode="numeric"
              class="form-input"
              placeholder="如 350"
            />
          </div>
        </div>

        <!-- 3. 保養主題名稱 (獨立全寬列，完整顯示標題) -->
        <div class="form-group">
          <label class="form-label">保養主題名稱 *</label>
          <input
            v-model="title"
            type="text"
            class="form-input"
            placeholder="例如：500 km 新車首次定保 / 2,000 km 強化保養"
          />
        </div>

        <!-- 4. 保養車行 / 技師 -->
        <div class="form-group">
          <label class="form-label">保養車行 / 技師</label>
          <input
            v-model="shopName"
            type="text"
            class="form-input"
            placeholder="例如：SUZUKI 台鈴經銷店"
          />
        </div>

        <!-- 5. 施工項目清單 -->
        <div class="form-group">
          <label class="form-label">本次保養施工/更換項目 ({{ items.length }}項)</label>
          <div class="items-list">
            <div v-for="(item, idx) in items" :key="idx" class="item-row">
              <span class="item-dot"></span>
              <span class="item-text">{{ item }}</span>
              <button type="button" class="btn-delete-item" @click="removeItem(idx)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <div class="add-item-bar">
            <input
              v-model="newItemText"
              type="text"
              class="form-input form-input-sm add-item-input"
              placeholder="新增自訂項目 (如更換空濾、火星塞...)"
              @keyup.enter="addItem"
            />
            <button type="button" class="btn btn-secondary btn-sm btn-add-item" @click="addItem">
              <Plus :size="16" />
              <span>新增</span>
            </button>
          </div>
        </div>

        <!-- 6. 單據/施工照片上傳 -->
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
              <button type="button" class="btn-remove-img" @click="receiptImage = ''">移除</button>
            </div>
          </div>
        </div>

        <!-- 7. 技師備註 / 心得 -->
        <div class="form-group">
          <label class="form-label">技師備註 / 心得</label>
          <textarea
            v-model="note"
            class="form-textarea"
            rows="2"
            placeholder="例如：機油鐵屑少、胎壓已充填、建議 4000km 清潔空濾"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="emit('close')">取消</button>
        <button type="button" class="btn btn-primary" :disabled="isSaving" @click="save">
          <Check :size="18" />
          <span>{{ isSaving ? '儲存中...' : (isEditMode ? '儲存修改' : '完成並儲存保養紀錄') }}</span>
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
  white-space: nowrap;
}

.btn-chip:hover,
.btn-chip.active {
  background: var(--suzuki-blue);
  border-color: #38bdf8;
  color: #fff;
}

.label-with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.label-with-actions .form-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 0;
}

.date-quick-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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
  white-space: nowrap;
}

.btn-quick-date.active,
.btn-quick-date:hover {
  background: #005BAC;
  color: #fff;
  border-color: #38bdf8;
}

.date-input {
  color-scheme: dark;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: block;
}

.form-row-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

@media (max-width: 360px) {
  .form-row-two {
    grid-template-columns: 1fr;
    gap: 0;
  }
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
  flex-shrink: 0;
}

.item-text {
  font-size: 0.85rem;
  color: #e2e8f0;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.btn-delete-item {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px;
  flex-shrink: 0;
}
.btn-delete-item:hover {
  color: #ff6b6b;
}

.add-item-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.add-item-input {
  flex: 1 1 0%;
  min-width: 0;
  width: auto;
  padding: 8px 12px;
  font-size: 0.85rem;
}

.btn-add-item {
  flex-shrink: 0;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 14px;
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

.modal-footer .btn {
  white-space: nowrap;
}
</style>
