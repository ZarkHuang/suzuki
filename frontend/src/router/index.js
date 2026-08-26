import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import FuelView from '../views/FuelView.vue'
import MaintenanceView from '../views/MaintenanceView.vue'
import ModsView from '../views/ModsView.vue'
import AiDiagnosisView from '../views/AiDiagnosisView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: '儀表首頁' }
  },
  {
    path: '/fuel',
    name: 'fuel',
    component: FuelView,
    meta: { title: '油耗紀錄' }
  },
  {
    path: '/maintenance',
    name: 'maintenance',
    component: MaintenanceView,
    meta: { title: '保養與零件' }
  },
  {
    path: '/mods',
    name: 'mods',
    component: ModsView,
    meta: { title: '改裝日誌' }
  },
  {
    path: '/ai',
    name: 'ai',
    component: AiDiagnosisView,
    meta: { title: 'AI 健檢' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: '系統設定' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
