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
  Pencil,
  ShieldCheck, 
  Calendar,
  Layers,
  Info
} from 'lucide-vue-next'

import ModalAddMaint from '../components/ModalAddMaint.vue'

const store = useMotoStore()
const showAddModal = ref(false)
const selectedPreset = ref(null)
const editingLog = ref(null)
const activeTab = ref('schedule') // 'schedule' | 'history' | 'parts'

// 進入保養畫面時，精準同步保養日誌與車輛里程
onMounted(() => {
  store.syncMaintenanceLogs()
  store.syncVehicle()
})

const currentOdo = computed(() => store.currentOdometer)
const schedules = computed(() => store.schedules)
const maintenanceLogs = computed(() => store.maintenanceLogs)
const latestMaintLog = computed(() => store.maintenanceLogs[0] || null)
const partsStatus = computed(() => store.partsStatusList)
const totalMaintCost = computed(() => store.totalExpenses.maintenance)

// 取得該官方排程對應的已完成保養紀錄
const getCompletedLog = (mileage) => {
  return store.getScheduleCompletedLog(mileage)
}

// 判斷該排程是否已經做過
const isScheduleCompleted = (mileage) => {
  return !!getCompletedLog(mileage)
}

// 快速點選特定排程進行保養紀錄
const startMaintForSchedule = (schedule) => {
  const existing = getCompletedLog(schedule.mileage)
  if (existing) {
    openEditModal(existing)
    return
  }
  editingLog.value = null
  selectedPreset.value = schedule
  showAddModal.value = true
}

const openGeneralAddModal = () => {
  editingLog.value = null
  selectedPreset.value = null
  showAddModal.value = true
}

const openEditModal = (log) => {
  selectedPreset.value = null
  editingLog.value = log
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingLog.value = null
  selectedPreset.value = null
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
      <!-- 最新一筆保養摘要卡 (與首頁新增保養即時同步，可直接點擊修改日期或內容) -->
      <div v-if="latestMaintLog" class="card latest-maint-summary-card">
        <div class="latest-summary-top">
          <div class="latest-badge-row">
            <span class="badge badge-green"><CheckCircle2 :size="12" /> 最近保養紀錄</span>
            <button
              type="button"
              class="date-edit-pill"
              title="點擊修改保養日期與內容"
              @click="openEditModal(latestMaintLog)"
            >
              <Calendar :size="12" />
              <span>{{ latestMaintLog.date }}</span>
              <Pencil :size="11" />
            </button>
          </div>
          <div class="latest-summary-actions">
            <button type="button" class="btn-inline-edit" @click="openEditModal(latestMaintLog)">
              <Pencil :size="13" /> 編輯紀錄
            </button>
            <button type="button" class="btn-inline-link" @click="activeTab = 'history'">
              全部 ({{ maintenanceLogs.length }})
            </button>
          </div>
        </div>
        <div class="latest-summary-main" @click="openEditModal(latestMaintLog)">
          <div>
            <div class="latest-title">{{ latestMaintLog.title }}</div>
            <div class="latest-meta">
              保養里程 {{ Number(latestMaintLog.odometer).toLocaleString() }} km · {{ latestMaintLog.shopName }}
            </div>
          </div>
          <div class="latest-cost stat-number">NT$ {{ latestMaintLog.cost }}</div>
        </div>
      </div>

      <div class="info-banner">
        <Info :size="16" class="icon-blue" />
        <span>Suzuki SUI 125 原廠規範：新車首保 500km，其後機油每 2,000km、齒輪油每 4,000km、重要耗材每 8,000 / 16,000km 定期更換。</span>
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
              <span 
                v-if="getCompletedLog(item.mileage)" 
                class="badge badge-green clickable-badge"
                title="點擊編輯此筆保養紀錄與日期"
                @click="openEditModal(getCompletedLog(item.mileage))"
              >
                <CheckCircle2 :size="12" /> 已完成 · {{ getCompletedLog(item.mileage).date }}
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

            <!-- 若已完成，顯示實際紀錄之日期、里程與花費，點擊可直接編輯 -->
            <div 
              v-if="getCompletedLog(item.mileage)" 
              class="completed-record-box"
              @click="openEditModal(getCompletedLog(item.mileage))"
            >
              <div class="completed-record-info">
                <Calendar :size="14" class="icon-green" />
                <span>
                  實際保養日期：<strong>{{ getCompletedLog(item.mileage).date }}</strong> · 
                  里程 <strong>{{ Number(getCompletedLog(item.mileage).odometer).toLocaleString() }} km</strong> · 
                  實付 <strong>NT$ {{ getCompletedLog(item.mileage).cost }}</strong>
                </span>
              </div>
              <span class="completed-edit-hint">
                <Pencil :size="12" /> 修改日期/內容
              </span>
            </div>

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
            <span class="est-cost">
              {{ getCompletedLog(item.mileage) ? `實際花費: NT$ ${getCompletedLog(item.mileage).cost}` : `預估花費: NT$ ${item.estimatedCost || 350}` }}
            </span>
            <button 
              v-if="!isScheduleCompleted(item.mileage)"
              class="btn btn-secondary btn-sm"
              @click="startMaintForSchedule(item)"
            >
              <Wrench :size="14" class="icon-blue" /> 記錄此項保養
            </button>
            <div v-else class="completed-footer-actions">
              <span class="done-check-text">
                <CheckCircle2 :size="14" /> 已完成
              </span>
              <button 
                type="button"
                class="btn btn-secondary btn-sm"
                @click="openEditModal(getCompletedLog(item.mileage))"
              >
                <Pencil :size="13" /> 編輯紀錄
              </button>
            </div>
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
            <div class="history-title-group" @click="openEditModal(log)">
              <div class="maint-title-text">{{ log.title }}</div>
              <div class="maint-meta-text">
                <button type="button" class="meta-date-btn" title="點擊修改保養日期">
                  <Calendar :size="12" /> {{ log.date }} <Pencil :size="11" />
                </button>
                <span>· 里程 {{ Number(log.odometer).toLocaleString() }} km · {{ log.shopName }}</span>
              </div>
            </div>
            <div class="history-actions">
              <span class="maint-cost-val stat-number">NT${{ log.cost }}</span>
              <button class="btn-edit" @click="openEditModal(log)" title="編輯保養紀錄">
                <Pencil :size="15" />
              </button>
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

    <!-- 新增 / 編輯保養 Modal -->
    <ModalAddMaint 
      v-if="showAddModal" 
      :preset-schedule="selectedPreset"
      :edit-log="editingLog"
      @close="closeModal" 
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
  gap: 10px;
}

.page-header .btn {
  white-space: nowrap;
  flex-shrink: 0;
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
  white-space: nowrap;
}

.tab-item.active {
  background: var(--suzuki-blue);
  color: #fff;
  box-shadow: 0 2px 8px var(--suzuki-blue-glow);
}

/* 最近保養摘要卡 */
.latest-maint-summary-card {
  border-left: 4px solid #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(22, 26, 35, 0.92) 100%);
  padding: 14px 16px;
  margin-bottom: 12px;
}

.latest-summary-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.latest-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.date-edit-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.date-edit-pill:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

.latest-summary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-inline-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-inline-edit:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

.btn-inline-link {
  background: transparent;
  border: none;
  color: var(--suzuki-blue-light);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.latest-summary-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.latest-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
}

.latest-meta {
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.latest-cost {
  font-size: 1.1rem;
  font-weight: 800;
  color: #34d399;
  white-space: nowrap;
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
.icon-green { color: #34d399; flex-shrink: 0; }

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
  border-color: rgba(16, 185, 129, 0.35);
}

.schedule-card.upcoming-card {
  border-color: var(--suzuki-blue-light);
  box-shadow: 0 0 15px var(--suzuki-blue-glow);
}

.schedule-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.clickable-badge {
  cursor: pointer;
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

.completed-record-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 0.78rem;
  color: #cbd5e1;
  cursor: pointer;
  transition: background 0.15s ease;
}

.completed-record-box:hover {
  background: rgba(16, 185, 129, 0.18);
}

.completed-record-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.completed-record-info strong {
  color: #fff;
}

.completed-edit-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #38bdf8;
  font-weight: 600;
  font-size: 0.74rem;
  white-space: nowrap;
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
  gap: 8px;
}

.est-cost {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.completed-footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 10px;
  margin-bottom: 10px;
}

.history-title-group {
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.maint-title-text {
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
}

.maint-meta-text {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.meta-date-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.meta-date-btn:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.maint-cost-val {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ff6b6b;
}

.btn-edit,
.btn-delete {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-edit:hover {
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(0, 91, 172, 0.2);
}

.btn-delete:hover {
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.4);
  background: rgba(230, 0, 18, 0.15);
}

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
