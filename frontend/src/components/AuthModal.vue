<script setup>
import { ref, watch, nextTick } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-vue-next'

const store = useMotoStore()

const isLoginMode = ref(true)
const email = ref('')
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const switchMode = () => {
  isLoginMode.value = !isLoginMode.value
  errorMsg.value = ''
}

// 解析 Google JWT Token
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

// 處理 Google 官方登入成功回調
const handleGoogleCredentialResponse = async (response) => {
  if (!response || !response.credential) return
  isLoading.value = true
  errorMsg.value = ''
  try {
    const payload = parseJwt(response.credential)
    if (!payload || !payload.email) {
      throw new Error('無法取得 Google 帳號資訊')
    }
    const res = await store.loginWithGoogle(
      payload.email,
      payload.name || payload.email.split('@')[0],
      payload.sub,
      payload.picture
    )
    if (!res.success) {
      errorMsg.value = res.error || 'Google 登入失敗'
    }
  } catch (err) {
    errorMsg.value = err.message || 'Google 登入異常'
  } finally {
    isLoading.value = false
  }
}

// 初始化 Google GSI 官方正版按鈕
const initGoogleGsi = () => {
  if (typeof window !== 'undefined' && window.google && window.google.accounts) {
    try {
      window.google.accounts.id.initialize({
        client_id: '753471788844-83jtr2msd112s0adrbhakipfnd3tttu9.apps.googleusercontent.com',
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      })

      const btnContainer = document.getElementById('google-btn-container')
      if (btnContainer) {
        btnContainer.innerHTML = ''
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill'
        })
      }
    } catch (e) {
      console.warn('Google GSI 初始化提示:', e)
    }
  }
}



// 監聽彈窗開啟時自動加載 Google 按鈕
watch(() => store.isAuthModalOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      setTimeout(initGoogleGsi, 150)
    })
  }
})

const handleSubmit = async () => {

  errorMsg.value = ''
  if (!email.value || !password.value || (!isLoginMode.value && !username.value)) {
    errorMsg.value = '請填寫所有必要欄位'
    return
  }

  isLoading.value = true
  try {
    let res
    if (isLoginMode.value) {
      res = await store.login(email.value, password.value)
    } else {
      res = await store.register(username.value, email.value, password.value)
    }

    if (!res.success) {
      errorMsg.value = res.error || '登入/註冊失敗，請檢查資料'
    } else {
      email.value = ''
      username.value = ''
      password.value = ''
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="store.isAuthModalOpen" class="modal-backdrop" @click.self="store.closeAuthModal">
    <div class="modal-card">
      <!-- 關閉按鈕 -->
      <button class="btn-close" @click="store.closeAuthModal">
        <X :size="20" />
      </button>

      <!-- 頂部品牌標題 -->
      <div class="modal-header">
        <div class="brand-badge">
          <ShieldCheck :size="20" />
          <span>SUZUKI SUI 125 雲端車庫</span>
        </div>
        <h3 class="modal-title">
          {{ isLoginMode ? '車主登入' : '註冊新車主帳號' }}
        </h3>
        <p class="modal-subtitle">
          {{ isLoginMode ? '登入以同步您個人的 SUI 125 油耗與保養數據' : '建立專屬帳號，享受 24 小時跨裝置雲端資料隔離' }}
        </p>
      </div>

      <!-- Google 原生官方一鍵登入容器 -->
      <div class="google-auth-wrapper">
        <div id="google-btn-container" class="google-native-btn"></div>
      </div>

      <div class="divider-row">
        <span>或使用 Email 帳密</span>
      </div>


      <!-- 表單 -->
      <form class="auth-form" @submit.prevent="handleSubmit">
        <!-- 使用者名稱 (僅註冊模式) -->
        <div v-if="!isLoginMode" class="form-group">
          <label class="form-label">車主稱呼 / 暱稱</label>
          <div class="input-wrapper">
            <User :size="18" class="input-icon" />
            <input 
              v-model="username" 
              type="text" 
              placeholder="例如：小鴨騎士" 
              class="form-input" 
              required
            />
          </div>
        </div>

        <!-- 電子郵件 -->
        <div class="form-group">
          <label class="form-label">電子郵件 (Email)</label>
          <div class="input-wrapper">
            <Mail :size="18" class="input-icon" />
            <input 
              v-model="email" 
              type="email" 
              placeholder="name@example.com" 
              class="form-input" 
              required
            />
          </div>
        </div>

        <!-- 密碼 -->
        <div class="form-group">
          <label class="form-label">登入密碼</label>
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            <input 
              v-model="password" 
              type="password" 
              placeholder="••••••••" 
              class="form-input" 
              required
            />
          </div>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="errorMsg" class="error-banner">
          {{ errorMsg }}
        </div>

        <!-- 送出按鈕 -->
        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="!isLoading">{{ isLoginMode ? '立即登入' : '完成註冊並登入' }}</span>
          <span v-else>處理中...</span>
          <ArrowRight :size="18" />
        </button>
      </form>

      <!-- 切換模式連結 -->
      <div class="modal-footer">
        <span>{{ isLoginMode ? '還沒有專屬車庫帳號？' : '已經有車主帳號？' }}</span>
        <button class="btn-switch" @click="switchMode">
          {{ isLoginMode ? '立即免費註冊' : '切換為登入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

.modal-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: #14171f;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg, 16px);
  padding: 32px 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 210, 255, 0.1);
}

.btn-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--text-muted, #71717a);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(0, 210, 255, 0.1);
  border: 1px solid rgba(0, 210, 255, 0.2);
  border-radius: 999px;
  color: var(--color-primary, #00d2ff);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.modal-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary, #a1a1aa);
  line-height: 1.4;
}

.google-auth-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
}

.google-native-btn {
  margin-bottom: 8px;
}

.btn-google {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-md, 10px);
  color: #1e293b;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-google:hover:not(:disabled) {
  background: #f8fafc;
  transform: translateY(-1px);
}

.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider-row {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-muted, #71717a);
  font-size: 0.78rem;
  margin-bottom: 16px;
}

.divider-row::before,
.divider-row::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.divider-row span {
  padding: 0 10px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.82rem;
  color: var(--text-secondary, #a1a1aa);
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
  color: #71717a;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 11px 14px 11px 42px;
  background: #0a0c10;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-md, 10px);
  color: #fff;
  font-size: 0.92rem;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary, #00d2ff);
  box-shadow: 0 0 0 3px rgba(0, 210, 255, 0.2);
}

.error-banner {
  padding: 9px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md, 8px);
  color: #f87171;
  font-size: 0.82rem;
  text-align: center;
}

.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  background: linear-gradient(135deg, #00d2ff, #0077ff);
  border: none;
  border-radius: var(--radius-md, 10px);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(0, 119, 255, 0.4);
  margin-top: 6px;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 6px 20px rgba(0, 119, 255, 0.6);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-footer {
  margin-top: 18px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-secondary, #a1a1aa);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-switch {
  background: transparent;
  border: none;
  color: var(--color-primary, #00d2ff);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
