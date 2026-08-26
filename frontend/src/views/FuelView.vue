<script setup>
import { ref, computed } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { 
  Fuel, 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Trash2, 
  DollarSign, 
  Gauge, 
  Calendar,
  Sparkles
} from 'lucide-vue-next'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

import ModalAddFuel from '../components/ModalAddFuel.vue'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const store = useMotoStore()
const showAddModal = ref(false)
const timeRange = ref('all') // 'week' | 'month' | 'year' | 'all'

const fuelLogs = computed(() => store.fuelLogs)
const avgEfficiency = computed(() => store.averageEfficiency)
const totalFuelCost = computed(() => store.totalExpenses.fuel)

// 依時間範圍過濾資料
const filteredLogs = computed(() => {
  const now = new Date()
  const logs = [...store.fuelLogs]
  
  if (timeRange.value === 'week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000)
    return logs.filter(l => new Date(l.date) >= oneWeekAgo)
  } else if (timeRange.value === 'month') {
    const oneMonthAgo = new Date(now.getTime() - 30 * 86400000)
    return logs.filter(l => new Date(l.date) >= oneMonthAgo)
  } else if (timeRange.value === 'year') {
    const oneYearAgo = new Date(now.getTime() - 365 * 86400000)
    return logs.filter(l => new Date(l.date) >= oneYearAgo)
  }
  return logs
})

// 圖表資料 (依日期由舊到新繪製)
const chartData = computed(() => {
  const sorted = [...filteredLogs.value].reverse()
  const labels = sorted.map(l => l.date.slice(5)) // MM-DD
  const efficiencies = sorted.map(l => l.efficiency || 0)
  const costs = sorted.map(l => l.totalCost || 0)

  return {
    labels: labels.length > 0 ? labels : ['無資料'],
    datasets: [
      {
        label: '平均油耗 (km/L)',
        data: efficiencies.length > 0 ? efficiencies : [0],
        borderColor: '#005BAC',
        backgroundColor: 'rgba(0, 91, 172, 0.15)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#fff',
        pointRadius: 4,
        yAxisID: 'y'
      },
      {
        label: '加油金額 (NT$)',
        data: costs.length > 0 ? costs : [0],
        borderColor: '#E60012',
        backgroundColor: 'rgba(230, 0, 18, 0.65)',
        type: 'bar',
        borderRadius: 6,
        yAxisID: 'y1'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 11 }
      }
    },
    tooltip: {
      backgroundColor: '#1e222d',
      titleColor: '#fff',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#64748b', font: { size: 10 } }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#38bdf8', font: { size: 10 } },
      title: { display: true, text: 'km/L', color: '#38bdf8', font: { size: 10 } }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { color: '#ff6b6b', font: { size: 10 } },
      title: { display: true, text: 'NT$', color: '#ff6b6b', font: { size: 10 } }
    }
  }
}

const deleteLog = (id) => {
  if (confirm('確定要刪除此筆加油紀錄嗎？')) {
    store.deleteFuelLog(id)
  }
}
</script>

<template>
  <div class="app-container fuel-page">
    <!-- 頁面標頭與新增按鈕 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">油耗與加油分析</h2>
        <p class="page-subtitle">SUI 125 燃油經濟性與費用追蹤</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="showAddModal = true">
        <Plus :size="16" /> 記錄加油
      </button>
    </div>

    <!-- 數據概覽統計卡 -->
    <div class="stats-cards-grid">
      <div class="card stat-mini-card">
        <div class="mini-label">
          <Fuel :size="14" class="icon-blue" /> 平均油耗
        </div>
        <div class="mini-val">
          <span class="stat-number text-blue">{{ avgEfficiency > 0 ? avgEfficiency : '--' }}</span>
          <span class="mini-unit">km/L</span>
        </div>
        <div class="mini-footer">原廠測試值約 46.8 km/L</div>
      </div>

      <div class="card stat-mini-card">
        <div class="mini-label">
          <DollarSign :size="14" class="icon-amber" /> 累計加油花費
        </div>
        <div class="mini-val">
          <span class="stat-number text-white">NT${{ totalFuelCost.toLocaleString() }}</span>
        </div>
        <div class="mini-footer">共 {{ fuelLogs.length }} 筆加油紀錄</div>
      </div>
    </div>

    <!-- 圖表區塊與時間切換 -->
    <div class="card chart-card">
      <div class="chart-header">
        <div class="chart-title">
          <BarChart3 :size="16" class="icon-blue" /> 油耗與油資趨勢
        </div>
        <!-- 時間跨度切換 (週/月/年/總覽) -->
        <div class="time-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: timeRange === 'week' }"
            @click="timeRange = 'week'"
          >
            週
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: timeRange === 'month' }"
            @click="timeRange = 'month'"
          >
            月
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: timeRange === 'year' }"
            @click="timeRange = 'year'"
          >
            年
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: timeRange === 'all' }"
            @click="timeRange = 'all'"
          >
            總覽
          </button>
        </div>
      </div>

      <div class="chart-wrapper">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- 加油紀錄歷史清單 -->
    <div class="history-section">
      <div class="section-title">
        <Calendar :size="16" /> 加油歷史清單 ({{ filteredLogs.length }}筆)
      </div>

      <div v-if="filteredLogs.length > 0" class="history-list">
        <div v-for="log in filteredLogs" :key="log.id" class="card log-item-card">
          <div class="log-top-row">
            <div class="station-meta">
              <span class="station-tag">{{ log.gasStation || '加油站' }}</span>
              <span class="fuel-grade-badge">{{ log.fuelType }}無鉛</span>
              <span class="log-date">{{ log.date }}</span>
            </div>
            <button class="btn-delete" @click="deleteLog(log.id)" title="刪除紀錄">
              <Trash2 :size="15" />
            </button>
          </div>

          <div class="log-middle-row">
            <div class="log-metrics">
              <div class="metric-block">
                <span class="m-label">累積里程</span>
                <span class="m-val">{{ log.odometer.toLocaleString() }} <small>km</small></span>
              </div>
              <div class="metric-block">
                <span class="m-label">加油量</span>
                <span class="m-val">{{ log.liters }} <small>L</small></span>
              </div>
              <div class="metric-block">
                <span class="m-label">總金額</span>
                <span class="m-val text-amber">NT${{ log.totalCost }}</span>
              </div>
            </div>

            <!-- 計算油耗指標 -->
            <div v-if="log.efficiency" class="efficiency-badge-box">
              <span class="eff-num stat-number">{{ log.efficiency }}</span>
              <span class="eff-unit">km/L</span>
            </div>
          </div>

          <div v-if="log.tripDistance || log.note" class="log-bottom-row">
            <span v-if="log.tripDistance" class="trip-tag">
              行駛區間: +{{ log.tripDistance }}km
            </span>
            <span v-if="log.note" class="note-tag">
              📝 {{ log.note }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state card">
        <p>此時間區間內尚無加油紀錄</p>
      </div>
    </div>

    <!-- Modal -->
    <ModalAddFuel v-if="showAddModal" @close="showAddModal = false" />
  </div>
</template>

<style scoped>
.fuel-page {
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

.stats-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-mini-card {
  padding: 14px;
}

.mini-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.mini-val {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.mini-val .stat-number {
  font-size: 1.55rem;
  font-weight: 800;
}

.mini-unit {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.mini-footer {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 6px;
}

.text-blue { color: #38bdf8; }
.text-amber { color: #f59e0b; }
.text-white { color: #ffffff; }

/* 圖表區 */
.chart-card {
  padding: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #e2e8f0;
}

.icon-blue { color: var(--suzuki-blue-light); }

.time-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: var(--suzuki-blue);
  color: #fff;
}

.chart-wrapper {
  height: 200px;
  position: relative;
}

/* 歷史清單 */
.history-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #cbd5e1;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item-card {
  padding: 14px;
}

.log-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.station-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.station-tag {
  font-weight: 700;
  font-size: 0.85rem;
  color: #fff;
}

.fuel-grade-badge {
  background: rgba(0, 91, 172, 0.2);
  color: #38bdf8;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.log-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}
.btn-delete:hover {
  color: #ff6b6b;
}

.log-middle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
}

.log-metrics {
  display: flex;
  gap: 16px;
}

.metric-block {
  display: flex;
  flex-direction: column;
}

.m-label {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.m-val {
  font-size: 0.95rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: #f1f5f9;
}

.m-val small {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.efficiency-badge-box {
  background: linear-gradient(135deg, rgba(0, 91, 172, 0.3) 0%, rgba(2, 132, 199, 0.15) 100%);
  border: 1px solid rgba(0, 91, 172, 0.4);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  text-align: center;
}

.eff-num {
  font-size: 1.15rem;
  color: #38bdf8;
  display: block;
  line-height: 1;
}

.eff-unit {
  font-size: 0.65rem;
  color: #94a3b8;
}

.log-bottom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.trip-tag, .note-tag {
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: 4px;
  color: #cbd5e1;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 24px;
}
</style>
