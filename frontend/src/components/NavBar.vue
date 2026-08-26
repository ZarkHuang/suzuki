<script setup>
import { useRoute, useRouter } from 'vue-router'
import { 
  Gauge, 
  Fuel, 
  Wrench, 
  Sparkles, 
  Bot
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/', name: 'dashboard', label: '儀表', icon: Gauge },
  { path: '/fuel', name: 'fuel', label: '油耗', icon: Fuel },
  { path: '/maintenance', name: 'maintenance', label: '保養', icon: Wrench },
  { path: '/mods', name: 'mods', label: '改裝', icon: Sparkles },
  { path: '/ai', name: 'ai', label: 'AI健檢', icon: Bot }
]
</script>

<template>
  <nav class="bottom-nav">
    <div class="nav-container">
      <button 
        v-for="item in navItems" 
        :key="item.path"
        class="nav-item" 
        :class="{ 'active': route.path === item.path }"
        @click="router.push(item.path)"
      >
        <div class="nav-icon-box">
          <component :is="item.icon" :size="20" class="nav-icon" />
          <div v-if="route.path === item.path" class="nav-active-pill"></div>
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(14, 17, 24, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 12px max(8px, env(safe-area-inset-bottom));
}

.nav-container {
  max-width: 540px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
}

.nav-icon-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  width: 32px;
}

.nav-icon {
  transition: transform 0.2s ease, color 0.2s ease;
}

.nav-label {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition: color 0.2s ease;
}

/* 啟用狀態 Active State (Suzuki 藍色光暈與亮點) */
.nav-item.active {
  color: #ffffff;
}

.nav-item.active .nav-icon {
  color: var(--suzuki-blue-light);
  transform: translateY(-2px);
}

.nav-item.active .nav-label {
  color: #ffffff;
  font-weight: 700;
}

.nav-active-pill {
  position: absolute;
  bottom: -4px;
  width: 14px;
  height: 3px;
  background: var(--suzuki-blue-light);
  border-radius: 99px;
  box-shadow: 0 0 8px var(--suzuki-blue);
}
</style>
