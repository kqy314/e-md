import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { useStore } from '../store'
import { clearDraft, loadDraft, saveDraft } from '../services/storage'
import { saveAs, saveFile } from '../services/fileService'
import { effectiveDark } from '../services/theme'
import { errMsg } from '../utils/error'
import { countStats } from '../utils/format'
import { toggleTaskInSource } from '../utils/markdown'
import { InsertToolbar } from './InsertToolbar'
import { PreviewPane } from './PreviewPane'
import {
  ArrowLeftIcon,
  CheckIcon,
  ColumnsIcon,
  DownloadIcon,
  EyeIcon,
  PhoneIcon,
  MoonIcon,
  PenIcon,
  SunIcon,
} from './icons'
import type { ViewMode } from '../types'

const WIDE_BREAKPOINT = 900

export function EditorPage() {
  const file = useStore((s) => s.file)
  const viewMode = useStore((s) => s.viewMode)
  const theme = useStore((s) => s.theme)
  const fontSize = useStore((s) => s.fontSize)
  const dirty = useStore((s) => s.dirty)
  const savedContent = useStore((s) => s.savedContent)
  const autoSave = useStore((s) => s.autoSave)
  const setViewMode = useStore((s) => s.setViewMode)
  const cycleTheme = useStore((s) => s.cycleTheme)
  const updateContent = useStore((s) => s.updateContent)
  const markSaved = useStore((s) => s.markSaved)
  const enterEditor = useStore((s) => s.enterEditor)
  const addRecent = useStore((s) => s.addRecent)
  const requestLeave = useStore((s) => s.requestLeave)
  const toggleExport = useStore((s) => s.toggleExport)
  const showToast = useStore((s) => s.showToast)

  const [isWide, setIsWide] = useState(() => window.innerWidth >= WIDE_BREAKPOINT)
  const [saving, setSaving] = useState(false)
  const editorHostRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const docRef = useRef('')
  // 滚动同步回环锁：程序滚动对侧后短时间内忽略其对向事件
  const syncLock = useRef(0)

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= WIDE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 创建编辑器实例（仅文件切换时重建）
  useEffect(() => {
    if (!file) return
    const host = editorHostRef.current
    if (!host) return
    docRef.current = file.content

    const view = new EditorView({
      state: EditorState.create({
        doc: file.content,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              docRef.current = u.state.doc.toString()
              updateContent(docRef.current)
            }
          }),
        ],
      }),
      parent: host,
    })
    viewRef.current = view
    const t = setTimeout(() => view.focus(), 60)
    return () => {
      clearTimeout(t)
      view.destroy()
      viewRef.current = null
    }
    // 仅在文件 id 变化时重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id])

  // 分屏滚动同步：任意一侧滚动，另一侧按比例跟随
  useEffect(() => {
    if (viewMode !== 'split') return
    const main = mainRef.current
    if (!main) return
    const editorScroll = main.querySelector('.cm-scroller')
    const previewScroll = main.querySelector('.md-scroll')
    if (!editorScroll || !previewScroll) return

    const ratio = (el: Element) => {
      const max = el.scrollHeight - el.clientHeight
      return max > 0 ? el.scrollTop / max : 0
    }
    const follow = (src: Element, dst: HTMLElement) => {
      if (Date.now() < syncLock.current) return
      const max = dst.scrollHeight - dst.clientHeight
      if (max <= 0) return
      syncLock.current = Date.now() + 80
      dst.scrollTop = ratio(src) * max
    }
    const onEditorScroll = () => follow(editorScroll, previewScroll as HTMLElement)
    const onPreviewScroll = () => follow(previewScroll, editorScroll as HTMLElement)
    editorScroll.addEventListener('scroll', onEditorScroll, { passive: true })
    previewScroll.addEventListener('scroll', onPreviewScroll, { passive: true })
    return () => {
      editorScroll.removeEventListener('scroll', onEditorScroll)
      previewScroll.removeEventListener('scroll', onPreviewScroll)
    }
  }, [viewMode, isWide, file?.id])

  // 自动保存草稿：有未保存修改时防抖写入本地
  useEffect(() => {
    if (!file || !autoSave) return
    if (file.content === savedContent) return
    if (!file.content.trim()) return
    const t = setTimeout(() => saveDraft(file.content), 1200)
    return () => clearTimeout(t)
  }, [file?.content, autoSave])

  // 新文档首次进入时，恢复上次留下的草稿
  useEffect(() => {
    if (!file || file.id !== '' || file.content !== '' || !autoSave) return
    const draft = loadDraft()
    if (draft === null || !draft.trim()) return
    const view = viewRef.current
    if (view) {
      view.dispatch({ changes: { from: 0, to: 0, insert: draft } })
      docRef.current = draft
      updateContent(draft)
      showToast('已恢复上次草稿')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 退出动画期间 file 已置空，安全退出不渲染
  if (!file) return null

  async function handleSave() {
    if (saving || !file) return
    const f = file
    const content = docRef.current
    setSaving(true)
    try {
      if (f.id === '') {
        // 新文档 → 另存为
        const res = await saveAs(content, f.name)
        if (res) {
          enterEditor(res)
          addRecent(res)
          clearDraft()
          showToast('已保存')
        } else {
          clearDraft()
          showToast('已下载到本地')
        }
      } else {
        await saveFile(f, content)
        markSaved()
        addRecent(f)
        clearDraft()
        showToast('已保存')
      }
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  // 预览区勾选任务项 → 同步回编辑器源文本
  function handleToggleTask(index: number) {
    const next = toggleTaskInSource(docRef.current, index)
    const view = viewRef.current
    if (view) {
      const sel = view.state.selection.main
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
        selection: {
          anchor: Math.min(sel.anchor, next.length),
          head: Math.min(sel.head, next.length),
        },
      })
    } else {
      updateContent(next)
    }
  }

  const showEdit = viewMode !== 'preview'
  const showPreview = viewMode !== 'edit'
  const split = showEdit && showPreview
  const isDark = effectiveDark(theme)
  const ThemeIcon = theme === 'system' ? PhoneIcon : isDark ? MoonIcon : SunIcon
  const stats = countStats(file.content)

  return (
    <div className="flex h-full flex-col">
      {/* 顶部栏 */}
      <header className="flex items-center gap-1 border-b border-edge bg-surface/85 px-2 py-1.5 backdrop-blur">
        <button
          onClick={() => requestLeave('home')}
          className="rounded-xl p-2 text-mute transition hover:bg-[var(--hover)] hover:text-ink active:scale-95"
          aria-label="返回"
        >
          <ArrowLeftIcon size={20} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1">
          <span className="truncate text-sm font-medium">{file.name}</span>
          {dirty && <span className="size-1.5 shrink-0 rounded-full bg-accent" title="有未保存的修改" />}
        </div>
        <button
          onClick={cycleTheme}
          className="rounded-xl p-2 text-mute transition hover:bg-[var(--hover)] hover:text-ink active:scale-95"
          aria-label="切换主题"
        >
          <ThemeIcon size={19} />
        </button>
        <button
          onClick={() => toggleExport(true)}
          className="rounded-xl p-2 text-mute transition hover:bg-[var(--hover)] hover:text-ink active:scale-95"
          aria-label="导出文档"
        >
          <DownloadIcon size={19} />
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`ml-0.5 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-60 ${
            dirty ? 'bg-accent text-white' : 'bg-[var(--hover)] text-mute'
          }`}
        >
          <CheckIcon size={16} />
          保存
        </button>
      </header>

      {/* 快捷插入工具条 */}
      {showEdit && <InsertToolbar getView={() => viewRef.current} />}

      {/* 主区域 */}
      <main ref={mainRef} className="min-h-0 flex-1 overflow-hidden">
        <div
          className={
            split
              ? isWide
                ? 'grid h-full grid-cols-2'
                : 'grid h-full grid-rows-2'
              : 'h-full overflow-hidden'
          }
        >
          <section
            className={`min-h-0 overflow-hidden ${!split ? 'h-full' : ''} ${
              !showEdit ? 'hidden' : ''
            } ${split && isWide ? 'border-r border-edge' : ''} ${
              split && !isWide ? 'border-b border-edge' : ''
            }`}
          >
            <div className="h-full" ref={editorHostRef} style={{ fontSize }} />
          </section>
          <section
            className={`min-h-0 overflow-hidden ${!split ? 'h-full' : ''} ${!showPreview ? 'hidden' : ''}`}
          >
            <PreviewPane content={file.content} fontSize={fontSize} onToggleTask={handleToggleTask} />
          </section>
        </div>
      </main>

      {/* 底部状态栏 + 视图切换（窄屏） */}
      <footer className="border-t border-edge bg-surface/90 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-4 py-1 text-[11px] text-mute">
          <span className="shrink-0">
            {stats.words} 字 · {stats.chars} 字符 · {stats.lines} 行
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {dirty ? (
              <>
                <span className="size-1.5 rounded-full bg-accent" />
                未保存
              </>
            ) : (
              '已保存'
            )}
          </span>
        </div>
        <div className="px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-1">
          <div className="mx-auto flex max-w-sm rounded-xl bg-bg p-1">
            {(
              [
                { v: 'edit' as ViewMode, label: '编辑', icon: <PenIcon size={15} /> },
                { v: 'split' as ViewMode, label: '分屏', icon: <ColumnsIcon size={15} /> },
                { v: 'preview' as ViewMode, label: '预览', icon: <EyeIcon size={15} /> },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => setViewMode(o.v)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                  viewMode === o.v
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-mute hover:text-ink'
                }`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
