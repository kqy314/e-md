import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useStore } from './store'
import { isNative } from './services/platform'
import { applyAccent, applyTheme, watchSystemTheme } from './services/theme'
import { saveRecentFiles, saveSettings } from './services/storage'
import { HomePage } from './components/HomePage'
import { EditorPage } from './components/EditorPage'
import { SettingsSheet } from './components/SettingsSheet'
import { TemplateSheet } from './components/TemplateSheet'
import { ExportSheet } from './components/ExportSheet'
import { UnsavedDialog } from './components/UnsavedDialog'
import { Toast } from './components/Toast'

export default function App() {
  const screen = useStore((s) => s.screen)
  const theme = useStore((s) => s.theme)
  const accent = useStore((s) => s.accent)
  const viewMode = useStore((s) => s.viewMode)
  const fontSize = useStore((s) => s.fontSize)
  const autoSave = useStore((s) => s.autoSave)
  const recentFiles = useStore((s) => s.recentFiles)

  // 主题应用与系统主题跟随
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  useEffect(() => {
    return watchSystemTheme(() => applyTheme(useStore.getState().theme))
  }, [])

  // 偏好与最近文件持久化
  useEffect(() => {
    saveSettings({ theme, viewMode, fontSize, autoSave, accent })
  }, [theme, viewMode, fontSize, autoSave, accent])

  useEffect(() => {
    saveRecentFiles(recentFiles)
  }, [recentFiles])

  // 浏览器端离开页面时的未保存提示
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useStore.getState().dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // Android 硬件返回键
  useEffect(() => {
    if (!isNative) return
    const sub = CapApp.addListener('backButton', () => {
      const s = useStore.getState()
      if (s.settingsOpen) {
        s.toggleSettings(false)
        return
      }
      if (s.templateOpen) {
        s.toggleTemplate(false)
        return
      }
      if (s.unsavedDialog) {
        s.setUnsavedDialog(false)
        return
      }
      if (s.screen === 'editor') {
        s.requestLeave('home')
        return
      }
      void CapApp.exitApp()
    })
    return () => {
      void sub.then((l) => l.remove())
    }
  }, [])

  return (
    <div className="h-full">
      {screen === 'home' ? (
        <div key="home" className="h-full animate-fade-in">
          <HomePage />
        </div>
      ) : (
        <div key="editor" className="h-full animate-fade-in">
          <EditorPage />
        </div>
      )}

      <SettingsSheet />
      <TemplateSheet />
      <ExportSheet />
      <UnsavedDialog />
      <Toast />
    </div>
  )
}
