import { ref, computed, onMounted, onUnmounted } from 'vue'
import { darkTheme } from 'naive-ui'

const DEFAULT_PRIMARY = '#3b82f6'

// ── 从 kivii-theme localStorage 读取 primaryColor ──
function readPrimaryColor(): string {
  try {
    const raw = localStorage.getItem('kivii-theme')
    if (raw) {
      const theme = JSON.parse(raw)
      return theme.primaryColor || DEFAULT_PRIMARY
    }
  } catch {}
  return DEFAULT_PRIMARY
}

// ── 颜色工具：生成 hover / pressed 变体 ──
function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [59, 130, 246]
}

function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = (v: number) => Math.min(255, Math.round(v + (255 - v) * t)).toString(16).padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

function darken(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = (v: number) => Math.max(0, Math.round(v * (1 - t))).toString(16).padStart(2, '0')
  return `#${f(r)}${f(g)}${f(b)}`
}

export function useTheme() {
  const isDark = ref(false)
  const primaryColor = ref(readPrimaryColor())

  let observer: MutationObserver | null = null

  const syncTheme = () => {
    primaryColor.value = readPrimaryColor()
  }

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')
    primaryColor.value = readPrimaryColor()

    // 监听 <html> class 变化（暗色模式）及 style 属性变化
    observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark')
      primaryColor.value = readPrimaryColor()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    // 跨 tab 的 localStorage 变化
    window.addEventListener('storage', syncTheme)
    // 同 tab 的自定义主题变更事件（宿主应用 dispatch 此事件）
    window.addEventListener('kivii-theme-change', syncTheme)
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    window.removeEventListener('storage', syncTheme)
    window.removeEventListener('kivii-theme-change', syncTheme)
  })

  // NaiveUI 主题
  const naiveTheme = computed(() => isDark.value ? darkTheme : null)

  // 将 primaryColor 注入 NaiveUI themeOverrides
  const themeOverrides = computed(() => {
    const c = primaryColor.value
    return {
      common: {
        primaryColor: c,
        primaryColorHover: lighten(c, 0.2),
        primaryColorPressed: darken(c, 0.1),
        primaryColorSuppl: lighten(c, 0.1),
      }
    }
  })

  return {
    isDark,
    primaryColor,
    naiveTheme,
    themeOverrides
  }
}
