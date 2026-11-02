<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMotoStore } from '../stores/motoStore'
import { 
  Fuel, 
  Wrench, 
  Gauge, 
  Plus, 
  TrendingUp, 
  Sparkles, 
  AlertTriangle,
  ChevronRight,
  Zap,
  Calendar,
  Pencil
} from 'lucide-vue-next'

import ModalQuickOdo from '../components/ModalQuickOdo.vue'
import ModalAddFuel from '../components/ModalAddFuel.vue'
import ModalAddMaint from '../components/ModalAddMaint.vue'
import Moto3DShowroom from '../components/Moto3DShowroom.vue'
import TcoAnalysisCard from '../components/TcoAnalysisCard.vue'

const router = useRouter()
const store = useMotoStore()

const showOdoModal = ref(false)
const showFuelModal = ref(false)
const showMaintModal = ref(false)
const editingMaintLog = ref(null)

const openAddMaintModal = () => {
  editingMaintLog.value = null
  showMaintModal.value = true
}

const openEditMaintModal = (log) => {
  editingMaintLog.value = log
  showMaintModal.value = true
}

const closeMaintModal = () => {
  showMaintModal.value = false
  editingMaintLog.value = null
}

// 進入儀表首頁時，同步車輛與紀錄摘要
onMounted(() => {
  store.syncDashboardSummary()
})



const currentOdo = computed(() => store.currentOdometer)
const avgEfficiency = computed(() => store.averageEfficiency)
const totalExpenses = computed(() => store.totalExpenses)
const nextMaint = computed(() => store.nextMaintenance)
const nextMaintShortTitle = computed(() => {
  const raw = nextMaint.value?.title || ''
  return raw.replace(/\s*[（(].*?[)）]\s*$/, '').trim()
})
const recentFuel = computed(() => store.fuelLogs[0] || null)
const recentMaint = computed(() => store.maintenanceLogs[0] || null)

// 計算距離下次保養的進度百分比 (0~100)
const maintProgress = computed(() => {
  if (!nextMaint.value) return 0
  return nextMaint.value.progressPercent ?? 0
})
</script>

<template>
  <div class="app-container dashboard-page">
    <!-- 車輛數位儀表板 (Digital Cockpit) -->
    <div class="cockpit-card">
      <div class="cockpit-header">
        <div class="model-badge">
          <span class="suzuki-red-dot"></span>
          <span>{{ store.vehicle.brand || 'SUZUKI' }} {{ store.vehicle.model || store.vehicle.name || 'SUI 125' }}</span>
        </div>
        <button class="btn-update-odo" @click="showOdoModal = true">
          <Gauge :size="14" /> 更新里程
        </button>
      </div>

      <!-- 總里程大字 -->
      <div class="odo-display-box" @click="showOdoModal = true">
        <div class="odo-label">TOTAL ODOMETER</div>
        <div class="odo-value">
          <span class="stat-number main-digits">{{ currentOdo.toLocaleString() }}</span>
          <span class="odo-unit">KM</span>
        </div>
      </div>

      <!-- 次要儀表網格 -->
      <div class="cockpit-grid">
        <div class="cockpit-cell" @click="router.push('/fuel')">
          <div class="cell-title">
            <Fuel :size="14" class="icon-cyan" /> 平均油耗
          </div>
          <div class="cell-val">
            <span class="stat-number">{{ avgEfficiency > 0 ? avgEfficiency : '--' }}</span>
            <span class="sub-unit">km/L</span>
          </div>
        </div>

        <div class="cockpit-cell" @click="router.push('/fuel')">
          <div class="cell-title">
            <TrendingUp :size="14" class="icon-amber" /> 累計油錢
          </div>
          <div class="cell-val">
            <span class="stat-number">NT${{ totalExpenses.fuel.toLocaleString() }}</span>
          </div>
        </div>

        <div class="cockpit-cell" @click="router.push('/maintenance')">
          <div class="cell-title">
            <Wrench :size="14" class="icon-red" /> 保養花費
          </div>
          <div class="cell-val">
            <span class="stat-number">NT${{ totalExpenses.maintenance.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3D 互動機車數位展示台 -->
    <Moto3DShowroom />

    <!-- 下次保養倒數提醒卡片 -->
    <div 
      class="card maint-alert-card"
      :class="{ 'urgent-card': nextMaint.isUrgent }"
      @click="router.push('/maintenance')"
    >
      <div class="maint-card-header">
        <div class="alert-tag">
          <AlertTriangle v-if="nextMaint.isUrgent" :size="16" class="icon-urgent alert-icon" />
          <Wrench v-else :size="16" class="icon-blue alert-icon" />
          <span class="alert-title">{{ nextMaintShortTitle }}</span>
        </div>
        <span class="badge maint-remaining-badge" :class="nextMaint.isUrgent ? 'badge-red' : 'badge-blue'">
          {{ nextMaint.remainingKm <= 0 ? '已達保養里程' : `還剩 ${nextMaint.remainingKm.toLocaleString()} km` }}
        </span>
      </div>

      <!-- 進度條 -->
      <div class="progress-track">
        <div 
          class="progress-fill" 
          :class="{ 'fill-red': nextMaint.isUrgent }"
          :style="{ width: `${maintProgress}%` }"
        ></div>
      </div>

      <div class="maint-items-brief">
        <span class="brief-label">預計項目：</span>
        <span class="brief-text">
          {{ nextMaint.items ? nextMaint.items.map(i => typeof i === 'string' ? i : i.name).slice(0, 2).join('、') : '機油更換' }} 等
        </span>
        <ChevronRight :size="16" class="arrow-icon" />
      </div>
    </div>

    <!-- 核心快速操作按鈕列 (Quick Action Buttons) -->
    <div class="quick-action-bar">
      <button class="btn btn-primary action-btn" @click="showFuelModal = true">
        <Fuel :size="18" />
        <span>記錄加油</span>
      </button>

      <button class="btn btn-secondary action-btn" @click="openAddMaintModal">
        <Wrench :size="18" class="icon-red" />
        <span>記錄保養</span>
      </button>

      <button class="btn btn-secondary action-btn" @click="router.push('/mods')">
        <Sparkles :size="18" class="icon-amber" />
        <span>改裝日誌</span>
      </button>
    </div>

    <!-- 養車總成本分析儀表板 (TCO & 每公里成本) -->
    <TcoAnalysisCard />

    <!-- 最近一次保養與加油動態 -->
    <div class="section-title-row">
      <div class="section-title">
        <Calendar :size="16" /> 最近動態
      </div>
      <div class="section-links">
        <button class="btn-text-link" @click="router.push('/maintenance')">保養紀錄 ></button>
        <button class="btn-text-link" @click="router.push('/fuel')">加油紀錄 ></button>
      </div>
    </div>

    <div v-if="recentMaint" class="card recent-activity-card">
      <div class="activity-header">
        <div class="activity-type">
          <div class="type-icon maint-type-icon"><Wrench :size="16" /></div>
          <div>
            <div class="activity-name">{{ recentMaint.title }}</div>
            <div class="activity-date">
              <button type="button" class="btn-date-inline" @click="openEditMaintModal(recentMaint)" title="點擊修改保養日期">
                {{ recentMaint.date }} <Pencil :size="11" />
              </button>
              <span>· 里程 {{ Number(recentMaint.odometer).toLocaleString() }} km</span>
            </div>
          </div>
        </div>
        <div class="activity-cost">
          <div class="cost-val">NT$ {{ recentMaint.cost }}</div>
          <button type="button" class="btn-edit-inline" @click="openEditMaintModal(recentMaint)">
            <Pencil :size="12" /> 編輯
          </button>
        </div>
      </div>

      <div v-if="recentMaint.items && recentMaint.items.length > 0" class="activity-footer">
        <span class="footer-chip">
          施工：{{ recentMaint.items.map(i => typeof i === 'string' ? i : i.name).slice(0, 2).join('、') }}
          <template v-if="recentMaint.items.length > 2"> 等 {{ recentMaint.items.length }} 項</template>
        </span>
      </div>
    </div>

    <div v-if="recentFuel" class="card recent-activity-card">
      <div class="activity-header">
        <div class="activity-type">
          <div class="type-icon fuel-type-icon"><Fuel :size="16" /></div>
          <div>
            <div class="activity-name">{{ recentFuel.gasStation }} 加油</div>
            <div class="activity-date">{{ recentFuel.date }} · {{ recentFuel.fuelType }}無鉛</div>
          </div>
        </div>
        <div class="activity-cost">
          <div class="cost-val">NT$ {{ recentFuel.totalCost }}</div>
          <div class="liters-val">{{ recentFuel.liters }} L</div>
        </div>
      </div>

      <div v-if="recentFuel.efficiency" class="activity-footer">
        <span class="footer-chip">
          本次行駛 <strong>{{ recentFuel.tripDistance }} km</strong>
        </span>
        <span class="footer-chip chip-highlight">
          油耗 <strong>{{ recentFuel.efficiency }} km/L</strong>
        </span>
      </div>
    </div>

    <div v-if="!recentFuel && !recentMaint" class="empty-state card">
      <p>目前尚無加油或保養紀錄，立即點擊上方按鈕開始記錄吧！</p>
    </div>

    <!-- AI 健檢快速諮詢入口橫幅 -->
    <div class="ai-banner-card" @click="router.push('/ai')">
      <div class="ai-banner-glow"></div>
      <div class="ai-banner-content">
        <div class="ai-icon-circle">
          <Zap :size="20" />
        </div>
        <div class="ai-text-box">
          <div class="ai-banner-title">SUI 125 隨車 AI 診斷小幫手</div>
          <div class="ai-banner-desc">起步抖動？煞車變軟？隨時詢問機車疑難排解</div>
        </div>
        <ChevronRight :size="20" class="ai-arrow" />
      </div>
    </div>

    <!-- Modals -->
    <ModalQuickOdo v-if="showOdoModal" @close="showOdoModal = false" />
    <ModalAddFuel v-if="showFuelModal" @close="showFuelModal = false" />
    <ModalAddMaint v-if="showMaintModal" :edit-log="editingMaintLog" @close="closeMaintModal" />
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 數位座艙儀表 */
.cockpit-card {
  background: linear-gradient(165deg, #131722 0%, #0d0f15 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.cockpit-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--suzuki-blue), var(--suzuki-red), transparent);
}

.cockpit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.model-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #e2e8f0;
}

.suzuki-red-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--suzuki-red);
  box-shadow: 0 0 8px var(--suzuki-red);
}

.btn-update-odo {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-update-odo:hover {
  background: rgba(0, 91, 172, 0.25);
  color: #fff;
}

.odo-display-box {
  text-align: center;
  padding: 16px 0;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background 0.15s ease;
}

.odo-display-box:hover {
  background: rgba(255, 255, 255, 0.02);
}

.odo-label {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  font-weight: 700;
  margin-bottom: 4px;
}

.odo-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
}

.main-digits {
  font-size: 3.2rem;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.25);
}

.odo-unit {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--suzuki-blue-light);
  letter-spacing: 0.05em;
}

.cockpit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 14px;
}

.cockpit-cell {
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cockpit-cell:hover {
  background: rgba(255, 255, 255, 0.07);
}

.cell-title {
  font-size: 0.72rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.cell-val {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.sub-unit {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.icon-cyan { color: var(--suzuki-blue-light); }
.icon-amber { color: var(--accent-amber); }
.icon-red { color: var(--suzuki-red); }

/* 保養提醒卡片 */
.maint-alert-card {
  border-left: 4px solid var(--suzuki-blue);
  cursor: pointer;
}

.maint-alert-card.urgent-card {
  border-left-color: var(--suzuki-red);
  background: linear-gradient(135deg, rgba(230, 0, 18, 0.08) 0%, rgba(22, 26, 35, 0.9) 100%);
}

.maint-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.alert-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.alert-icon {
  flex-shrink: 0;
}

.alert-title {
  font-weight: 700;
  font-size: 0.92rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.maint-remaining-badge {
  white-space: nowrap;
  flex-shrink: 0;
}

.icon-urgent {
  color: var(--suzuki-red);
  animation: pulse 1s infinite alternate;
}

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--suzuki-blue), var(--suzuki-blue-light));
  border-radius: 99px;
  transition: width 0.4s ease;
}

.progress-fill.fill-red {
  background: linear-gradient(90deg, #f59e0b, var(--suzuki-red));
}

.maint-items-brief {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.brief-text {
  flex: 1;
  color: #cbd5e1;
  margin-left: 4px;
}

.arrow-icon {
  color: var(--text-muted);
}

/* 快速操作按鈕群 */
.quick-action-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.action-btn {
  flex-direction: column;
  padding: 12px 8px;
  gap: 6px;
  font-size: 0.85rem;
}

/* 動態清單 */
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #cbd5e1;
}

.section-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-text-link {
  background: transparent;
  border: none;
  color: var(--suzuki-blue-light);
  font-size: 0.8rem;
  cursor: pointer;
}

.recent-activity-card {
  padding: 14px 16px;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.activity-type {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.type-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fuel-type-icon {
  background: rgba(0, 91, 172, 0.2);
  color: #38bdf8;
}

.maint-type-icon {
  background: rgba(230, 0, 18, 0.18);
  color: #ff6b6b;
}

.activity-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #fff;
}

.activity-date {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.btn-date-inline {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-date-inline:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

.activity-cost {
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.btn-edit-inline {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-secondary);
  font-size: 0.72rem;
  padding: 2px 7px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-edit-inline:hover {
  background: var(--suzuki-blue);
  color: #fff;
}

.cost-val {
  font-weight: 700;
  font-size: 1.05rem;
  color: #fff;
  font-family: var(--font-mono);
}

.liters-val {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.activity-footer {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-chip {
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.chip-highlight {
  background: rgba(0, 91, 172, 0.15);
  color: #38bdf8;
}

/* AI 橫幅 */
.ai-banner-card {
  background: linear-gradient(135deg, #181b26 0%, #10121a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, border-color 0.2s;
}

.ai-banner-card:hover {
  border-color: rgba(6, 182, 212, 0.4);
  transform: translateY(-1px);
}

.ai-banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #06b6d4);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
}

.ai-text-box {
  flex: 1;
}

.ai-banner-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #fff;
}

.ai-banner-desc {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.ai-arrow {
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 24px;
}
</style>
