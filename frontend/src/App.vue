<script setup>
import { onMounted } from 'vue'
import Header from './components/Header.vue'
import NavBar from './components/NavBar.vue'
import AuthGate from './components/AuthGate.vue'
import AuthModal from './components/AuthModal.vue'
import VehicleOnboardingModal from './components/VehicleOnboardingModal.vue'
import { useMotoStore } from './stores/motoStore'

const store = useMotoStore()

onMounted(() => {
  if (store.isAuthenticated) {
    store.initSyncWithBackend()
  }
})
</script>

<template>
  <div class="app-root">
    <!-- 動態背景網格與光暈效果 -->
    <div class="bg-mesh-pattern"></div>

    <!-- 未登入：強制登入/註冊閘道 (Auth Gate) -->
    <AuthGate v-if="!store.isAuthenticated" />

    <!-- 已登入：完整數位座艙儀表與全功能操作 -->
    <template v-else>
      <!-- 頂部狀態列 -->
      <Header />

      <!-- 主要頁面內容 (含過渡動畫) -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- 底部導航列 -->
      <NavBar />
    </template>

    <!-- 首次登入 / 尚未設定愛車：強制彈出愛車基本資訊設定精靈 (不可跳過) -->
    <VehicleOnboardingModal v-if="store.isAuthenticated && store.needsVehicleSetup" />

    <!-- SaaS 登入彈窗 (備用) -->
    <AuthModal v-if="store.isAuthModalOpen" />
  </div>
</template>


<style>
.app-root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}

/* 頁面切換微動畫 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
