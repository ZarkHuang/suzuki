<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMotoStore } from '../stores/motoStore'
import { Bell, Settings, User, LogIn } from 'lucide-vue-next'

const router = useRouter()
const store = useMotoStore()

const nextMaint = computed(() => store.nextMaintenance)
const isUrgent = computed(() => nextMaint.value.isUrgent)
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <!-- 車輛 Logo 與名稱 (俐落單行，永遠不換行) -->
      <div class="brand-badge" @click="router.push('/')">
        <div class="suzuki-s-mark">
          <img src="/icon.svg" alt="SUI 125 Logo" class="brand-logo-img" />
        </div>
        <div class="brand-info">
          <div class="brand-name">SUZUKI <span class="model-tag">SUI 125</span></div>
          <div class="plate-status-row">
            <span class="plate-number">{{ store.vehicle.licensePlate || 'MY-SUI125' }}</span>
            <span 
              class="db-badge" 
              :class="store.isBackendOnline ? 'db-online' : 'db-offline'"
              :title="store.isBackendOnline ? '雲端 MySQL 連線正常' : '離線模式'"
              @click.stop="store.initSyncWithBackend()"
            >
              <span class="status-dot"></span>
              {{ store.isSyncing ? '同步中' : (store.isBackendOnline ? 'Cloud' : '離線') }}
            </span>
          </div>
        </div>
      </div>

      <!-- 右側極簡操作區 -->
      <div class="header-actions">
        <!-- 保養警示燈 (僅小巧鈴鐺) -->
        <button 
          v-if="isUrgent"
          class="btn-icon bell-urgent" 
          title="保養即期！點擊查看"
          @click="router.push('/maintenance')"
        >
          <Bell :size="16" class="shake-animation" />
        </button>

        <!-- 車主頭像 / 快速登入按鈕 (小巧圓形) -->
        <button 
          class="btn-user-circle" 
          :class="{ 'logged-in': store.isAuthenticated }"
          :title="store.isAuthenticated ? `車主：${store.currentUser?.username} (點擊前往設定)` : '點擊登入專屬車庫'"
          @click="store.isAuthenticated ? router.push('/settings') : store.openAuthModal()"
        >
          <span v-if="store.isAuthenticated" class="avatar-letter">
            {{ store.currentUser?.username?.charAt(0).toUpperCase() || 'U' }}
          </span>
          <span v-else class="login-text">登入</span>
        </button>

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
  background: rgba(10, 12, 16, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: max(10px, env(safe-area-inset-top));
  padding-bottom: 8px;
  padding-left: 14px;
  padding-right: 14px;
}

.header-container {
  max-width: 540px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.suzuki-s-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 91, 172, 0.4);
  flex-shrink: 0;
}

.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-info {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  white-space: nowrap;
}

.brand-name {
  font-weight: 800;
  font-size: 0.92rem;
  letter-spacing: 0.02em;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.1;
  white-space: nowrap;
}

.model-tag {
  color: var(--suzuki-blue-light, #00d2ff);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.plate-status-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.plate-number {
  font-size: 0.7rem;
  color: var(--text-muted, #71717a);
  font-family: var(--font-mono, monospace);
}

.db-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 99px;
  cursor: pointer;
}

.db-online {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.db-online .status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 5px #34d399;
}

.db-offline {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.db-offline .status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary, #a1a1aa);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.bell-urgent {
  background: rgba(230, 0, 18, 0.2);
  border-color: rgba(230, 0, 18, 0.5);
  color: #ff6b6b;
}

.btn-user-circle {
  height: 32px;
  min-width: 32px;
  padding: 0 8px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 210, 255, 0.1);
  border: 1px solid rgba(0, 210, 255, 0.3);
  color: var(--color-primary, #00d2ff);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-user-circle.logged-in {
  width: 32px;
  padding: 0;
  background: linear-gradient(135deg, #00d2ff, #0077ff);
  border: none;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
}

.avatar-letter {
  font-size: 0.85rem;
}

.login-text {
  font-size: 0.72rem;
  font-weight: 600;
}

.shake-animation {
  animation: shake 2s infinite;
}

@keyframes shake {
  0%, 100% { transform: rotate(0); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
}
</style>
