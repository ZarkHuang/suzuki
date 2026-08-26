<script setup>
import { ref, computed } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { MOD_CATEGORIES } from '../constants/sui125'
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Star, 
  ShoppingBag, 
  Tag, 
  Image as ImageIcon,
  DollarSign,
  Layers,
  X
} from 'lucide-vue-next'

import ModalAddMod from '../components/ModalAddMod.vue'

const store = useMotoStore()
const showAddModal = ref(false)
const selectedCategory = ref('all')
const previewImage = ref('')

const modifications = computed(() => store.modifications)
const totalModCost = computed(() => store.totalExpenses.modifications)

const filteredMods = computed(() => {
  if (selectedCategory.value === 'all') return modifications.value
  return modifications.value.filter(m => m.category === selectedCategory.value)
})

const getCategoryLabel = (catId) => {
  const c = MOD_CATEGORIES.find(item => item.id === catId)
  return c ? c.label.split(' ')[0] : '改裝'
}

const deleteMod = (id) => {
  if (confirm('確定要刪除這筆改裝日誌嗎？')) {
    store.deleteModification(id)
  }
}
</script>

<template>
  <div class="app-container mods-page">
    <!-- 頁面標頭與新增按鈕 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">SUI 125 改裝日誌</h2>
        <p class="page-subtitle">風格升級、配件清單與改裝心得記錄</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="showAddModal = true">
        <Plus :size="16" /> 記錄改裝
      </button>
    </div>

    <!-- 改裝總花費統計卡 -->
    <div class="card mod-stat-card">
      <div class="stat-inner">
        <div>
          <div class="stat-title">改裝總投入金額</div>
          <div class="stat-count">共 {{ modifications.length }} 件改裝升級品項</div>
        </div>
        <div class="stat-number text-amber">
          NT$ {{ totalModCost.toLocaleString() }}
        </div>
      </div>
    </div>

    <!-- 分類篩選 Bar -->
    <div class="category-filter-scroll">
      <button 
        class="filter-chip" 
        :class="{ active: selectedCategory === 'all' }"
        @click="selectedCategory = 'all'"
      >
        全部品項 ({{ modifications.length }})
      </button>
      <button 
        v-for="cat in MOD_CATEGORIES" 
        :key="cat.id" 
        class="filter-chip"
        :class="{ active: selectedCategory === cat.id }"
        @click="selectedCategory = cat.id"
      >
        {{ cat.label.split(' ')[0] }}
      </button>
    </div>

    <!-- 改裝日誌卡片清單 -->
    <div v-if="filteredMods.length > 0" class="mods-grid">
      <div v-for="mod in filteredMods" :key="mod.id" class="card mod-card">
        <!-- 照片封面 (如果有) -->
        <div v-if="mod.imageUrl" class="mod-image-cover" @click="previewImage = mod.imageUrl">
          <img :src="mod.imageUrl" :alt="mod.title" />
          <div class="image-zoom-hint">點擊放大</div>
        </div>

        <div class="mod-card-body">
          <div class="mod-top-row">
            <span class="badge badge-amber">{{ getCategoryLabel(mod.category) }}</span>
            <div class="mod-actions">
              <span class="mod-cost stat-number">NT${{ mod.cost.toLocaleString() }}</span>
              <button class="btn-delete" @click="deleteMod(mod.id)" title="刪除">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>

          <h3 class="mod-title">{{ mod.title }}</h3>

          <!-- 星等評價 -->
          <div class="mod-stars">
            <Star 
              v-for="s in 5" 
              :key="s" 
              :size="14" 
              :fill="s <= (mod.rating || 5) ? '#f59e0b' : 'none'" 
              :color="s <= (mod.rating || 5) ? '#f59e0b' : '#64748b'"
            />
            <span class="stars-val">{{ mod.rating || 5 }}.0</span>
          </div>

          <!-- 安裝資訊 -->
          <div class="mod-meta-grid">
            <div v-if="mod.boughtFrom" class="meta-item">
              <ShoppingBag :size="13" class="icon-muted" />
              <span>通路: {{ mod.boughtFrom }}</span>
            </div>
            <div class="meta-item">
              <Tag :size="13" class="icon-muted" />
              <span>安裝里程: {{ mod.odometer }} km · {{ mod.date }}</span>
            </div>
          </div>

          <!-- 心得文字 -->
          <p v-if="mod.note" class="mod-note">
            “{{ mod.note }}”
          </p>
        </div>
      </div>
    </div>

    <div v-else class="empty-state card">
      <p>目前尚無此分類的改裝紀錄，點擊「記錄改裝」開始打造專屬 SUI 125 吧！</p>
    </div>

    <!-- 照片放大檢視 Modal -->
    <div v-if="previewImage" class="modal-overlay" @click="previewImage = ''">
      <div class="lightbox-content">
        <button class="btn-close-lightbox" @click="previewImage = ''">
          <X :size="24" />
        </button>
        <img :src="previewImage" alt="改裝完工實裝大圖" />
      </div>
    </div>

    <!-- 新增改裝 Modal -->
    <ModalAddMod v-if="showAddModal" @close="showAddModal = false" />
  </div>
</template>

<style scoped>
.mods-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
}

.page-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.mod-stat-card {
  padding: 16px 20px;
}

.stat-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-title {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.stat-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.text-amber {
  color: #f59e0b;
  font-size: 1.6rem;
  font-weight: 800;
}

/* 分類滑動列 */
.category-filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.category-filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip.active {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}

/* 改裝清單 */
.mods-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mod-card {
  padding: 0;
  overflow: hidden;
}

.mod-image-cover {
  position: relative;
  width: 100%;
  height: 180px;
  background: #000;
  cursor: pointer;
  overflow: hidden;
}

.mod-image-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.mod-image-cover:hover img {
  transform: scale(1.03);
}

.image-zoom-hint {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.mod-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mod-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mod-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mod-cost {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
}

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-delete:hover { color: #ff6b6b; }

.mod-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
}

.mod-stars {
  display: flex;
  align-items: center;
  gap: 3px;
}

.stars-val {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 700;
  margin-left: 4px;
}

.mod-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.76rem;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.02);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-muted { color: var(--text-muted); }

.mod-note {
  font-size: 0.82rem;
  color: #cbd5e1;
  font-style: italic;
  margin-top: 4px;
  line-height: 1.4;
}

/* Lightbox 大圖檢視 */
.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.btn-close-lightbox {
  position: absolute;
  top: -40px;
  right: 0;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 24px;
}
</style>
