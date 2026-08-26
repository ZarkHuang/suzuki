<script setup>
import { onMounted } from 'vue'
import Header from './components/Header.vue'
import NavBar from './components/NavBar.vue'
import AuthModal from './components/AuthModal.vue'
import { useMotoStore } from './stores/motoStore'

const store = useMotoStore()

onMounted(() => {
  store.initSyncWithBackend()
})
</script>

<template>
  <div class="app-root">
    <!-- 動態背景網格與光暈效果 -->
    <div class="bg-mesh-pattern"></div>

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

    <!-- SaaS 登入 / 註冊彈窗 -->
    <AuthModal />
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
