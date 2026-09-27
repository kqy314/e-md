import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useStore } from '../store'
import { exportHtml, exportMarkdown, exportPdf, exportWord } from '../services/export'
import { isNative } from '../services/platform'
import { XIcon } from './icons'

const options: {
  key: string
  title: string
  desc: string
  hint?: string
  run: (content: string, name: string) => boolean | void
}[] = [
  {
    key: 'pdf',
    title: '导出为 PDF',
    desc: '通过系统打印对话框生成 PDF，可选择保存或分享',
    run: (c, n) => exportPdf(c, n),
  },
  {
    key: 'word',
    title: '导出为 Word',
    desc: '生成 .doc 文档，兼容 Word / WPS 打开编辑',
    run: (c, n) => exportWord(c, n),
  },
  {
    key: 'html',
    title: '导出为 HTML',
    desc: '生成带样式的 .html 网页，方便在浏览器查看',
    run: (c, n) => exportHtml(c, n),
  },
  {
    key: 'md',
    title: '导出为 Markdown',
    desc: '导出 .md 源文件，保留原始排版',
    run: (c, n) => exportMarkdown(c, n),
  },
]

export function ExportSheet() {
  const open = useStore((s) => s.exportOpen)
  const toggleExport = useStore((s) => s.toggleExport)
  const file = useStore((s) => s.file)
  const showToast = useStore((s) => s.showToast)
  const [busy, setBusy] = useState<string | null>(null)

  async function handleRun(key: string, run: (c: string, n: string) => boolean | void) {
    if (!file || busy) return
    setBusy(key)
    try {
      const ok = run(file.content, file.name)
      // PDF 弹窗打开视为成功；下载型返回 undefined
      if (ok === false) showToast('已改为下载 HTML 文件')
      else if (ok === undefined) showToast('导出完成')
    } catch {
      showToast('导出失败')
    } finally {
      setBusy(key)
      setTimeout(() => setBusy(null), 0)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => toggleExport(false)}
        >
          <motion.div
            className="w-full rounded-t-2xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">导出文档</h2>
              <button
                onClick={() => toggleExport(false)}
                className="rounded-lg p-1.5 text-mute transition hover:bg-[var(--hover)] hover:text-ink"
                aria-label="关闭导出"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {options.map((o) => (
                <button
                  key={o.key}
                  onClick={() => handleRun(o.key, o.run)}
                  disabled={busy !== null}
                  className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-edge bg-bg px-4 py-3 text-left transition hover:bg-[var(--hover)] active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="text-sm font-medium text-ink">{o.title}</span>
                  <span className="text-xs text-mute">{o.desc}</span>
                </button>
              ))}
            </div>

            {isNative && (
              <p className="mt-4 text-xs text-mute">
                提示：PDF 导出依赖系统的打印/分享能力，具体以手机为准。
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
