<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMotoStore } from '../stores/motoStore'
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Database,
  Smartphone
} from 'lucide-vue-next'

const router = useRouter()
const store = useMotoStore()

const activeTab = ref('login') // 'login' | 'register'
const username = ref('')
const email = ref('')
const password = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const isLoading = ref(false)

// 處理 Email 登入
const handleLogin = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  if (!email.value.trim() || !password.value) {
    errorMsg.value = '請輸入 Email 與登入密碼'
    return
  }

  isLoading.value = true
  try {
    const res = await store.login(email.value.trim(), password.value)
    if (res.success) {
      router.push('/')
    } else {
      errorMsg.value = res.error || '帳號或密碼錯誤，若尚未註冊請先點選「註冊帳號」'
    }
  } finally {
    isLoading.value = false
  }
}

// 處理 Email 註冊
const handleRegister = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  if (!email.value.trim() || !password.value) {
    errorMsg.value = '請填寫 Email 與註冊密碼'
    return
  }

  if (password.value.length < 6) {
    errorMsg.value = '密碼長度建議至少 6 個字元'
    return
  }

  isLoading.value = true
  try {
    const nick = username.value.trim() || email.value.split('@')[0]
    const res = await store.register(nick, email.value.trim(), password.value)
    if (res.success) {
      router.push('/')
    } else {
      errorMsg.value = res.error || '註冊失敗，該 Email 可能已被註冊'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-gate-wrapper">
    <div class="auth-gate-container">
      <!-- 頂部品牌展示 -->
      <div class="gate-header">
        <div class="suzuki-logo-glow">
          <img src="/icon.svg" alt="SUZUKI SUI 125" class="gate-logo-img" />
        </div>
        <h1 class="gate-title">SUZUKI SUI 125</h1>
        <p class="gate-subtitle">雲端智慧車庫 · SaaS 愛車全方位管家</p>
      </div>

      <!-- 登入 / 註冊卡片 -->
      <div class="gate-card">
        <!-- 頁籤切換 -->
        <div class="gate-tabs">
          <button 
            class="gate-tab" 
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'; errorMsg = ''"
          >
            車主登入
          </button>
          <button 
            class="gate-tab" 
            :class="{ active: activeTab === 'register' }"
            @click="activeTab = 'register'; errorMsg = ''"
          >
            新車主註冊
          </button>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="errorMsg" class="error-banner">
          {{ errorMsg }}
        </div>

        <!-- 登入表單 -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="gate-form">
          <div class="form-group">
            <label>車主信箱 (Email)</label>
            <div class="input-wrapper">
              <Mail :size="18" class="input-icon" />
              <input 
                v-model="email" 
                type="email" 
                required 
                placeholder="rider@example.com"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <label>帳號密碼</label>
            <div class="input-wrapper">
              <Lock :size="18" class="input-icon" />
              <input 
                v-model="password" 
                type="password" 
                required 
                placeholder="請輸入密碼"
                autocomplete="current-password"
              />
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-gate-submit" :disabled="isLoading">
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else>立即登入專屬車庫</span>
            <ArrowRight v-if="!isLoading" :size="18" />
          </button>
        </form>

        <!-- 註冊表單 -->
        <form v-else @submit.prevent="handleRegister" class="gate-form">
          <div class="form-group">
            <label>車主暱稱</label>
            <div class="input-wrapper">
              <User :size="18" class="input-icon" />
              <input 
                v-model="username" 
                type="text" 
                placeholder="例如：鴨鴨騎士 (選填)"
                autocomplete="nickname"
              />
            </div>
          </div>

          <div class="form-group">
            <label>電子信箱 (Email)</label>
            <div class="input-wrapper">
              <Mail :size="18" class="input-icon" />
              <input 
                v-model="email" 
                type="email" 
                required 
                placeholder="rider@example.com"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <label>設定密碼 (至少 6 位字元)</label>
            <div class="input-wrapper">
              <Lock :size="18" class="input-icon" />
              <input 
                v-model="password" 
                type="password" 
                required 
                placeholder="請設定密碼"
                autocomplete="new-password"
              />
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block btn-gate-submit" :disabled="isLoading">
            <span v-if="isLoading" class="loading-spinner"></span>
            <span v-else>建立新車主帳號</span>
            <ArrowRight v-if="!isLoading" :size="18" />
          </button>
        </form>
      </div>

      <!-- SaaS 雲端特色亮點說明 -->
      <div class="gate-features-grid">
        <div class="feature-card">
          <Database :size="18" class="feature-icon icon-blue" />
          <div class="feature-title">雲端 MySQL 隔離</div>
          <div class="feature-desc">每位車主資料完全獨立隔離</div>
        </div>

        <div class="feature-card">
          <Smartphone :size="18" class="feature-icon icon-cyan" />
          <div class="feature-title">PWA 離線安全驗證</div>
          <div class="feature-desc">支援手機桌面安裝與免重複登入</div>
        </div>

        <div class="feature-card">
          <ShieldCheck :size="18" class="feature-icon icon-amber" />
          <div class="feature-title">JWT 加密防護</div>
          <div class="feature-desc">嚴格 API 認證，保障愛車隱私</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-gate-wrapper {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: radial-gradient(circle at 50% 10%, #151a28 0%, #08090d 100%);
  position: relative;
  overflow: hidden;
}

.auth-gate-container {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 2;
}

/* 標頭 */
.gate-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.suzuki-logo-glow {
  width: 68px;
  height: 68px;
  background: linear-gradient(135deg, #005BAC 0%, #E60012 100%);
  border-radius: 20px;
  padding: 3px;
  box-shadow: 0 8px 24px rgba(0, 91, 172, 0.4);
  margin-bottom: 12px;
}

.gate-logo-img {
  width: 100%;
  height: 100%;
  background: #0d111a;
  border-radius: 17px;
  padding: 10px;
  object-fit: contain;
}

.gate-title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: #f8fafc;
  margin: 0;
}

.gate-subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 4px;
}

/* 主卡片 */
.gate-card {
  background: rgba(18, 22, 34, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

/* 頁籤 */
.gate-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.gate-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.92rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gate-tab.active {
  background: #005BAC;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 91, 172, 0.4);
}

/* 表單 */
.gate-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.form-group label {
  font-size: 0.82rem;
  color: #cbd5e1;
  font-weight: 500;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #64748b;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  background: rgba(10, 14, 22, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 12px 14px 12px 42px;
  color: #f8fafc;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

.btn-gate-submit {
  margin-top: 6px;
  padding: 13px;
  font-size: 0.98rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  background: linear-gradient(135deg, #005BAC 0%, #0284c7 100%);
  border: none;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.2s;
}

.btn-gate-submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-gate-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 特色網格 */
.gate-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.feature-card {
  background: rgba(18, 22, 34, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.feature-icon {
  margin-bottom: 2px;
}

.icon-blue { color: #38bdf8; }
.icon-cyan { color: #22d3ee; }
.icon-amber { color: #f59e0b; }

.feature-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e2e8f0;
}

.feature-desc {
  font-size: 0.65rem;
  color: #94a3b8;
  line-height: 1.2;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 16px;
  text-align: center;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
