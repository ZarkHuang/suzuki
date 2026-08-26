<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { 
  Wrench, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  ShieldCheck, 
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-vue-next'

import ModalAddMaint from '../components/ModalAddMaint.vue'

const store = useMotoStore()
const showAddModal = ref(false)
const selectedPreset = ref(null)
const activeTab = ref('schedule') // 'schedule' | 'history' | 'parts'

// 每次進入保養畫面，自動從 MySQL 雲端刷新最新數據
onMounted(() => {
  store.initSyncWithBackend()
})


const currentOdo = computed(() => store.currentOdometer)
const schedules = computed(() => store.schedules)
const maintenanceLogs = computed(() => store.maintenanceLogs)
const partsStatus = computed(() => store.partsStatusList)
const totalMaintCost = computed(() => store.totalExpenses.maintenance)

// 判斷該排程是否已經做過
const isScheduleCompleted = (mileage) => {
  return maintenanceLogs.value.some(log => Math.abs(log.odometer - mileage) <= 150)
}

// 快速點選特定排程進行保養紀錄
const startMaintForSchedule = (schedule) => {
  selectedPreset.value = schedule
  showAddModal.value = true
}

const openGeneralAddModal = () => {
  selectedPreset.value = null
  showAddModal.value = true
}

const deleteLog = (id) => {
  if (confirm('確定要刪除這筆保養紀錄嗎？')) {
    store.deleteMaintenanceLog(id)
  }
}
</script>

<template>
  <div class="app-container maint-page">
    <!-- 頁面標頭與新增按鈕 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">保養與零件管理</h2>
        <p class="page-subtitle">Suzuki SUI 125 原廠規範與耗材壽命</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openGeneralAddModal">
        <Plus :size="16" /> 記錄保養
      </button>
    </div>

    <!-- 頂部分頁切換 Tabs -->
    <div class="maint-tabs">
      <button 
        class="tab-item" 
        :class="{ active: activeTab === 'schedule' }"
        @click="activeTab = 'schedule'"
      >
        <Clock :size="16" /> 官方定保時程
      </button>
      <button 
        class="tab-item" 
        :class="{ active: activeTab === 'parts' }"
        @click="activeTab = 'parts'"
      >
        <Layers :size="16" /> 零件耗材壽命
      </button>
      <button 
        class="tab-item" 
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        <ShieldCheck :size="16" /> 保養歷史 ({{ maintenanceLogs.length }})
      </button>
    </div>

    <!-- Tab 1: 官方定保排程清單 -->
    <div v-if="activeTab === 'schedule'" class="schedule-tab-content">
      <div class="info-banner">
        <Info :size="16" class="icon-blue" />
        <span>SUI 125 原廠建議首保 300km，其後每 1,000~4,000km 定期點檢。</span>
      </div>

      <div class="schedule-list">
        <div 
          v-for="item in schedules" 
          :key="item.mileage" 
          class="card schedule-card"
          :class="{
            'completed-card': isScheduleCompleted(item.mileage),
            'upcoming-card': !isScheduleCompleted(item.mileage) && item.mileage <= currentOdo + 300,
            'future-card': !isScheduleCompleted(item.mileage) && item.mileage > currentOdo + 300
          }"
        >
          <div class="schedule-card-header">
            <div class="milestone-badge">
              <span class="milestone-num stat-number">{{ item.mileage.toLocaleString() }}</span>
              <span class="milestone-unit">KM</span>
            </div>
            
            <div class="schedule-status-badge">
              <span v-if="isScheduleCompleted(item.mileage)" class="badge badge-green">
                <CheckCircle2 :size="12" /> 已完成
              </span>
              <span v-else-if="item.mileage <= currentOdo" class="badge badge-red">
                <AlertCircle :size="12" /> 已達里程需保養
              </span>
              <span v-else-if="item.mileage <= currentOdo + 300" class="badge badge-amber">
                即將到達 (剩 {{ item.mileage - currentOdo }}km)
              </span>
              <span v-else class="badge badge-neutral">
                待執行
              </span>
            </div>
          </div>

          <div class="schedule-body">
            <h4 class="schedule-title">{{ item.title }}</h4>
            <p class="schedule-desc">{{ item.description }}</p>

            <div class="maint-items-tags">
              <span 
                v-for="(sub, sIdx) in item.items" 
                :key="sIdx"
                class="sub-item-pill"
                :class="{ 'pill-required': sub.required }"
              >
                {{ typeof sub === 'string' ? sub : sub.name }}
              </span>
            </div>
          </div>

          <div class="schedule-card-footer">
            <span class="est-cost">預估花費: NT$ {{ item.estimatedCost || 350 }}</span>
            <button 
              v-if="!isScheduleCompleted(item.mileage)"
              class="btn btn-secondary btn-sm"
              @click="startMaintForSchedule(item)"
            >
              <Wrench :size="14" class="icon-blue" /> 記錄此項保養
            </button>
            <span v-else class="done-check-text">
              <CheckCircle2 :size="14" /> 原廠保養已完成
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: 零件耗材壽命儀表 -->
    <div v-if="activeTab === 'parts'" class="parts-tab-content">
      <div class="parts-grid">
        <div v-for="part in partsStatus" :key="part.name" class="card part-card">
          <div class="part-header">
            <div class="part-name-box">
              <span class="part-name">{{ part.name }}</span>
              <span class="part-cycle-text">週期 {{ part.intervalKm.toLocaleString() }} km</span>
            </div>
            <span 
              class="badge" 
              :class="{
                'badge-red': part.status === 'critical',
                'badge-amber': part.status === 'warning',
                'badge-green': part.status === 'good'
              }"
            >
              {{ part.status === 'critical' ? '建議更換' : part.status === 'warning' ? '注意檢查' : '正常' }}
            </span>
          </div>

          <!-- 耗損進度條 -->
          <div class="part-progress-track">
            <div 
              class="part-progress-fill"
              :class="{
                'fill-red': part.status === 'critical',
                'fill-amber': part.status === 'warning'
              }"
              :style="{ width: `${Math.min(100, part.usageRatio * 100)}%` }"
            ></div>
          </div>

          <div class="part-footer">
            <span class="used-text">已使用 <strong>{{ part.distanceUsed }}</strong> km</span>
            <span class="rem-text">剩餘約 <strong>{{ part.remainingKm }}</strong> km</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: 保養歷史清單 -->
    <div v-if="activeTab === 'history'" class="history-tab-content">
      <div class="total-maint-banner card">
        <div class="banner-title">保養總花費累計</div>
        <div class="banner-val stat-number text-red">NT$ {{ totalMaintCost.toLocaleString() }}</div>
      </div>

      <div v-if="maintenanceLogs.length > 0" class="history-cards">
        <div v-for="log in maintenanceLogs" :key="log.id" class="card maint-history-card">
          <div class="history-top">
            <div>
              <div class="maint-title-text">{{ log.title }}</div>
              <div class="maint-meta-text">{{ log.date }} · 里程 {{ log.odometer.toLocaleString() }} km · {{ log.shopName }}</div>
            </div>
            <div class="history-actions">
              <span class="maint-cost-val stat-number">NT${{ log.cost }}</span>
              <button class="btn-delete" @click="deleteLog(log.id)" title="刪除紀錄">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>

          <!-- 施工項目清單 -->
          <div v-if="log.items && log.items.length > 0" class="history-items">
            <div class="items-heading">施工更換項目：</div>
            <ul class="items-ul">
              <li v-for="(it, i) in log.items" :key="i">{{ typeof it === 'string' ? it : it.name }}</li>
            </ul>
          </div>

          <!-- 照片預覽 -->
          <div v-if="log.receiptImage" class="history-receipt-img">
            <img :src="log.receiptImage" alt="保養工單照片" />
          </div>

          <div v-if="log.note" class="history-note">
            技師備註：{{ log.note }}
          </div>
        </div>
      </div>

      <div v-else class="empty-state card">
        <p>目前尚無保養紀錄，點擊「記錄保養」來儲存第一筆保養工單吧！</p>
      </div>
    </div>

    <!-- Modal -->
    <ModalAddMaint 
      v-if="showAddModal" 
      :preset-schedule="selectedPreset"
      @close="showAddModal = false" 
    />
  </div>
</template>

<style scoped>
.maint-page {
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

.maint-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  padding: 4px;
  gap: 4px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-item.active {
  background: var(--suzuki-blue);
  color: #fff;
  box-shadow: 0 2px 8px var(--suzuki-blue-glow);
}

.info-banner {
  background: rgba(0, 91, 172, 0.1);
  border: 1px solid rgba(0, 91, 172, 0.25);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 12px;
}

.icon-blue { color: var(--suzuki-blue-light); }

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.schedule-card.completed-card {
  opacity: 0.75;
  border-color: rgba(16, 185, 129, 0.3);
}

.schedule-card.upcoming-card {
  border-color: var(--suzuki-blue-light);
  box-shadow: 0 0 15px var(--suzuki-blue-glow);
}

.schedule-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.milestone-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.milestone-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
}

.milestone-unit {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--suzuki-blue-light);
}

.schedule-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 4px;
}

.schedule-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.maint-items-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sub-item-pill {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.sub-item-pill.pill-required {
  background: rgba(0, 91, 172, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(0, 91, 172, 0.3);
}

.schedule-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 10px;
  margin-top: 4px;
}

.est-cost {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.done-check-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #34d399;
  font-weight: 600;
}

/* 零件壽命 */
.parts-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.part-card {
  padding: 14px;
}

.part-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.part-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  display: block;
}

.part-cycle-text {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.part-progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 8px;
}

.part-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #38bdf8);
  border-radius: 99px;
}

.part-progress-fill.fill-amber {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.part-progress-fill.fill-red {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.part-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.part-footer strong {
  color: #e2e8f0;
}

/* 保養歷史清單 */
.total-maint-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  margin-bottom: 12px;
}

.banner-title {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.text-red {
  color: var(--suzuki-red);
  font-size: 1.35rem;
  font-weight: 800;
}

.history-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.maint-history-card {
  padding: 16px;
}

.history-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.maint-title-text {
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
}

.maint-meta-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.maint-cost-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ff6b6b;
}

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-delete:hover { color: #ff6b6b; }

.history-items {
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #cbd5e1;
  margin-bottom: 8px;
}

.items-heading {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.items-ul {
  padding-left: 16px;
  margin: 0;
}

.history-receipt-img {
  max-width: 140px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: 8px;
}

.history-receipt-img img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  display: block;
}

.history-note {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-top: 6px;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 24px;
}
</style>
