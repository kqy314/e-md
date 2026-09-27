export type ThemeMode = 'system' | 'light' | 'dark'
/** 主题配色（强调色） */
export type Accent =
  | 'indigo'
  | 'emerald'
  | 'orange'
  | 'rose'
  | 'violet'
  | 'sky'
  | 'gray'
  | 'teal'
  | 'amber'
  | 'olive'
export type ViewMode = 'edit' | 'preview' | 'split'
export type Screen = 'home' | 'editor'

/** 当前打开的文件 */
export interface FileInfo {
  /** 原生端为 content:// Uri，浏览器端为内部句柄标识 */
  id: string
  name: string
  content: string
}

/** 最近文件记录 */
export interface RecentFile {
  id: string
  name: string
  openedAt: number
}

export interface Settings {
  theme: ThemeMode
  viewMode: ViewMode
  fontSize: number
  /** 自动保存草稿到本地 */
  autoSave: boolean
  /** 主题配色（强调色） */
  accent: Accent
}
