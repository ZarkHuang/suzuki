<script setup>
import { ref, watch, nextTick } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-vue-next'

const store = useMotoStore()

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

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

// 處理 Google 官方登入/註冊回調 (沒登入過自動註冊，有登入過自動驗證)
const handleGoogleCredentialResponse = async (response) => {
  if (!response || !response.credential) return
  isLoading.value = true
  errorMsg.value = ''
  try {
    const payload = parseJwt(response.credential)
    if (!payload || !payload.email) {
      throw new Error('無法讀取 Google 帳號資訊')
    }
    const res = await store.loginWithGoogle(
      payload.email,
      payload.name || payload.email.split('@')[0],
      payload.sub,
      payload.picture
    )
    if (!res.success) {
      errorMsg.value = res.error || 'Google 登入失敗 (請確認後端已重新部署上線)'
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

// 傳統 Email 登入/註冊合一 (若未註冊直接註冊並登入)
const handleEmailSubmit = async () => {
  errorMsg.value = ''
  if (!email.value || !password.value) {
    errorMsg.value = '請填寫 Email 與密碼'
    return
  }

  isLoading.value = true
  try {
    // 先嘗試登入
    let res = await store.login(email.value, password.value)
    if (!res.success) {
      // 若帳號不存在或密碼錯誤，自動嘗試註冊
      const username = email.value.split('@')[0]
      res = await store.register(username, email.value, password.value)
    }

    if (!res.success) {
      errorMsg.value = res.error || '登入失敗，請檢查資料'
    } else {
      email.value = ''
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
        <h3 class="modal-title">車主 Google 一鍵快速登入</h3>
        <p class="modal-subtitle">
          首次使用點擊 Google 即自動建立專屬車庫；已是車主則自動同步愛車資料！
        </p>
      </div>

      <!-- Google 原生官方一鍵登入容器 (最核心、免註冊直接秒登) -->
      <div class="google-auth-wrapper">
        <div id="google-btn-container" class="google-native-btn"></div>
      </div>

      <!-- 錯誤提示 -->
      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <div class="divider-row">
        <span>或使用 Email 快速通行</span>
      </div>

      <!-- 備用 Email 表單 (自動判斷登入/註冊) -->
      <form class="auth-form" @submit.prevent="handleEmailSubmit">
        <!-- 電子郵件 -->
        <div class="form-group">
          <div class="input-wrapper">
            <Mail :size="18" class="input-icon" />
            <input 
              v-model="email" 
              type="email" 
              placeholder="您的 Email 信箱" 
              class="form-input" 
              required
            />
          </div>
        </div>

        <!-- 密碼 -->
        <div class="form-group">
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            <input 
              v-model="password" 
              type="password" 
              placeholder="密碼" 
              class="form-input" 
              required
            />
          </div>
        </div>

        <!-- 送出按鈕 -->
        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="!isLoading">快速通行 / 進入車庫</span>
          <span v-else>連線中...</span>
          <ArrowRight :size="18" />
        </button>
      </form>
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
  max-width: 400px;
  background: #14171f;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg, 16px);
  padding: 30px 24px;
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
  justify-content: center;
  margin-bottom: 16px;
  width: 100%;
}

.google-native-btn {
  display: flex;
  justify-content: center;
}

.divider-row {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--text-muted, #71717a);
  font-size: 0.78rem;
  margin: 16px 0;
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
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
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
  margin-bottom: 10px;
}

.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #00d2ff, #0077ff);
  border: none;
  border-radius: var(--radius-md, 10px);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(0, 119, 255, 0.4);
  margin-top: 4px;
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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
