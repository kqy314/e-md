import type { Accent, ThemeMode } from '../types'

const mql = window.matchMedia('(prefers-color-scheme: dark)')

export function effectiveDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && mql.matches)
}

/** 将主题状态应用到文档根节点 */
export function applyTheme(mode: ThemeMode) {
  const dark = effectiveDark(mode)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', dark ? '#0b0d10' : '#f7f7f8')
  }
}

/** 将主题配色（强调色）应用到文档根节点 */
export function applyAccent(accent: Accent) {
  document.documentElement.setAttribute('data-accent', accent)
}

/** 系统主题变化监听（跟随系统模式下自动切换） */
export function watchSystemTheme(onChange: () => void): () => void {
  const handler = () => onChange()
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
