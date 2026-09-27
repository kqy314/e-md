import type { RecentFile, Settings } from '../types'

const SETTINGS_KEY = 'emd.settings'
const RECENT_KEY = 'emd.recent'
const DRAFT_KEY = 'emd.draft'
export const MAX_RECENT = 10

const defaultSettings: Settings = {
  theme: 'system',
  viewMode: 'split',
  fontSize: 16,
  autoSave: true,
  accent: 'indigo',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // 存储不可用时静默忽略
  }
}

export function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as RecentFile[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveRecentFiles(files: RecentFile[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(files.slice(0, MAX_RECENT)))
  } catch {
    // 存储不可用时静默忽略
  }
}

/* ---------------- 自动保存草稿 ---------------- */

/** 保存未保存的编辑草稿 */
export function saveDraft(content: string) {
  try {
    localStorage.setItem(DRAFT_KEY, content)
  } catch {
    // 存储不可用时静默忽略
  }
}

/** 读取上次留下的草稿（无则返回 null） */
export function loadDraft(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY)
  } catch {
    return null
  }
}

/** 清除草稿（保存成功或用户明确丢弃后调用） */
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // 忽略
  }
}
