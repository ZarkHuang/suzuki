<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMotoStore } from '../stores/motoStore'
import { Bell, Settings, Gauge, Sparkles } from 'lucide-vue-next'

const router = useRouter()
const store = useMotoStore()

const currentOdo = computed(() => store.currentOdometer)
const nextMaint = computed(() => store.nextMaintenance)
const isUrgent = computed(() => nextMaint.value.isUrgent)
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <!-- 車輛 Logo 與名稱 -->
      <div class="brand-badge" @click="router.push('/')">
        <div class="suzuki-s-mark">S</div>
        <div class="brand-info">
          <div class="brand-name">SUZUKI <span class="model-tag">SUI 125</span></div>
          <div class="plate-status-row">
            <span class="plate-number">{{ store.vehicle.licensePlate || '日系極簡小鴨' }}</span>
            <span 
              class="db-badge" 
              :class="store.isBackendOnline ? 'db-online' : 'db-offline'"
              :title="store.isBackendOnline ? '點擊手動從 MySQL 重新整理' : '離線模式 (LocalStorage)'"
              @click.stop="store.initSyncWithBackend()"
            >
              <span class="status-dot"></span>
              {{ store.isSyncing ? '同步中' : (store.isBackendOnline ? 'MySQL' : '離線') }}
            </span>

          </div>
        </div>
      </div>


      <!-- 右側快速狀態與設定按鈕 -->
      <div class="header-actions">
        <!-- 保養狀態警示燈 -->
        <div 
          class="maint-indicator" 
          :class="{ 'indicator-urgent': isUrgent }"
          :title="isUrgent ? `保養即期！距離保養剩餘 ${nextMaint.remainingKm} km` : '車況良好'"
          @click="router.push('/maintenance')"
        >
          <Bell :size="16" class="bell-icon" :class="{ 'shake-animation': isUrgent }" />
          <span class="maint-km-text">{{ nextMaint.remainingKm > 0 ? `${nextMaint.remainingKm}km` : '需保養' }}</span>
        </div>

        <!-- 前往設定 -->
        <button class="btn-icon" @click="router.push('/settings')" title="系統設定">
          <Settings :size="18" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 90;
  background: rgba(10, 12, 16, 0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 16px;
}

.header-container {
  max-width: 540px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.suzuki-s-mark {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--suzuki-red), #ff3b30);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.15rem;
  color: #fff;
  font-family: var(--font-sans);
  box-shadow: 0 2px 8px var(--suzuki-red-glow);
  transform: skewX(-6deg);
}

.brand-name {
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.model-tag {
  color: var(--suzuki-blue-light);
  font-size: 0.85rem;
  font-weight: 700;
}

.plate-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.plate-number {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.db-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 99px;
}

.db-online {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.db-online .status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
}

.db-offline {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.db-offline .status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-muted);
}


.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.maint-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(0, 91, 172, 0.15);
  border: 1px solid rgba(0, 91, 172, 0.35);
  color: #38bdf8;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.maint-indicator.indicator-urgent {
  background: rgba(230, 0, 18, 0.2);
  border-color: rgba(230, 0, 18, 0.5);
  color: #ff6b6b;
  box-shadow: 0 0 10px var(--suzuki-red-glow);
}

.btn-icon {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}

.shake-animation {
  animation: bellShake 1.5s infinite;
}

@keyframes bellShake {
  0%, 100% { transform: rotate(0); }
  10%, 30%, 50% { transform: rotate(14deg); }
  20%, 40% { transform: rotate(-14deg); }
  60% { transform: rotate(0); }
}
</style>
