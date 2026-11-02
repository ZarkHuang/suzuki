<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { 
  RotateCw, 
  Lightbulb, 
  Flame, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Palette,
  Camera
} from 'lucide-vue-next'
import { Moto3DShowroomController, MOTO_COLOR_THEMES } from '../utils/moto3dRenderer'

const canvasRef = ref(null)
let controller = null

const isAutoRotate = ref(true)
const isLightsOn = ref(true)
const isEngineRunning = ref(true)
const activeTheme = ref('sui_black')
const activePreset = ref('hero')
const isExpanded = ref(false)
const isDragging = ref(false)
const hasInteracted = ref(false)

const themes = Object.values(MOTO_COLOR_THEMES)
const presets = [
  { id: 'hero', label: '型錄 45°' },
  { id: 'side', label: '正側面' },
  { id: 'front', label: '方圓大燈' },
  { id: 'rear', label: '車尾排氣管' },
  { id: 'top', label: '俯視內裝' }
]

let lastPointerX = 0
let lastPointerY = 0
let lastPinchDist = 0

onMounted(() => {
  if (!canvasRef.value) return
  try {
    controller = new Moto3DShowroomController(canvasRef.value, {
      autoRotate: isAutoRotate.value,
      lightsOn: isLightsOn.value,
      engineRunning: isEngineRunning.value,
      themeId: activeTheme.value
    })
  } catch (err) {
    console.error('3D Showroom init failed:', err)
  }
})

onBeforeUnmount(() => {
  if (controller) {
    controller.dispose()
    controller = null
  }
})

// 滑鼠事件
const onMouseDown = (e) => {
  isDragging.value = true
  hasInteracted.value = true
  lastPointerX = e.clientX
  lastPointerY = e.clientY
}

const onMouseMove = (e) => {
  if (!isDragging.value || !controller) return
  const dx = e.clientX - lastPointerX
  const dy = e.clientY - lastPointerY
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  controller.onPointerDrag(dx, dy)
}

const onMouseUp = () => {
  isDragging.value = false
}

const onWheel = (e) => {
  if (!controller) return
  e.preventDefault()
  controller.zoom(e.deltaY * 0.0025)
}

// 觸控事件 (單指 360° 翻轉 + 雙指縮放)
const onTouchStart = (e) => {
  hasInteracted.value = true
  if (e.touches.length === 1) {
    isDragging.value = true
    lastPointerX = e.touches[0].clientX
    lastPointerY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    isDragging.value = false
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    lastPinchDist = Math.hypot(dx, dy)
  }
}

const onTouchMove = (e) => {
  if (!controller) return
  if (e.touches.length === 1 && isDragging.value) {
    if (e.cancelable) e.preventDefault()
    const dx = e.touches[0].clientX - lastPointerX
    const dy = e.touches[0].clientY - lastPointerY
    lastPointerX = e.touches[0].clientX
    lastPointerY = e.touches[0].clientY
    controller.onPointerDrag(dx, dy)
  } else if (e.touches.length === 2) {
    if (e.cancelable) e.preventDefault()
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    if (lastPinchDist > 0) {
      controller.zoom((lastPinchDist - dist) * 0.015)
    }
    lastPinchDist = dist
  }
}

const onTouchEnd = () => {
  isDragging.value = false
  lastPinchDist = 0
}

// 控制項切換
const toggleAutoRotate = () => {
  isAutoRotate.value = !isAutoRotate.value
  controller?.setAutoRotate(isAutoRotate.value)
}

const toggleLights = () => {
  isLightsOn.value = !isLightsOn.value
  controller?.setLightsOn(isLightsOn.value)
}

const toggleEngine = () => {
  isEngineRunning.value = !isEngineRunning.value
  controller?.setEngineRunning(isEngineRunning.value)
}

const selectTheme = (id) => {
  activeTheme.value = id
  controller?.setTheme(id)
}

const selectPreset = (id) => {
  activePreset.value = id
  isAutoRotate.value = false
  controller?.setPresetView(id)
}

const handleZoom = (delta) => {
  controller?.zoom(delta)
}
</script>

<template>
  <div class="showroom-card" :class="{ 'showroom-expanded': isExpanded }">
    <!-- 頂部展示台標題與狀態列 -->
    <div class="showroom-header">
      <div class="showroom-title-group">
        <span class="showroom-live-dot"></span>
        <div>
          <div class="showroom-title">SUZUKI SUI 125 · 3D 數位展示台</div>
          <div class="showroom-subtitle">魚子醬黑實車造型 · 360° 自由拖曳翻轉賞車</div>
        </div>
      </div>

      <div class="showroom-top-actions">
        <button 
          type="button" 
          class="btn-icon-pill" 
          @click="handleZoom(-0.45)" 
          title="放大檢視"
        >
          <ZoomIn :size="14" />
        </button>
        <button 
          type="button" 
          class="btn-icon-pill" 
          @click="handleZoom(0.45)" 
          title="縮小檢視"
        >
          <ZoomOut :size="14" />
        </button>
        <button 
          type="button" 
          class="btn-icon-pill" 
          @click="isExpanded = !isExpanded" 
          :title="isExpanded ? '縮小展示台' : '放大展示台'"
        >
          <Minimize2 v-if="isExpanded" :size="14" />
          <Maximize2 v-else :size="14" />
        </button>
      </div>
    </div>

    <!-- 3D WebGL 畫布舞台區 -->
    <div 
      class="showroom-stage"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel.passive="false"
      @wheel="onWheel"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- 舞台背景聚光燈光暈 -->
      <div class="stage-spotlight"></div>

      <canvas ref="canvasRef" class="showroom-canvas"></canvas>

      <!-- 首次互動手勢提示 -->
      <transition name="fade">
        <div v-if="!hasInteracted" class="gesture-hint">
          <span>👆 左右滑動 360° 翻轉賞車</span>
        </div>
      </transition>

      <!-- 快速視角切換膠囊列 -->
      <div class="preset-camera-bar" @mousedown.stop @touchstart.stop>
        <Camera :size="12" class="preset-cam-icon" />
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          class="preset-chip"
          :class="{ active: activePreset === p.id && !isAutoRotate }"
          @click="selectPreset(p.id)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- 底部互動控制台：展示台功能鍵 + 塗裝切換 -->
    <div class="showroom-controls">
      <div class="control-toggles">
        <button 
          type="button" 
          class="ctrl-btn" 
          :class="{ active: isAutoRotate }" 
          @click="toggleAutoRotate"
        >
          <RotateCw :size="14" :class="{ 'spin-icon': isAutoRotate }" />
          <span>自動展台</span>
        </button>

        <button 
          type="button" 
          class="ctrl-btn" 
          :class="{ 'active-amber': isLightsOn }" 
          @click="toggleLights"
        >
          <Lightbulb :size="14" />
          <span>{{ isLightsOn ? '車燈開啟' : '車燈關閉' }}</span>
        </button>

        <button 
          type="button" 
          class="ctrl-btn" 
          :class="{ 'active-red': isEngineRunning }" 
          @click="toggleEngine"
        >
          <Flame :size="14" />
          <span>{{ isEngineRunning ? '引擎運轉' : '引擎熄火' }}</span>
        </button>
      </div>

      <!-- 塗裝配色切換器 -->
      <div class="theme-selector-row">
        <div class="theme-label">
          <Palette :size="13" />
          <span>車色塗裝：</span>
        </div>
        <div class="theme-swatches">
          <button
            v-for="t in themes"
            :key="t.id"
            type="button"
            class="theme-pill"
            :class="{ selected: activeTheme === t.id }"
            @click="selectTheme(t.id)"
          >
            <span class="swatch-dot" :style="{ backgroundColor: t.badgeColor }"></span>
            <span>{{ t.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.showroom-card {
  background: radial-gradient(circle at 50% 38%, #1e293b 0%, #0f1420 65%, #090c14 100%);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
  transition: all 0.25s ease;
}

.showroom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  position: relative;
  z-index: 2;
}

.showroom-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.showroom-live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  flex-shrink: 0;
}

.showroom-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

.showroom-subtitle {
  font-size: 0.72rem;
  color: #94a3b8;
}

.showroom-top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon-pill {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon-pill:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #fff;
  border-color: rgba(56, 189, 248, 0.4);
}

.showroom-stage {
  position: relative;
  width: 100%;
  height: 270px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.showroom-expanded .showroom-stage {
  height: 390px;
}

.showroom-stage:active {
  cursor: grabbing;
}

.stage-spotlight {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.16) 0%, transparent 62%),
    radial-gradient(ellipse at 50% 82%, rgba(14, 165, 233, 0.22) 0%, transparent 55%);
  pointer-events: none;
}

.showroom-canvas {
  width: 100%;
  height: 100%;
  display: block;
  position: relative;
  z-index: 1;
}

.gesture-hint {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #e0f2fe;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  pointer-events: none;
  z-index: 3;
  white-space: nowrap;
  backdrop-filter: blur(6px);
}

.preset-camera-bar {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 999px;
  z-index: 3;
  max-width: 96%;
  overflow-x: auto;
  backdrop-filter: blur(8px);
}

.preset-cam-icon {
  color: #38bdf8;
  flex-shrink: 0;
  margin-right: 2px;
}

.preset-chip {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.preset-chip:hover {
  color: #f8fafc;
}

.preset-chip.active {
  background: rgba(56, 189, 248, 0.22);
  color: #38bdf8;
}

.showroom-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.control-toggles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.ctrl-btn.active {
  background: rgba(56, 189, 248, 0.16);
  border-color: rgba(56, 189, 248, 0.45);
  color: #38bdf8;
}

.ctrl-btn.active-amber {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}

.ctrl-btn.active-red {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.45);
  color: #f87171;
}

.spin-icon {
  animation: spin 4s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.theme-selector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.theme-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #94a3b8;
  white-space: nowrap;
}

.theme-swatches {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  justify-content: flex-end;
}

.theme-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.theme-pill.selected {
  background: rgba(255, 255, 255, 0.14);
  border-color: #38bdf8;
  color: #fff;
}

.swatch-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

