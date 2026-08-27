<script setup>
import { ref } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { X, Lock, Mail, ArrowRight, ShieldCheck, User } from 'lucide-vue-next'

const store = useMotoStore()

const isRegisterMode = ref(false)
const username = ref('')
const email = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!email.value.trim() || !password.value) {
    errorMsg.value = '請填寫 Email 與密碼'
    return
  }

  isLoading.value = true
  try {
    let res
    if (isRegisterMode.value) {
      const nick = username.value.trim() || email.value.split('@')[0]
      res = await store.register(nick, email.value.trim(), password.value)
    } else {
      res = await store.login(email.value.trim(), password.value)
    }

    if (!res.success) {
      errorMsg.value = res.error || (isRegisterMode.value ? '註冊失敗，請檢查資料' : '帳號或密碼錯誤')
    } else {
      email.value = ''
      password.value = ''
      username.value = ''
      store.closeAuthModal()
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="store.isAuthModalOpen" class="modal-backdrop" @click.self="store.closeAuthModal">
    <div class="modal-card">
      <button class="btn-close" @click="store.closeAuthModal">
        <X :size="20" />
      </button>

      <div class="modal-header">
        <div class="brand-badge">
          <ShieldCheck :size="18" />
          <span>SUZUKI SUI 125 專屬車庫</span>
        </div>
        <h3 class="modal-title">{{ isRegisterMode ? '建立新車主帳號' : '車主帳號登入' }}</h3>
        <p class="modal-subtitle">
          {{ isRegisterMode ? '註冊後將立即開通專屬雲端 MySQL 車庫' : '登入後立即同步愛車各項即時紀錄' }}
        </p>
      </div>

      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div v-if="isRegisterMode" class="form-group">
          <div class="input-wrapper">
            <User :size="18" class="input-icon" />
            <input 
              v-model="username" 
              type="text" 
              placeholder="車主暱稱 (選填)" 
              class="form-input" 
            />
          </div>
        </div>

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

        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="!isLoading">{{ isRegisterMode ? '立即註冊並登入' : '登入車庫' }}</span>
          <span v-else>處理中...</span>
          <ArrowRight :size="18" />
        </button>
      </form>

      <div class="modal-toggle-row">
        <button class="btn-toggle-mode" @click="isRegisterMode = !isRegisterMode; errorMsg = ''">
          {{ isRegisterMode ? '已有帳號？點此登入' : '還沒有帳號？點此免費註冊' }}
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
}

.modal-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: #14171f;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 30px 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.btn-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: #71717a;
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
  background: rgba(0, 91, 172, 0.15);
  border: 1px solid rgba(0, 91, 172, 0.3);
  border-radius: 999px;
  color: #38bdf8;
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
  color: #a1a1aa;
  line-height: 1.4;
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
  border-radius: 10px;
  color: #fff;
  font-size: 0.92rem;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.error-banner {
  padding: 9px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
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
  background: linear-gradient(135deg, #005BAC 0%, #0284c7 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(0, 91, 172, 0.4);
  margin-top: 4px;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-toggle-row {
  margin-top: 16px;
  text-align: center;
}

.btn-toggle-mode {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 0.84rem;
  cursor: pointer;
  text-decoration: underline;
}
</style>
