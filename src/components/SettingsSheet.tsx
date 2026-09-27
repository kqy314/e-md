import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { XIcon } from './icons'
import type { Accent } from '../types'

/** 主题配色选项（色板展示用基础色，取浅色模式下的柔和强调色） */
const accentOptions: { value: Accent; label: string; color: string }[] = [
  { value: 'indigo', label: '靛蓝', color: '#757bd3' },
  { value: 'emerald', label: '翠绿', color: '#5ea98c' },
  { value: 'sky', label: '天蓝', color: '#6fa3c4' },
  { value: 'violet', label: '星紫', color: '#9887c9' },
  { value: 'rose', label: '玫红', color: '#cc7e92' },
  { value: 'orange', label: '暖橙', color: '#d99b6c' },
  { value: 'gray', label: '石墨灰', color: '#86868f' },
  { value: 'teal', label: '青瓷', color: '#5ba395' },
  { value: 'amber', label: '琥珀', color: '#c29a55' },
  { value: 'olive', label: '橄榄', color: '#94a065' },
]

export function SettingsSheet() {
  const open = useStore((s) => s.settingsOpen)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const fontSize = useStore((s) => s.fontSize)
  const autoSave = useStore((s) => s.autoSave)
  const accent = useStore((s) => s.accent)
  const setAccent = useStore((s) => s.setAccent)
  const setFontSize = useStore((s) => s.setFontSize)
  const setAutoSave = useStore((s) => s.setAutoSave)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => toggleSettings(false)}
        >
          <motion.div
            className="w-full rounded-t-2xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">设置</h2>
              <button
                onClick={() => toggleSettings(false)}
                className="rounded-lg p-1.5 text-mute transition hover:bg-[var(--hover)] hover:text-ink"
                aria-label="关闭设置"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-2 text-sm font-medium">主题配色</div>
                <div className="grid grid-cols-5 gap-2.5">
                  {accentOptions.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setAccent(o.value)}
                      aria-label={o.label}
                      aria-pressed={accent === o.value}
                      className={`h-9 rounded-lg transition ${
                        accent === o.value
                          ? 'scale-105 ring-2 ring-accent ring-offset-2 ring-offset-surface'
                          : 'opacity-85 hover:scale-105 hover:opacity-100'
                      }`}
                      style={{
                        background: o.color,
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                      }}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-mute">
                  选择应用的主色调，明暗模式仍可通过顶部按钮切换
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">字号</span>
                  <span className="text-xs text-mute">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={22}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="mt-1 flex justify-between text-xs text-mute">
                  <span>小</span>
                  <span>大</span>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">自动保存草稿</div>
                    <p className="mt-0.5 text-xs text-mute">编辑时自动在本地保存未保存的内容</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={autoSave}
                    onClick={() => setAutoSave(!autoSave)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      autoSave ? 'bg-accent' : 'bg-[var(--active)]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${
                        autoSave ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="border-t border-edge pt-4 text-center text-xs tracking-wide text-mute">
                e-md — 为专注书写而生
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
