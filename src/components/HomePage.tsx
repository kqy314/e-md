import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { openById, pickAndOpen, UserCanceledError } from '../services/fileService'
import { effectiveDark } from '../services/theme'
import { errMsg } from '../utils/error'
import { formatOpenedAt } from '../utils/format'
import type { RecentFile } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import {
  ClockIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderOpenIcon,
  PhoneIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  TrashIcon,
} from './icons'

/** 左滑露出的删除按钮宽度 */
const SWIPE_W = 74
/** 超过该位移后松手即保持展开 */
const SWIPE_THRESHOLD = 36

export function HomePage() {
  const enterEditor = useStore((s) => s.enterEditor)
  const recentFiles = useStore((s) => s.recentFiles)
  const removeRecent = useStore((s) => s.removeRecent)
  const addRecent = useStore((s) => s.addRecent)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const toggleTemplate = useStore((s) => s.toggleTemplate)
  const theme = useStore((s) => s.theme)
  const cycleTheme = useStore((s) => s.cycleTheme)
  const showToast = useStore((s) => s.showToast)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState<RecentFile | null>(null)

  // 左滑删除手势状态
  const [openId, setOpenId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null)
  const gesture = useRef<{ id: string; startX: number; startY: number; axis: '' | 'x' | 'y'; x: number } | null>(
    null,
  )

  const isDark = effectiveDark(theme)
  const ThemeIcon = theme === 'system' ? PhoneIcon : isDark ? MoonIcon : SunIcon

  async function handleOpen() {
    if (busy) return
    setBusy(true)
    try {
      const file = await pickAndOpen()
      addRecent(file)
      enterEditor(file)
    } catch (e) {
      if (!(e instanceof UserCanceledError)) showToast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  function handleNew() {
    toggleTemplate(true)
  }

  async function handleRecent(id: string) {
    if (busy) return
    setBusy(true)
    try {
      const file = await openById(id)
      if (!file) {
        removeRecent(id)
        showToast('文件不可用，已从列表移除')
        return
      }
      addRecent(file)
      enterEditor(file)
    } catch (e) {
      if (!(e instanceof UserCanceledError)) showToast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  function offsetX(id: string) {
    if (drag && drag.id === id) return drag.x
    return openId === id ? -SWIPE_W : 0
  }

  function onTouchStart(id: string, e: React.TouchEvent) {
    const t = e.touches[0]
    gesture.current = { id, startX: t.clientX, startY: t.clientY, axis: '', x: 0 }
    // 触摸其它行时收起已展开的行
    if (openId && openId !== id) setOpenId(null)
  }

  function onTouchMove(id: string, e: React.TouchEvent) {
    const g = gesture.current
    if (!g || g.id !== id) return
    const t = e.touches[0]
    const dx = t.clientX - g.startX
    const dy = t.clientY - g.startY
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      // 先判定手势方向，纵向则交给列表自然滚动
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (g.axis !== 'x') return
    const base = openId === id ? -SWIPE_W : 0
    g.x = Math.min(0, Math.max(-SWIPE_W, base + dx))
    setDrag({ id, x: g.x })
  }

  function onTouchEnd(id: string) {
    const g = gesture.current
    gesture.current = null
    if (!g || g.id !== id) return
    if (!g.axis) return // 视为点击，交给 onClick 打开
    setDrag(null)
    setOpenId(g.x < -SWIPE_THRESHOLD ? id : null)
  }

  function handleRowClick(id: string) {
    // 已展开的行：先收起而不是打开文件
    if (openId === id) {
      setOpenId(null)
      return
    }
    if (openId) {
      setOpenId(null)
      return
    }
    void handleRecent(id)
  }

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col px-5 pb-[max(env(safe-area-inset-bottom),20px)]">
      <header className="flex items-center justify-between py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">e-md</h1>
          <p className="mt-0.5 text-xs text-mute">极简 Markdown 阅读与编辑器</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={cycleTheme}
            className="rounded-xl p-2.5 text-mute transition hover:bg-[var(--hover)] hover:text-ink active:scale-95"
            aria-label="切换主题"
          >
            <ThemeIcon size={20} />
          </button>
          <button
            onClick={() => toggleSettings(true)}
            className="rounded-xl p-2.5 text-mute transition hover:bg-[var(--hover)] hover:text-ink active:scale-95"
            aria-label="设置"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleOpen}
          disabled={busy}
          className="flex flex-col items-start gap-3 rounded-2xl bg-accent p-4 text-left text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          <span className="rounded-lg bg-white/15 p-2">
            <FolderOpenIcon size={22} />
          </span>
          <span className="text-sm font-medium">打开文件</span>
          <span className="text-xs text-white/70">从手机中选择 .md 文件</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNew}
          disabled={busy}
          className="flex flex-col items-start gap-3 rounded-2xl border border-edge bg-surface p-4 text-left transition hover:bg-[var(--hover)] disabled:opacity-60"
        >
          <span className="rounded-lg bg-[var(--accent-soft)] p-2 text-accent">
            <FilePlusIcon size={22} />
          </span>
          <span className="text-sm font-medium">新建文档</span>
          <span className="text-xs text-mute">从模板或空白开始</span>
        </motion.button>
      </div>

      <section className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-mute">
          <ClockIcon size={15} />
          最近打开
        </div>
        {recentFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge px-4 py-8 text-center text-sm text-mute">
            打开一个 .md 文件后，会出现在这里
          </div>
        ) : (
          <ul className="space-y-1">
            {recentFiles.map((r) => (
              <li key={r.id} className="group/row relative overflow-hidden rounded-xl">
                {/* 左滑露出的删除按钮 */}
                <button
                  onClick={() => setConfirmDel(r)}
                  className="absolute inset-y-0 right-0 flex w-[74px] flex-col items-center justify-center gap-1 rounded-xl bg-danger text-white transition active:bg-danger/85"
                  aria-label="删除记录"
                >
                  <TrashIcon size={17} />
                  <span className="text-[11px]">删除</span>
                </button>
                <div
                  className="relative touch-pan-y rounded-xl bg-surface"
                  style={{
                    transform: `translateX(${offsetX(r.id)}px)`,
                    transition: drag && drag.id === r.id ? 'none' : 'transform 0.22s ease',
                  }}
                  onTouchStart={(e) => onTouchStart(r.id, e)}
                  onTouchMove={(e) => onTouchMove(r.id, e)}
                  onTouchEnd={() => onTouchEnd(r.id)}
                  onTouchCancel={() => onTouchEnd(r.id)}
                >
                  <button
                    onClick={() => handleRowClick(r.id)}
                    disabled={busy}
                    className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-edge px-3 py-2.5 text-left transition hover:bg-[var(--hover)]"
                  >
                    <span className="shrink-0 rounded-lg bg-[var(--accent-soft)] p-2 text-accent">
                      <FileTextIcon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{r.name}</span>
                      <span className="block text-xs text-mute">{formatOpenedAt(r.openedAt)}</span>
                    </span>
                  </button>
                  {/* 桌面端悬停显示删除按钮（触屏设备隐藏，使用左滑） */}
                  <button
                    onClick={() => setConfirmDel(r)}
                    className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-lg p-2 text-mute opacity-0 transition hover:bg-[var(--active)] hover:text-danger group-hover/row:opacity-100 [@media(pointer:fine)]:block"
                    aria-label="删除记录"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDel !== null}
        title="删除这条记录？"
        message={`将从「最近打开」中移除「${confirmDel?.name ?? ''}」，不会删除文件本身。`}
        confirmText="删除"
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) {
            removeRecent(confirmDel.id)
            if (openId === confirmDel.id) setOpenId(null)
          }
          setConfirmDel(null)
          showToast('已删除记录')
        }}
      />
    </div>
  )
}
