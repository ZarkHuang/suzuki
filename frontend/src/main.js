import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { registerSW } from 'virtual:pwa-register'

// PWA 自動檢查與熱更新 (每 30 秒自動向 Vercel 檢查最新版本)
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🚀 PWA 檢測到新版本，正在自動熱更新...')
  },
  onRegistered(r) {
    if (r) {
      setInterval(() => {
        r.update()
      }, 30000)
    }
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

