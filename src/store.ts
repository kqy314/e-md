import { create } from 'zustand'
import { clearDraft, loadRecentFiles, loadSettings, MAX_RECENT } from './services/storage'
import type { Accent, FileInfo, RecentFile, Screen, ThemeMode, ViewMode } from './types'

export type LeaveKind = 'home'

interface AppState {
  screen: Screen
  file: FileInfo | null
  savedContent: string
  dirty: boolean
  viewMode: ViewMode
  theme: ThemeMode
  accent: Accent
  fontSize: number
  autoSave: boolean
  recentFiles: RecentFile[]
  settingsOpen: boolean
  templateOpen: boolean
  exportOpen: boolean
  unsavedDialog: boolean
  pendingLeave: LeaveKind | null
  toast: { msg: string; key: number } | null

  enterEditor: (file: FileInfo) => void
  updateContent: (content: string) => void
  markSaved: () => void
  exitEditor: () => void
  setViewMode: (m: ViewMode) => void
  setTheme: (t: ThemeMode) => void
  cycleTheme: () => void
  setAccent: (a: Accent) => void
  setFontSize: (n: number) => void
  setAutoSave: (on: boolean) => void
  addRecent: (file: FileInfo) => void
  removeRecent: (id: string) => void
  toggleSettings: (open: boolean) => void
  toggleTemplate: (open: boolean) => void
  toggleExport: (open: boolean) => void
  setUnsavedDialog: (open: boolean) => void
  requestLeave: (kind: LeaveKind) => void
  confirmLeave: () => void
  showToast: (msg: string) => void
}

const initial = loadSettings()
let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useStore = create<AppState>((set, get) => ({
  screen: 'home',
  file: null,
  savedContent: '',
  dirty: false,
  viewMode: initial.viewMode,
  theme: initial.theme,
  accent: initial.accent,
  fontSize: initial.fontSize,
  autoSave: initial.autoSave,
  recentFiles: loadRecentFiles(),
  settingsOpen: false,
  templateOpen: false,
  exportOpen: false,
  unsavedDialog: false,
  pendingLeave: null,
  toast: null,

  enterEditor: (file) =>
    set({ screen: 'editor', file, savedContent: file.content, dirty: false }),

  updateContent: (content) =>
    set((s) =>
      s.file
        ? { file: { ...s.file, content }, dirty: content !== s.savedContent }
        : {},
    ),

  markSaved: () =>
    set((s) => ({
      savedContent: s.file?.content ?? '',
      dirty: false,
    })),

  exitEditor: () => {
    // 离开编辑器时清除草稿（已保存或用户已确认丢弃）
    clearDraft()
    set({ screen: 'home', file: null, savedContent: '', dirty: false, unsavedDialog: false, pendingLeave: null })
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setTheme: (theme) => set({ theme }),
  cycleTheme: () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const cur = get().theme
    set({ theme: order[(order.indexOf(cur) + 1) % order.length] })
  },
  setAccent: (accent) => set({ accent }),
  setFontSize: (fontSize) => set({ fontSize }),
  setAutoSave: (autoSave) => set({ autoSave }),
  addRecent: (file) =>
    set((s) => {
      const entry: RecentFile = { id: file.id, name: file.name, openedAt: Date.now() }
      const rest = s.recentFiles.filter((r) => r.id !== file.id)
      return { recentFiles: [entry, ...rest].slice(0, MAX_RECENT) }
    }),
  removeRecent: (id) =>
    set((s) => ({ recentFiles: s.recentFiles.filter((r) => r.id !== id) })),
  toggleSettings: (settingsOpen) => set({ settingsOpen }),
  toggleTemplate: (templateOpen) => set({ templateOpen }),
  toggleExport: (exportOpen) => set({ exportOpen }),
  setUnsavedDialog: (unsavedDialog) => set({ unsavedDialog }),
  requestLeave: (kind) => {
    const s = get()
    if (s.settingsOpen) {
      s.toggleSettings(false)
      return
    }
    if (s.dirty) {
      set({ unsavedDialog: true, pendingLeave: kind })
      return
    }
    if (kind === 'home') s.exitEditor()
  },
  confirmLeave: () => {
    const s = get()
    set({ unsavedDialog: false })
    if (s.pendingLeave === 'home') {
      s.exitEditor()
    }
  },
  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: { msg, key: Date.now() } })
    toastTimer = setTimeout(() => set({ toast: null }), 2400)
  },
}))
