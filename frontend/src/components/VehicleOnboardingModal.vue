<script setup>
import { ref } from 'vue'
import { useMotoStore } from '../stores/motoStore'
import { api } from '../services/api'
import { Bike, Gauge, Fuel, CheckCircle, Sparkles } from 'lucide-vue-next'

const store = useMotoStore()

const brands = [
  { value: 'SUZUKI', label: 'SUZUKI (台鈴機車)' },
  { value: 'SYM', label: 'SYM (三陽機車)' },
  { value: 'KYMCO', label: 'KYMCO (光陽機車)' },
  { value: 'YAMAHA', label: 'YAMAHA (山葉機車)' },
  { value: 'GOGORO', label: 'GOGORO (睿能創意)' },
  { value: 'HONDA', label: 'HONDA (本田機車)' },
  { value: 'VESPA', label: 'VESPA (偉士牌)' },
  { value: 'PGO', label: 'PGO (摩特動力)' },
  { value: 'AEON', label: 'AEON (宏佳騰)' },
  { value: 'OTHER', label: '其他廠牌 (自行填寫)' }
]

const selectedBrand = ref('SUZUKI')
const customBrand = ref('')
const modelName = ref('SUI 125')
const licensePlate = ref('')
const currentOdo = ref(0)
const tankCapacity = ref(5.5)
const fuelType = ref('92')

const errorMsg = ref('')
const isSubmitting = ref(false)

const handleBrandChange = () => {
  if (selectedBrand.value === 'SUZUKI' && !modelName.value) {
    modelName.value = 'SUI 125'
  } else if (selectedBrand.value === 'SYM' && (!modelName.value || modelName.value === 'SUI 125')) {
    modelName.value = 'Fiddle 125'
  } else if (selectedBrand.value === 'KYMCO' && (!modelName.value || modelName.value === 'SUI 125')) {
    modelName.value = 'KRV 180'
  } else if (selectedBrand.value === 'YAMAHA' && (!modelName.value || modelName.value === 'SUI 125')) {
    modelName.value = 'Cygnus Gryphus 125'
  }
}

const submitOnboarding = async () => {
  errorMsg.value = ''
  
  const finalBrand = selectedBrand.value === 'OTHER' ? (customBrand.value.trim() || '其他廠牌') : selectedBrand.value
  const finalModel = modelName.value.trim()
  const finalPlate = licensePlate.value.trim().toUpperCase()

  if (!finalModel) {
    errorMsg.value = '請填寫愛車的車型或機型名稱'
    return
  }

  if (currentOdo.value === '' || currentOdo.value === null || Number(currentOdo.value) < 0) {
    errorMsg.value = '請填寫目前愛車總累積里程 (新車可填 0)'
    return
  }

  isSubmitting.value = true

  const vehiclePayload = {
    brand: finalBrand,
    model: finalModel,
    name: `${finalBrand} ${finalModel}`,
    licensePlate: finalPlate || 'MY-MOTO',
    tankCapacity: Number(tankCapacity.value) || 5.5,
    fuelType: fuelType.value || '92',
    currentOdo: Number(currentOdo.value) || 0,
    isInitialized: true,
    is_initialized: 1
  }

  try {
    store.vehicle = {
      ...store.vehicle,
      ...vehiclePayload
    }
    store.persist()

    if (store.isAuthenticated) {
      await api.updateVehicle(vehiclePayload)
      if (Number(currentOdo.value) > 0) {
        await api.updateOdometer(Number(currentOdo.value)).catch(() => {})
      }
    }
  } catch (err) {
    console.warn('Onboarding sync error:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-header">
        <div class="header-icon-box">
          <Sparkles :size="24" class="sparkle-icon" />
          <Bike :size="32" class="bike-icon" />
        </div>
        <h2 class="onboarding-title">歡迎加入智慧車庫！</h2>
        <p class="onboarding-subtitle">
          每位車主的愛車都是獨一無二的。<br/>
          請先建立您的愛車檔案，系統將為您客製保養週期與 AI 健檢！
        </p>
      </div>

      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <form class="onboarding-form" @submit.prevent="submitOnboarding">
        <!-- 廠牌與車型 -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">愛車廠牌 <span class="req-star">*</span></label>
            <select v-model="selectedBrand" class="form-select" @change="handleBrandChange">
              <option v-for="b in brands" :key="b.value" :value="b.value">
                {{ b.label }}
              </option>
            </select>
          </div>
          
          <div v-if="selectedBrand === 'OTHER'" class="form-group flex-1">
            <label class="form-label">自訂廠牌名稱 <span class="req-star">*</span></label>
            <input 
              v-model="customBrand" 
              type="text" 
              class="form-input" 
              placeholder="例如: BMW, KAWASAKI" 
            />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">車型 / 機型名稱 <span class="req-star">*</span></label>
            <input 
              v-model="modelName" 
              type="text" 
              class="form-input" 
              placeholder="例如: Fiddle 125, SUI 125, MMBCU" 
              required
            />
          </div>
        </div>

        <!-- 目前總里程與車牌 -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">目前總累積里程 (KM) <span class="req-star">*</span></label>
            <div class="input-with-icon">
              <Gauge :size="16" class="field-icon" />
              <input 
                v-model.number="currentOdo" 
                type="number" 
                min="0"
                step="1"
                class="form-input icon-indent" 
                placeholder="例如: 0 或 3500" 
                required
              />
            </div>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">車牌號碼 (選填)</label>
            <input 
              v-model="licensePlate" 
              type="text" 
              class="form-input" 
              placeholder="例如: ABC-1234" 
            />
          </div>
        </div>

        <!-- 油箱容量與推薦油品 -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">油箱容量 (L)</label>
            <div class="input-with-icon">
              <Fuel :size="16" class="field-icon" />
              <input 
                v-model.number="tankCapacity" 
                type="number" 
                step="0.1" 
                min="1"
                max="50"
                class="form-input icon-indent" 
              />
            </div>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">推薦適用油品</label>
            <select v-model="fuelType" class="form-select">
              <option value="92">92 無鉛汽油</option>
              <option value="95">95 無鉛汽油</option>
              <option value="98">98 無鉛汽油</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-submit-onboarding" :disabled="isSubmitting">
          <span v-if="isSubmitting">正在儲存愛車檔案...</span>
          <span v-else class="btn-content">
            <CheckCircle :size="18" /> 完成設定，開啟專屬數位座艙
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(4, 8, 16, 0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.3s ease;
}

.onboarding-card {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(165deg, rgba(26, 38, 57, 0.95), rgba(13, 20, 32, 0.98));
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: var(--radius-lg, 16px);
  padding: 28px 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 91, 172, 0.25);
}

.onboarding-header {
  text-align: center;
  margin-bottom: 22px;
}

.header-icon-box {
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0 auto 12px auto;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 91, 172, 0.3), rgba(230, 0, 18, 0.2));
  border: 1px solid rgba(56, 189, 248, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0, 91, 172, 0.4);
}

.bike-icon {
  color: #38bdf8;
}

.sparkle-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  color: #fbbf24;
  animation: pulse 2s infinite ease-in-out;
}

.onboarding-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.onboarding-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary, #94a3b8);
  line-height: 1.5;
}

.req-star {
  color: #f87171;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.84rem;
  margin-bottom: 16px;
  text-align: center;
}

.onboarding-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, #cbd5e1);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted, #64748b);
  pointer-events: none;
}

.icon-indent {
  padding-left: 36px !important;
}

.btn-submit-onboarding {
  width: 100%;
  padding: 13px;
  margin-top: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  background: linear-gradient(135deg, #005bac, #0284c7);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 91, 172, 0.4);
}

.btn-submit-onboarding:hover:not(:disabled) {
  background: linear-gradient(135deg, #0284c7, #38bdf8);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 91, 172, 0.6);
}

.btn-submit-onboarding:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
}

@media (max-width: 480px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
