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
    const dark = isDark.value
    const surfaceColor = dark ? '#182235' : '#ffffff'
    const headerColor = dark ? '#202c40' : '#f5f7fa'
    const borderColor = dark ? '#344258' : '#e5e7eb'
    const textColor = dark ? '#e5e7eb' : '#374151'
    const mutedTextColor = dark ? '#9ca3af' : '#6b7280'
    const hoverColor = dark ? '#22304a' : '#f5f7ff'
    const stripedColor = dark ? '#1c283d' : '#fafbfc'

    return {
      common: {
        primaryColor: c,
        primaryColorHover: lighten(c, 0.2),
        primaryColorPressed: darken(c, 0.1),
        primaryColorSuppl: lighten(c, 0.1),
        borderRadius: '1rem',
        borderRadiusSmall: '8px',
        dividerColor: borderColor,
        textColorBase: textColor,
        textColor2: textColor,
        textColor3: mutedTextColor,
      },
      Card: {
        color: surfaceColor,
        borderColor,
        borderRadius: '1rem',
        boxShadow: dark
          ? '0 1px 2px rgba(0, 0, 0, 0.24)'
          : '0 1px 2px rgba(15, 23, 42, 0.04)',
      },
      DataTable: {
        borderRadius: '1rem',
        borderColor,
        thColor: headerColor,
        thColorHover: hoverColor,
        thColorSorting: hoverColor,
        tdColor: surfaceColor,
        tdColorHover: hoverColor,
        tdColorSorting: hoverColor,
        tdColorStriped: stripedColor,
        thTextColor: textColor,
        tdTextColor: textColor,
        thFontWeight: '600',
        fontSizeSmall: '13px',
        thPaddingSmall: '10px 12px',
        tdPaddingSmall: '9px 12px',
        paginationMargin: '12px 0 4px 0',
      },
      Input: {
        heightSmall: '32px',
        borderRadius: '8px',
      },
      Button: {
        heightSmall: '32px',
        borderRadiusSmall: '8px',
      },
      Pagination: {
        itemBorderRadius: '8px',
        itemSizeSmall: '30px',
      },
    }
  })

  return {
    isDark,
    primaryColor,
    naiveTheme,
    themeOverrides
  }
}
