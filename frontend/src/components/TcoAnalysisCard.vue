<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMotoStore } from '../stores/motoStore'
import { 
  PieChart, 
  BarChart3, 
  Fuel, 
  Wrench, 
  Sparkles, 
  Coins
} from 'lucide-vue-next'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  registerables
} from 'chart.js'

ChartJS.register(...registerables)

const router = useRouter()
const store = useMotoStore()

const activeChartTab = ref('structure') // 'structure' | 'monthly'
const includeMods = ref(true)

const expenses = computed(() => store.totalExpenses)
const tco = computed(() => store.tcoAnalysis)
const currentOdo = computed(() => store.currentOdometer)

const activeTotalCost = computed(() =>
  includeMods.value ? expenses.value.total : expenses.value.operatingTotal
)

const activeCostPerKm = computed(() =>
  includeMods.value ? tco.value.costPerKmTotal : tco.value.costPerKmOperating
)

const activeAvgMonthly = computed(() =>
  includeMods.value ? tco.value.avgMonthlyTotal : tco.value.avgMonthlyOperating
)

const hasAnyExpense = computed(() => activeTotalCost.value > 0)

// 圓餅圖 (Doughnut) 資料
const doughnutData = computed(() => {
  if (!hasAnyExpense.value) {
    return {
      labels: ['尚無花費資料'],
      datasets: [
        {
          data: [1],
          backgroundColor: ['rgba(148, 163, 184, 0.2)'],
          borderWidth: 0
        }
      ]
    }
  }

  const labels = includeMods.value
    ? ['加油油資', '定期保養', '改裝升級']
    : ['加油油資', '定期保養']

  const data = includeMods.value
    ? [expenses.value.fuel, expenses.value.maintenance, expenses.value.modifications]
    : [expenses.value.fuel, expenses.value.maintenance]

  const bgColors = includeMods.value
    ? ['#38bdf8', '#ef4444', '#f59e0b']
    : ['#38bdf8', '#ef4444']

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: bgColors,
        borderColor: '#131722',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: '#cbd5e1',
      padding: 10,
      callbacks: {
        label: (ctx) => ` NT$ ${Number(ctx.raw || 0).toLocaleString()}`
      }
    }
  }
}

// 近 6 個月堆疊長條圖 (Bar) 資料
const monthlyBarData = computed(() => {
  const series = tco.value.monthlySeries || []
  const labels = series.map(s => s.label)

  const datasets = [
    {
      label: '加油油資',
      data: series.map(s => (s.fuel > 0 ? s.fuel : null)),
      backgroundColor: '#38bdf8',
      borderRadius: 4,
      minBarLength: 10,
      stack: 'tco'
    },
    {
      label: '定期保養',
      data: series.map(s => (s.maintenance > 0 ? s.maintenance : null)),
      backgroundColor: '#ef4444',
      borderRadius: 4,
      minBarLength: 10,
      stack: 'tco'
    }
  ]

  if (includeMods.value) {
    datasets.push({
      label: '改裝升級',
      data: series.map(s => (s.modifications > 0 ? s.modifications : null)),
      backgroundColor: '#f59e0b',
      borderRadius: 4,
      minBarLength: 10,
      stack: 'tco'
    })
  }

  return { labels, datasets }
})

// 取出有實際支出的月份明細 (由新到舊排列)，避免改裝金額過大時看不清小額油資與保養數字
const activeMonthlyRows = computed(() => {
  const series = tco.value.monthlySeries || []
  return [...series]
    .reverse()
    .map(s => {
      const displayTotal = includeMods.value ? s.total : (s.fuel + s.maintenance)
      return { ...s, displayTotal }
    })
    .filter(s => s.displayTotal > 0)
})

const monthlyBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#94a3b8',
        boxWidth: 10,
        font: { size: 11 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: '#cbd5e1',
      padding: 10,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: NT$ ${Number(ctx.raw || 0).toLocaleString()}`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 11 } }
    },
    y: {
      stacked: true,
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: {
        color: '#64748b',
        font: { size: 10 },
        callback: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)
      }
    }
  }
}

const breakdownItems = computed(() => {
  const shares = includeMods.value ? tco.value.sharesTotal : tco.value.sharesOperating
  const list = [
    {
      key: 'fuel',
      label: '加油油資',
      amount: expenses.value.fuel,
      pct: shares.fuel,
      perKm: tco.value.fuelCostPerKm,
      color: '#38bdf8',
      route: '/fuel',
      icon: Fuel
    },
    {
      key: 'maintenance',
      label: '定期保養',
      amount: expenses.value.maintenance,
      pct: shares.maintenance,
      perKm: tco.value.maintCostPerKm,
      color: '#ef4444',
      route: '/maintenance',
      icon: Wrench
    }
  ]

  if (includeMods.value) {
    list.push({
      key: 'modifications',
      label: '改裝升級',
      amount: expenses.value.modifications,
      pct: shares.modifications,
      perKm: tco.value.modCostPerKm,
      color: '#f59e0b',
      route: '/mods',
      icon: Sparkles
    })
  }
  return list
})
</script>

<template>
  <div class="card tco-card">
    <!-- 標題與「含改裝/純養車」切換 -->
    <div class="tco-header">
      <div class="tco-title-box">
        <Coins :size="17" class="tco-icon" />
        <span>養車總成本分析 (TCO)</span>
      </div>

      <div class="mode-switch">
        <button 
          type="button" 
          class="mode-btn" 
          :class="{ active: includeMods }" 
          @click="includeMods = true"
        >
          含改裝全帳
        </button>
        <button 
          type="button" 
          class="mode-btn" 
          :class="{ active: !includeMods }" 
          @click="includeMods = false"
        >
          純日常養車
        </button>
      </div>
    </div>

    <!-- 三大核心財務指標 KPI 網格 -->
    <div class="tco-kpi-grid">
      <div class="kpi-box highlight-kpi">
        <div class="kpi-label">每公里騎乘成本</div>
        <div class="kpi-val">
          <span class="kpi-currency">NT$</span>
          <span class="stat-number kpi-main">{{ currentOdo > 0 ? activeCostPerKm : '--' }}</span>
          <span class="kpi-unit">/ km</span>
        </div>
      </div>

      <div class="kpi-box">
        <div class="kpi-label">{{ includeMods ? '總養車支出' : '日常油保總計' }}</div>
        <div class="kpi-val">
          <span class="stat-number">NT${{ activeTotalCost.toLocaleString() }}</span>
        </div>
      </div>

      <div class="kpi-box">
        <div class="kpi-label">月均養車花費</div>
        <div class="kpi-val">
          <span class="stat-number">NT${{ activeAvgMonthly.toLocaleString() }}</span>
          <span class="kpi-unit">/月</span>
        </div>
      </div>
    </div>

    <!-- 圖表視角切換 Tabs -->
    <div class="chart-tab-bar">
      <button
        type="button"
        class="chart-tab-btn"
        :class="{ active: activeChartTab === 'structure' }"
        @click="activeChartTab = 'structure'"
      >
        <PieChart :size="14" />
        <span>花費結構佔比</span>
      </button>
      <button
        type="button"
        class="chart-tab-btn"
        :class="{ active: activeChartTab === 'monthly' }"
        @click="activeChartTab = 'monthly'"
      >
        <BarChart3 :size="14" />
        <span>近 6 個月支出趨勢</span>
      </button>
    </div>

    <!-- 視角 1：花費結構圓餅圖 + 明細清單 -->
    <div v-if="activeChartTab === 'structure'" class="structure-panel">
      <div class="doughnut-wrap">
        <Doughnut :data="doughnutData" :options="doughnutOptions" />
        <div class="doughnut-center">
          <span class="center-sub">每公里</span>
          <span class="center-num">NT${{ currentOdo > 0 ? activeCostPerKm : '0' }}</span>
        </div>
      </div>

      <div class="breakdown-list">
        <div
          v-for="item in breakdownItems"
          :key="item.key"
          class="breakdown-item"
          @click="router.push(item.route)"
        >
          <div class="bd-top">
            <div class="bd-name">
              <span class="bd-dot" :style="{ backgroundColor: item.color }"></span>
              <span>{{ item.label }}</span>
            </div>
            <div class="bd-meta">
              <span class="bd-amount">NT${{ item.amount.toLocaleString() }}</span>
              <span class="bd-pct">{{ item.pct }}%</span>
            </div>
          </div>

          <div class="bd-bar-track">
            <div
              class="bd-bar-fill"
              :style="{ width: `${item.pct}%`, backgroundColor: item.color }"
            ></div>
          </div>

          <div class="bd-sub">
            平均每公里分攤：<strong>NT$ {{ item.perKm }} / km</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- 視角 2：近 6 個月支出堆疊長條圖 + 各月明細 -->
    <div v-else class="monthly-panel">
      <div class="bar-chart-wrap">
        <Bar :data="monthlyBarData" :options="monthlyBarOptions" />
      </div>

      <div v-if="activeMonthlyRows.length > 0" class="month-detail-list">
        <div v-for="m in activeMonthlyRows" :key="m.ym" class="month-detail-row">
          <div class="m-badge">{{ m.label }}</div>
          <div class="m-tags">
            <span v-if="m.fuel > 0" class="m-chip chip-fuel">油資 NT${{ m.fuel.toLocaleString() }}</span>
            <span v-if="m.maintenance > 0" class="m-chip chip-maint">保養 NT${{ m.maintenance.toLocaleString() }}</span>
            <span v-if="includeMods && m.modifications > 0" class="m-chip chip-mod">改裝 NT${{ m.modifications.toLocaleString() }}</span>
          </div>
          <div class="m-total">NT${{ m.displayTotal.toLocaleString() }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tco-card {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tco-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tco-title-box {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.94rem;
  font-weight: 800;
  color: #f8fafc;
}

.tco-icon {
  color: #fbbf24;
}

.mode-switch {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 2px;
}

.mode-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.mode-btn.active {
  background: var(--suzuki-blue);
  color: #fff;
}

.tco-kpi-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 8px;
}

.kpi-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--radius-sm);
  padding: 10px;
  min-width: 0;
}

.highlight-kpi {
  background: linear-gradient(135deg, rgba(0, 91, 172, 0.22) 0%, rgba(56, 189, 248, 0.08) 100%);
  border-color: rgba(56, 189, 248, 0.32);
}

.kpi-label {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-val {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 0.96rem;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
}

.kpi-currency {
  font-size: 0.72rem;
  color: #38bdf8;
  font-weight: 700;
}

.kpi-main {
  font-size: 1.25rem;
  color: #38bdf8;
}

.kpi-unit {
  font-size: 0.68rem;
  color: #64748b;
}

.chart-tab-bar {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: rgba(0, 0, 0, 0.25);
  padding: 4px;
  border-radius: 10px;
}

.chart-tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chart-tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.structure-panel {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.doughnut-wrap {
  position: relative;
  width: 132px;
  height: 132px;
  margin: 0 auto;
}

.doughnut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.center-sub {
  font-size: 0.65rem;
  color: #94a3b8;
}

.center-num {
  font-size: 0.88rem;
  font-weight: 800;
  color: #f8fafc;
  font-family: var(--font-mono);
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.breakdown-item {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.breakdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.bd-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.bd-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #e2e8f0;
}

.bd-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bd-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
}

.bd-amount {
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
}

.bd-pct {
  font-size: 0.7rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.07);
  padding: 1px 5px;
  border-radius: 4px;
}

.bd-bar-track {
  height: 5px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 4px;
}

.bd-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.35s ease;
}

.bd-sub {
  font-size: 0.68rem;
  color: #64748b;
}

.bd-sub strong {
  color: #cbd5e1;
}

.monthly-panel {
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-chart-wrap {
  height: 195px;
  width: 100%;
}

.month-detail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding-top: 10px;
}

.month-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 6px 10px;
}

.m-badge {
  font-size: 0.76rem;
  font-weight: 800;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.m-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.m-chip {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 5px;
  white-space: nowrap;
}

.chip-fuel {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.chip-maint {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.chip-mod {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.m-total {
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  font-family: var(--font-mono);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 390px) {
  .tco-kpi-grid {
    grid-template-columns: 1fr;
  }

  .structure-panel {
    grid-template-columns: 1fr;
  }
}
</style>

