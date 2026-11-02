<script setup>
import { ref, computed } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { compressImageFile } from '../services/api'
import { MOD_CATEGORIES } from '../constants/sui125'
import { X, Sparkles, Check, Camera, Star, Calendar } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const props = defineProps({
  editMod: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])
const store = useMotoStore()

const isEditMode = computed(() => !!props.editMod)
const isSaving = ref(false)

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

const title = ref(props.editMod?.title || '')
const category = ref(props.editMod?.category || 'exterior')
const cost = ref(props.editMod ? props.editMod.cost : '')
const boughtFrom = ref(props.editMod?.boughtFrom || '')
const odometer = ref(props.editMod ? props.editMod.odometer : store.currentOdometer)
const date = ref(props.editMod?.date || getTodayStr())
const rating = ref(props.editMod?.rating || 5)
const note = ref(props.editMod?.note || '')
const imageUrl = ref(props.editMod?.imageUrl || '')

const setDateToday = () => { date.value = getTodayStr() }
const setDateYesterday = () => { date.value = getYesterdayStr() }

const handleImageUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    alert('照片請小於 10MB')
    return
  }
  try {
    imageUrl.value = await compressImageFile(file)
  } catch (err) {
    console.error('圖片壓縮失敗:', err)
  }
}

const save = async () => {
  if (isSaving.value) return
  if (!title.value.trim()) {
    alert('請填寫改裝品項名稱')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      title: title.value.trim(),
      category: category.value,
      cost: Number(cost.value) || 0,
      boughtFrom: boughtFrom.value,
      odometer: Number(odometer.value) || store.currentOdometer,
      date: date.value || getTodayStr(),
      rating: rating.value,
      note: note.value,
      imageUrl: imageUrl.value
    }

    let mod = null
    if (isEditMode.value && props.editMod?.id) {
      mod = await store.updateModification(props.editMod.id, payload)
    } else {
      mod = await store.addModification(payload)
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      })
    }

    emit('saved', mod)
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
          <Sparkles :size="20" class="icon-amber" />
          <h3>{{ isEditMode ? '編輯改裝品項' : '記錄改裝品項' }}</h3>
        </div>
        <button type="button" class="btn-close" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">改裝品項名稱 *</label>
          <input v-model="title" type="text" class="form-input text-highlight" placeholder="例如：SUI 專用日系不鏽鋼後貨架" autofocus />
        </div>

        <!-- 安裝日期 (獨立全寬列) -->
        <div class="form-group">
          <div class="label-with-actions">
            <label class="form-label"><Calendar :size="14" /> 安裝日期</label>
            <div class="date-quick-btns">
              <button type="button" class="btn-quick-date" :class="{ active: date === getTodayStr() }" @click="setDateToday">今天</button>
              <button type="button" class="btn-quick-date" :class="{ active: date === getYesterdayStr() }" @click="setDateYesterday">昨天</button>
            </div>
          </div>
          <input v-model="date" type="date" class="form-input date-input" />
        </div>

        <div class="form-row-two">
          <div class="form-group">
            <label class="form-label">分類類別</label>
            <select v-model="category" class="form-select">
              <option v-for="cat in MOD_CATEGORIES" :key="cat.id" :value="cat.id">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">購入金額 (NT$)</label>
            <input v-model="cost" type="number" inputmode="numeric" class="form-input" placeholder="如 1800" />
          </div>
        </div>

        <div class="form-row-two">
          <div class="form-group">
            <label class="form-label">購買處 / 通路</label>
            <input v-model="boughtFrom" type="text" class="form-input" placeholder="例如：蝦皮 / 實體改裝店" />
          </div>
          <div class="form-group">
            <label class="form-label">安裝時里程 (KM)</label>
            <input v-model="odometer" type="number" inputmode="numeric" class="form-input" placeholder="如 350" />
          </div>
        </div>

        <!-- 滿意度評分 -->
        <div class="form-group">
          <label class="form-label">改裝滿意度評分</label>
          <div class="rating-stars">
            <button 
              v-for="s in 5" 
              :key="s" 
              type="button" 
              class="star-btn"
              :class="{ 'star-active': s <= rating }"
              @click="rating = s"
            >
              <Star :size="22" :fill="s <= rating ? '#f59e0b' : 'none'" />
            </button>
            <span class="rating-text">{{ rating }} 顆星</span>
          </div>
        </div>

        <!-- 照片上傳 -->
        <div class="form-group">
          <label class="form-label">改裝完工實裝照 (選填)</label>
          <div class="image-upload-box">
            <label class="upload-trigger">
              <input type="file" accept="image/*" class="file-hidden" @change="handleImageUpload" />
              <Camera :size="20" />
              <span>{{ imageUrl ? '點擊更換照片' : '上傳實裝美照 / 完工照' }}</span>
            </label>
            <div v-if="imageUrl" class="image-preview">
              <img :src="imageUrl" alt="改裝照片預覽" />
              <button type="button" class="btn-remove-img" @click="imageUrl = ''">移除</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">改裝心得 / 安裝注意事項</label>
          <textarea v-model="note" class="form-textarea" rows="2" placeholder="例如：直上免修，後座載人載物超方便！"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="emit('close')">取消</button>
        <button type="button" class="btn btn-primary" :disabled="isSaving" @click="save">
          <Check :size="18" /> {{ isSaving ? '儲存中...' : (isEditMode ? '儲存修改' : '儲存改裝日誌') }}
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

.icon-amber {
  color: #f59e0b;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
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
  color: #f59e0b;
  font-weight: 600;
}

.rating-stars {
  display: flex;
  align-items: center;
  gap: 6px;
}

.star-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #475569;
  padding: 2px;
  transition: transform 0.15s ease;
}

.star-btn:hover {
  transform: scale(1.15);
}

.star-active {
  color: #f59e0b;
}

.rating-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-left: 8px;
  font-weight: 600;
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

.file-hidden {
  display: none;
}

.image-preview {
  position: relative;
  max-width: 160px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.image-preview img {
  width: 100%;
  height: 100px;
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
