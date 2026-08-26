<script setup>
import { ref } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { MOD_CATEGORIES } from '../constants/sui125'
import { X, Sparkles, Check, Camera, Star } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const emit = defineEmits(['close', 'saved'])
const store = useMotoStore()

const title = ref('')
const category = ref('exterior')
const cost = ref('')
const boughtFrom = ref('')
const odometer = ref(store.currentOdometer)
const date = ref(new Date().toISOString().split('T')[0])
const rating = ref(5)
const note = ref('')
const imageUrl = ref('')

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert('照片請小於 5MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    imageUrl.value = event.target.result
  }
  reader.readAsDataURL(file)
}

const save = () => {
  if (!title.value.trim()) {
    alert('請填寫改裝品項名稱')
    return
  }

  const mod = store.addModification({
    title: title.value.trim(),
    category: category.value,
    cost: Number(cost.value) || 0,
    boughtFrom: boughtFrom.value,
    odometer: Number(odometer.value) || store.currentOdometer,
    date: date.value,
    rating: rating.value,
    note: note.value,
    imageUrl: imageUrl.value
  })

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 }
  })

  emit('saved', mod)
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div class="title-with-icon">
          <Sparkles :size="20" class="icon-amber" />
          <h3>記錄改裝品項</h3>
        </div>
        <button class="btn-close" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">改裝品項名稱 *</label>
          <input v-model="title" type="text" class="form-input text-highlight" placeholder="例如：SUI 專用日系不鏽鋼後貨架" autofocus />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">分類類別</label>
            <select v-model="category" class="form-select">
              <option v-for="cat in MOD_CATEGORIES" :key="cat.id" :value="cat.id">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">購入金額 (NT$)</label>
            <input v-model="cost" type="number" class="form-input" placeholder="如 1800" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">購買處 / 通路</label>
            <input v-model="boughtFrom" type="text" class="form-input" placeholder="例如：蝦皮 / 實體改裝店" />
          </div>
          <div class="form-group flex-1">
            <label class="form-label">安裝時里程 (KM)</label>
            <input v-model="odometer" type="number" class="form-input" placeholder="如 350" />
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
              <button class="btn-remove-img" @click="imageUrl = ''">移除</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">改裝心得 / 安裝注意事項</label>
          <textarea v-model="note" class="form-textarea" rows="2" placeholder="例如：直上免修，後座載人載物超方便！"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="save">
          <Check :size="18" /> 儲存改裝日誌
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

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
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
</style>
